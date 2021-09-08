
'use strict'


############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'ICQL-DBA/STDLIB'
debug                     = CND.get_logger 'debug',     badge
warn                      = CND.get_logger 'warn',      badge
info                      = CND.get_logger 'info',      badge
urge                      = CND.get_logger 'urge',      badge
help                      = CND.get_logger 'help',      badge
whisper                   = CND.get_logger 'whisper',   badge
echo                      = CND.echo.bind CND
{ freeze
  lets }                  = require 'letsfreezethat'

#-----------------------------------------------------------------------------------------------------------
@Stdlib_mixin = ( clasz = Object ) => class extends clasz
  ### TAINT use `cfg` ###
  create_stdlib: ->
    return null if @_state.stdlib_created
    @_state.stdlib_created = true
    prefix = 'std_'

    #-------------------------------------------------------------------------------------------------------
    @create_function
      name:           prefix + 'str_reverse'
      deterministic:  true
      varargs:        false
      call:           ( s ) -> ( Array.from s ).reverse().join ''

    #-------------------------------------------------------------------------------------------------------
    @create_function
      name:           prefix + 'str_join'
      deterministic:  true
      varargs:        true
      call:           ( joiner, P... ) -> P.join joiner

    #-------------------------------------------------------------------------------------------------------
    @create_table_function
      name:           prefix + 'str_split_first'
      columns:        [ 'prefix', 'suffix', ]
      parameters:     [ 'text', 'splitter', ]
      deterministic:  true
      varargs:        false
      rows:           ( text, splitter ) ->
        return null if ( text is null ) or ( splitter is null )
        if ( idx = text.indexOf splitter ) < 0 then yield [ text, null, ]
        else                                        yield [ text[ ... idx ], text[ idx + 1 .. ], ]
        return null

    #-------------------------------------------------------------------------------------------------------
    @create_table_function
      name:           prefix + 'generate_series'
      columns:        [ 'value', ]
      parameters:     [ 'start', 'stop', 'step', ]
      varargs:        true
      deterministic:  true
      rows: ( start, stop = Infinity, step = 1 ) ->
        ### NOTE: `stop` differs from SQLite3, which has 9223372036854775807 ###
        value = start
        loop
          break if value > stop
          yield [ value, ]
          value += step
        return null

    #-------------------------------------------------------------------------------------------------------
    return null
