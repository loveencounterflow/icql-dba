

'use strict'

############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'ICQL-DBA/IMPORT-EXPORT-MIXIN'
debug                     = CND.get_logger 'debug',     badge
warn                      = CND.get_logger 'warn',      badge
info                      = CND.get_logger 'info',      badge
urge                      = CND.get_logger 'urge',      badge
help                      = CND.get_logger 'help',      badge
whisper                   = CND.get_logger 'whisper',   badge
echo                      = CND.echo.bind CND
#...........................................................................................................
PATH                      = require 'path'
E                         = require './errors'
{ misfit }                = require './common'

#-----------------------------------------------------------------------------------------------------------
@Import_export_mixin = ( clasz = Object ) => class extends clasz

  #---------------------------------------------------------------------------------------------------------
  import: ( cfg ) ->
    cfg         = { @types.defaults.dba_import_cfg..., cfg..., }
    cfg.format ?= @_format_from_path cfg.path
    @types.validate.dba_import_cfg cfg
    switch cfg.format
      when 'db'   then @_import_db  cfg
      when 'sql'  then @_import_sql cfg
      when 'csv'  then @_import_csv cfg
      else
        throw new E.Dba_format_unknown '^dba@309^', format
    return null


  #=========================================================================================================
  # FORMAT GUESSING
  #---------------------------------------------------------------------------------------------------------
  _extension_from_path: ( path ) -> if ( R = PATH.extname path ) is '' then null else R[ 1 .. ]
  _format_from_path:    ( path ) -> @_formats[ @._extension_from_path path ] ? null

