

'use strict'

############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'ICQL-DBA/FUNCTIONS-MIXIN'
debug                     = CND.get_logger 'debug',     badge
warn                      = CND.get_logger 'warn',      badge
info                      = CND.get_logger 'info',      badge
urge                      = CND.get_logger 'urge',      badge
help                      = CND.get_logger 'help',      badge
whisper                   = CND.get_logger 'whisper',   badge
echo                      = CND.echo.bind CND
#...........................................................................................................
PATH                      = require 'path'
FS                        = require 'fs'
E                         = require './errors'
{ misfit }                = require './common'
SQL                       = String.raw


#-----------------------------------------------------------------------------------------------------------
@Functions_mixin = ( clasz = Object ) => class extends clasz


  #=========================================================================================================
  # USER-DEFINED FUNCTIONS
  #---------------------------------------------------------------------------------------------------------
  create_function: ( cfg ) ->
    @types.validate.dba_create_function_cfg ( cfg = { @types.defaults.dba_create_function_cfg..., cfg..., } )
    { name
      call
      directOnly
      deterministic
      varargs }     = cfg
    return @sqlt.function name, { deterministic, varargs, directOnly, }, call

  #---------------------------------------------------------------------------------------------------------
  create_aggregate_function: ( cfg ) ->
    @types.validate.dba_create_aggregate_function_cfg ( cfg = { @types.defaults.dba_create_aggregate_function_cfg..., cfg..., } )
    { name
      start
      step
      directOnly
      deterministic
      varargs }     = cfg
    return @sqlt.aggregate name, { start, step, deterministic, varargs, directOnly, }

  #---------------------------------------------------------------------------------------------------------
  create_window_function: ( cfg ) ->
    @types.validate.dba_create_window_function_cfg ( cfg = { @types.defaults.dba_create_window_function_cfg..., cfg..., } )
    { name
      start
      step
      inverse
      result
      directOnly
      deterministic
      varargs }     = cfg
    return @sqlt.aggregate name, { start, step, inverse, result, deterministic, varargs, directOnly, }

  #---------------------------------------------------------------------------------------------------------
  create_table_function: ( cfg ) ->
    @types.validate.dba_create_table_function_cfg ( cfg = { @types.defaults.dba_create_table_function_cfg..., cfg..., } )
    { name
      parameters
      columns
      rows
      directOnly
      deterministic
      varargs }     = cfg
    return @sqlt.table name, { parameters, columns, rows, deterministic, varargs, directOnly, }

  #---------------------------------------------------------------------------------------------------------
  create_virtual_table: ( cfg ) ->
    @types.validate.dba_create_virtual_table_cfg ( cfg = { @types.defaults.dba_create_virtual_table_cfg..., cfg..., } )
    { name, create, } = cfg
    return @sqlt.table name, create


  #=========================================================================================================
  # CONTEXT HANDLERS
  #---------------------------------------------------------------------------------------------------------
  with_transaction: ( P..., f ) ->
    @types.validate.function f
    # return ( @sqlt.transaction f ) P...
    throw new E.Dba_no_nested_transactions '^dba-functions@901^' if @sqlt.inTransaction
    @execute SQL"begin transaction;"
    error = null
    try
      R = f P...
    catch error
      # debug '^35458-catch^', CND.reverse 'rollback'
      @execute SQL"rollback;"
      throw error
    # finally
    #   debug '^35458-finally^', CND.reverse 'rollback', error
    try
      @execute SQL"commit;"
    catch error
      @execute SQL"rollback;"
    return null

  #---------------------------------------------------------------------------------------------------------
  with_unsafe_mode: ( P..., f ) ->
    @types.validate.function f
    prv_in_unsafe_mode = @get_unsafe_mode()
    @set_unsafe_mode true
    try R = f P... finally @set_unsafe_mode prv_in_unsafe_mode
    return R

  # #---------------------------------------------------------------------------------------------------------
  # with_foreign_keys_off: ( P..., f ) ->
  #   @types.validate.function f
  #   prv_in_foreign_keys_state = @get_foreign_keys_state()
  #   @set_foreign_keys_state false
  #   try R = f P... finally @set_foreign_keys_state prv_in_foreign_keys_state
  #   return R

  #---------------------------------------------------------------------------------------------------------
  with_foreign_keys_deferred: ( P..., f ) ->
    @types.validate.function f
    R             = null
    throw new E.Dba_no_deferred_fks_in_tx '^dba-functions@901^' if @sqlt.inTransaction
    @with_transaction =>
      @sqlt.pragma SQL"defer_foreign_keys=true"
      R = f P...
    return R


