

'use strict'

############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'ICQL-DBA/CHECKS-MIXIN'
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


#===========================================================================================================
# CHECK, GETS, SETS
#-----------------------------------------------------------------------------------------------------------
@Checks_mixin = ( clasz = Object ) => class extends clasz


  #=========================================================================================================
  # FOREIGN KEYS MODE, DEFERRED
  #---------------------------------------------------------------------------------------------------------
  get_foreign_keys_state: -> not not ( @pragma "foreign_keys;" )[ 0 ].foreign_keys

  #---------------------------------------------------------------------------------------------------------
  set_foreign_keys_state: ( onoff ) ->
    @types.validate.boolean onoff
    @pragma "foreign_keys = #{onoff};"
    return null

  #---------------------------------------------------------------------------------------------------------
  ### TAINT add schema, table_name; currently only works for main(?) ###
  check_foreign_keys: -> @pragma SQL"foreign_key_check;"

  #---------------------------------------------------------------------------------------------------------
  set_foreign_keys_deferred: ( onoff ) -> @types.validate.boolean onoff; @pragma SQL"defer_foreign_keys=#{onoff};"
  get_foreign_keys_deferred: -> not not ( @pragma SQL"defer_foreign_keys;" )?[ 0 ]?.defer_foreign_keys

  #=========================================================================================================
  # UNSAFE MODE
  #---------------------------------------------------------------------------------------------------------
  get_unsafe_mode: -> @_state.in_unsafe_mode

  #---------------------------------------------------------------------------------------------------------
  set_unsafe_mode: ( onoff ) ->
    @types.validate.boolean onoff
    @sqlt.unsafeMode onoff
    @_state = lets @_state, ( d ) -> d.in_unsafe_mode = onoff
    return null


  #=========================================================================================================
  # TRANSACTIONS
  #---------------------------------------------------------------------------------------------------------
  within_transaction:   -> @sqlt.inTransaction
  begin_transaction:    -> throw new @Dba_not_implemented '^dba/checks@1^', "tx_begin"
  commit_transaction:   -> throw new @Dba_not_implemented '^dba/checks@1^', "tx_commit"
  rollback_transaction: -> throw new @Dba_not_implemented '^dba/checks@1^', "tx_rollback"


  #=========================================================================================================
  # INTEGRITY
  #---------------------------------------------------------------------------------------------------------
  check_integrity:    -> @pragma SQL"integrity_check;"
  check_quick:        -> @pragma SQL"quick_check;"



