

'use strict'

############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'ICQL/MAIN'
debug                     = CND.get_logger 'debug',     badge
warn                      = CND.get_logger 'warn',      badge
info                      = CND.get_logger 'info',      badge
urge                      = CND.get_logger 'urge',      badge
help                      = CND.get_logger 'help',      badge
whisper                   = CND.get_logger 'whisper',   badge
echo                      = CND.echo.bind CND
#...........................................................................................................
# PATH                      = require 'path'
# PD                        = require 'pipedreams'
# { $
#   $async
#   select }                = PD
{ assign
  jr }                    = CND
# #...........................................................................................................
# join_path                 = ( P... ) -> PATH.resolve PATH.join P...
# boolean_as_int            = ( x ) -> if x then 1 else 0
{ inspect, }              = require 'util'
xrpr                      = ( x ) -> inspect x, { colors: yes, breakLength: Infinity, maxArrayLength: Infinity, depth: Infinity, }
#...........................................................................................................
IC                        = require 'intercourse'
Sqlite_db                 = require 'better-sqlite3'

#===========================================================================================================
# LOCAL METHODS
#-----------------------------------------------------------------------------------------------------------
local_methods =

  #---------------------------------------------------------------------------------------------------------
  limit: ( me, n, iterator ) ->
    count = 0
    for x from iterator
      return if count >= n
      count += +1
      yield x
    return

  #---------------------------------------------------------------------------------------------------------
  load:     ( me, path      ) -> me.$.db.loadExtension  path
  prepare:  ( me, sql       ) -> me.$.db.prepare        sql
  execute:  ( me, sql       ) -> me.$.db.exec           sql
  query:    ( me, sql, P... ) -> ( @prepare sql ).iterate P...


#===========================================================================================================
#
#-----------------------------------------------------------------------------------------------------------
@bind = ( settings ) ->
  throw new Error "µ94721 need settings.db_path"    unless settings.db_path?
  throw new Error "µ94721 need settings.icql_path"  unless settings.icql_path?
  R                 = { $: {}, }
  R.$.settings      = assign {}, settings
  R.$.db            = new Sqlite_db R.$.settings.db_path, R.$.settings.db_settings ? {}
  R.$.sql           = await IC.read_definitions R.$.settings.icql_path
  @_bind_definitions R
  return R

#-----------------------------------------------------------------------------------------------------------
@_bind_definitions = ( me ) ->
  check_unique = ( name ) ->
    throw new Error "µ11292 name collision: #{rpr name} already defined" if me[ name ]?
  #.........................................................................................................
  for name, local_method of local_methods
    do ( name, local_method ) ->
      check_unique name
      local_method = local_method.bind me.$
      me.$[ name ] = ( ( P... ) -> local_method me, P... ).bind me.$
  #.........................................................................................................
  for name, ic_entry of me.$.sql
    ### TAINT fix in intercourse ###
    ic_entry.name = name
    check_unique name
    me[ name ] = @_method_from_ic_entry me, ic_entry
  #.........................................................................................................
  return null

#-----------------------------------------------------------------------------------------------------------
@_method_from_ic_entry = ( me, ic_entry ) ->
  endpoint = switch ic_entry.type
    when 'procedure'  then me.$.execute
    when 'query'      then me.$.query
    else throw new Error "µ11109 unknown icSQL type #{rpr ic_entry.type}"
  return ( Q ) =>
    descriptor = @_descriptor_from_arguments me, ic_entry, Q
    return endpoint descriptor.text, Q if Q?
    return endpoint descriptor.text

#-----------------------------------------------------------------------------------------------------------
@_descriptor_from_arguments = ( me, ic_entry, Q ) ->
  [ signature, kenning, ]         = IC.get_signature_and_kenning Q
  is_void_signature               = kenning in [ '()', 'null', ]
  if is_void_signature  then  R   = ic_entry[ '()'    ] ? ic_entry[ 'null' ]
  else                        R   = ic_entry[ kenning ]
  R                              ?= ic_entry[ 'null'  ]
  #.........................................................................................................
  unless R?
    throw new Error "µ93832 calling method with arguments #{ic_entry.name} with signature #{kenning} not implemented"
  return R




