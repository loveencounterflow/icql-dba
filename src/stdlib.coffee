
'use strict'


############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'ICQL-DBA/STD'
debug                     = CND.get_logger 'debug',     badge
warn                      = CND.get_logger 'warn',      badge
info                      = CND.get_logger 'info',      badge
urge                      = CND.get_logger 'urge',      badge
help                      = CND.get_logger 'help',      badge
whisper                   = CND.get_logger 'whisper',   badge
echo                      = CND.echo.bind CND

#-----------------------------------------------------------------------------------------------------------
@Stdlib_mixin = ( clasz = Object ) => class extends clasz
  ### TAINT use `cfg` ###
  create_stdlib: ( cfg ) ->
    @types.validate.dba_create_stdlib_cfg ( cfg = { @types.defaults.dba_create_stdlib_cfg..., cfg..., } )

    #-------------------------------------------------------------------------------------------------------
    @create_function
      name:           cfg.prefix + 'str_reverse'
      deterministic:  true
      varargs:        false
      call:           ( s ) -> ( Array.from s ).reverse().join ''

    #-------------------------------------------------------------------------------------------------------
    @create_function
      name:           cfg.prefix + 'str_join'
      deterministic:  true
      varargs:        true
      call:           ( joiner, P... ) -> P.join joiner

    #-------------------------------------------------------------------------------------------------------
    @create_table_function
      name:           cfg.prefix + 'str_split_first'
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
      name:           cfg.prefix + 'generate_series'
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
