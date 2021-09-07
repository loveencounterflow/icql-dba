

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
{ lets
  freeze }                = require 'letsfreezethat'


#-----------------------------------------------------------------------------------------------------------
@Functions_mixin = ( clasz = Object ) => class extends clasz

  #---------------------------------------------------------------------------------------------------------
  _register_udf: ( udf_type, cfg ) ->
    ### TAINT validate more thoroughly, especially cfg._dba_udf_type ###
    ### TAINT consider to use (virtual?) table for this ###
    @types.validate.nonempty_text udf_type
    @types.validate.object cfg
    @types.validate.nonempty_text cfg.name
    { name, } = cfg
    switch udf_type
      when 'single_valued'
        entry =
          name:   name
          arity:  cfg.call.length ### TAINT respect varargs ###
      else
        entry =
          name:   name
          cfg:    cfg
    @_catalog = lets @_catalog, ( d ) -> d[ cfg.name ] = entry
    return null

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
    @sqlt.function name, { deterministic, varargs, directOnly, }, call
    @_register_udf 'single_valued', cfg
    return null

  #---------------------------------------------------------------------------------------------------------
  create_aggregate_function: ( cfg ) ->
    @types.validate.dba_create_aggregate_function_cfg ( cfg = { @types.defaults.dba_create_aggregate_function_cfg..., cfg..., } )
    { name
      start
      step
      directOnly
      deterministic
      varargs }     = cfg
    @sqlt.aggregate name, { start, step, deterministic, varargs, directOnly, }
    @_register_udf 'aggregate', cfg
    return null

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
    @sqlt.aggregate name, { start, step, inverse, result, deterministic, varargs, directOnly, }
    @_register_udf 'window', cfg
    return null

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
    @sqlt.table name, { parameters, columns, rows, deterministic, varargs, directOnly, }
    @_register_udf 'table_function', cfg
    return null

  #---------------------------------------------------------------------------------------------------------
  create_virtual_table: ( cfg ) ->
    @types.validate.dba_create_virtual_table_cfg ( cfg = { @types.defaults.dba_create_virtual_table_cfg..., cfg..., } )
    { name, create, } = cfg
    @sqlt.table name, create
    @_register_udf 'virtual_table', cfg
    return null


  #=========================================================================================================
  # CONTEXT HANDLERS
  #---------------------------------------------------------------------------------------------------------
  with_transaction: ( cfg, f ) ->
    switch arity = arguments.length
      when 1 then [ cfg, f, ] = [ null, cfg, ]
      when 2 then null
      else throw new E.Dba_wrong_arity '^dba-functions@901^', 'with_transaction()', 1, 2, arity
    @types.validate.dba_with_transaction_cfg ( cfg = { @types.defaults.dba_with_transaction_cfg..., cfg..., } )
    @types.validate.function f
    throw new E.Dba_no_nested_transactions '^dba-functions@901^' if @sqlt.inTransaction
    @execute SQL"begin #{cfg.mode} transaction;"
    error = null
    try
      R = f()
    catch error
      @execute SQL"rollback;"
      throw error
    try
      @execute SQL"commit;"
    catch error
      @execute SQL"rollback;"
    return null

  #---------------------------------------------------------------------------------------------------------
  with_unsafe_mode: ( f ) ->
    @types.validate.function f
    unsafe_mode_state = @get_unsafe_mode()
    @set_unsafe_mode true
    try
      R = f()
    finally
      @set_unsafe_mode unsafe_mode_state
    return R

  #---------------------------------------------------------------------------------------------------------
  with_foreign_keys_deferred: ( f ) ->
    @types.validate.function f
    R = null
    throw new E.Dba_no_deferred_fks_in_tx '^dba-functions@901^' if @sqlt.inTransaction
    @with_transaction =>
      @sqlt.pragma SQL"defer_foreign_keys=true"
      R = f()
    return R


