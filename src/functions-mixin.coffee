

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
  with_transaction: ( cfg ) ->
    @types.validate.dba_with_transaction_cfg ( cfg = { @types.defaults.dba_with_transaction_cfg..., cfg..., } )
    { call, async, } = cfg
    if async
      throw new E.Dba_not_implemented '^dbaf@314^', "calling `with_transaction { async: true, }`"
    return ( @sqlt.transaction call )()

  #---------------------------------------------------------------------------------------------------------
  with_unsafe_mode: ( f ) ->
    @types.validate.function f
    prv_in_unsafe_mode = @_get_unsafe_mode()
    @_set_unsafe_mode true
    try R = f P... finally @_set_unsafe_mode prv_in_unsafe_mode
    return R

  #---------------------------------------------------------------------------------------------------------
  with_foreign_keys_off: ( f ) ->
    @types.validate.function f
    prv_in_foreign_keys_state = @_get_foreign_keys_state()
    @_set_foreign_keys_state false
    try R = call P... finally @_set_foreign_keys_state prv_in_foreign_keys_state
    return R


