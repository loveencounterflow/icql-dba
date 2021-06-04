

'use strict'

############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'ICQL-DBA/SQL-MIXIN'
debug                     = CND.get_logger 'debug',     badge
warn                      = CND.get_logger 'warn',      badge
info                      = CND.get_logger 'info',      badge
urge                      = CND.get_logger 'urge',      badge
help                      = CND.get_logger 'help',      badge
whisper                   = CND.get_logger 'whisper',   badge
echo                      = CND.echo.bind CND
#...........................................................................................................
E                         = require './errors'

#-----------------------------------------------------------------------------------------------------------
@Sql_mixin = ( clasz = Object ) => class extends clasz

  #=========================================================================================================
  # SQL CONSTRUCTION
  #---------------------------------------------------------------------------------------------------------
  as_identifier:  ( x  ) ->
    @types.validate.text x
    return '"' + ( x.replace /"/g, '""' ) + '"'

  #---------------------------------------------------------------------------------------------------------
  escape_text: ( x ) ->
    @types.validate.text x
    return x.replace /'/g, "''"

  #---------------------------------------------------------------------------------------------------------
  list_as_json: ( x ) ->
    @types.validate.list x
    return JSON.stringify x

  #---------------------------------------------------------------------------------------------------------
  as_sql: ( x ) ->
    switch type = @types.type_of x
      when 'text'       then return "'#{@escape_text x}'"
      when 'list'       then return "'#{@list_as_json x}'"
      when 'float'      then return x.toString()
      when 'boolean'    then return ( if x then '1' else '0' )
      when 'null'       then return 'null'
    throw new E.Dba_sql_value_error '^dba@323^', type, x

  #---------------------------------------------------------------------------------------------------------
  interpolate: ( sql, Q ) -> sql.replace @_interpolation_pattern, ( $0, $1 ) => @as_sql Q[ $1 ]
      # try
      #   return @as_sql Q[ $1 ]
      # catch error
      #   throw new E.Dba_error \
      #     "µ773 when trying to express placeholder #{rpr $1} as SQL literal, an error occurred: #{rpr error.message}"
  _interpolation_pattern: /// \$ (?: ( .+? ) \b | \{ ( [^}]+ ) \} ) ///g

