
'use strict'



############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'ICQL-DBA/SQL'
debug                     = CND.get_logger 'debug',     badge
warn                      = CND.get_logger 'warn',      badge
info                      = CND.get_logger 'info',      badge
urge                      = CND.get_logger 'urge',      badge
help                      = CND.get_logger 'help',      badge
whisper                   = CND.get_logger 'whisper',   badge
echo                      = CND.echo.bind CND
types                     = require './types'
{ isa
  validate
  validate_optional
  declare
  size_of
  type_of }               = types
E                         = require './errors'


#===========================================================================================================
class @Sql

  # #---------------------------------------------------------------------------------------------------------
  # constructor: ( dba ) ->
  #   # super()
  #   @cfg    = cfg ### TAINT freeze ###
  #   return undefined

  #---------------------------------------------------------------------------------------------------------
  SQL: String.raw

  #---------------------------------------------------------------------------------------------------------
  I: ( name ) => '"' + ( name.replace /"/g, '""' ) + '"'

  #---------------------------------------------------------------------------------------------------------
  L: ( x ) =>
    return 'null' unless x?
    switch type = type_of x
      when 'text'       then return  "'" + ( x.replace /'/g, "''" ) + "'"
      # when 'list'       then return "'#{@list_as_json x}'"
      when 'float'      then return x.toString()
      when 'boolean'    then return ( if x then '1' else '0' )
      # when 'list'       then throw new Error "^dba@23^ use `X()` for lists"
    throw new E.Dba_sql_value_error '^dba@404^', type, x

  #---------------------------------------------------------------------------------------------------------
  V: ( x ) =>
    throw new E.Dba_sql_not_a_list_error '^dba@405^', type, x unless ( type = type_of x ) is 'list'
    return '( ' + ( ( @L e for e in x ).join ', ' ) + ' )'

  #---------------------------------------------------------------------------------------------------------
  interpolate: ( sql, values ) ->
    idx = -1
    return sql.replace @_interpolation_pattern, ( $0, opener, format, name ) =>
      idx++
      switch opener
        when '$'
          validate.nonempty_text name
          key = name
        when '?'
          key = idx
      value = values[ key ]
      switch format
        when '', 'I'  then return @I value
        when 'L'      then return @L value
        when 'V'      then return @V value
      throw new E.Dba_interpolation_format_unknown '^dba@320^', format
  _interpolation_pattern: /(?<opener>[$?])(?<format>.?):(?<name>\w*)/g
