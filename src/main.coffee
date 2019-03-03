

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

#-----------------------------------------------------------------------------------------------------------
limit = ( n, iterator ) ->
  count = 0
  for x from iterator
    return if count >= n
    count += +1
    yield x
  return

# #-----------------------------------------------------------------------------------------------------------
# @get_settings = ->
#   ### TAINT path within node_modules might differ ###
#   ### TAINT extensions should conceivably be configured in `*.icql` file or similar ###
#   # R.db_path   = join_path __dirname, '../../db/data.db'
#   R                 = {}
#   R.sqlitemk_path   = join_path __dirname, '../../../../sqlite-for-mingkwai-ime'
#   R.db_path         = join_path __dirname, '../../src/experiments/demo-using-intercourse.db'
#   R.icql_path       = join_path __dirname, '../../src/experiments/using-intercourse-with-sqlite.icql'
#   return R

#-----------------------------------------------------------------------------------------------------------
@bind = ( settings ) ->
  throw new Error "µ94721 need settings.db_path" unless settings.db_path?
  throw new Error "µ94721 need settings.icql_path" unless settings.icql_path?
  R                 = {}
  R.settings        = assign {}, settings
  R.db              = new Sqlite_db R.settings.db_path, R.settings.db_settings ? {}
  R.sql             = await IC.read_definitions R.settings.icql_path
  # debug '22233', R.sql; xxx
  @_bind_definitions R
  return R

#-----------------------------------------------------------------------------------------------------------
@_bind_definitions = ( me ) ->
  check_unique = ( name ) ->
    throw new Error "µ11292 name collision: #{rpr name} already defined" if me[ name ]?
  #.........................................................................................................
  for name in 'load prepare execute query'.split /\s+/
    check_unique name
    do ( name ) =>
      me[ name ] = ( P... ) => @[ name ] me, P...
  #.........................................................................................................
  for name, ic_entry of me.sql
    ### TAINT fix in intercourse ###
    ic_entry.name = name
    check_unique name
    me[ name ] = @_method_from_ic_entry me, ic_entry
  #.........................................................................................................
  return null

#-----------------------------------------------------------------------------------------------------------
@_method_from_ic_entry = ( me, ic_entry ) ->
  endpoint = switch ic_entry.type
    when 'procedure'  then @execute
    when 'query'      then @query
    else throw new Error "µ11109 unknown icSQL type #{rpr ic_entry.type}"
  return ( Q ) =>
    descriptor = @_descriptor_from_arguments me, ic_entry, Q
    return endpoint me, descriptor.text, Q if Q?
    return endpoint me, descriptor.text

#-----------------------------------------------------------------------------------------------------------
@_descriptor_from_arguments = ( me, ic_entry, Q ) ->
  if Q?
    throw new Error "µ83476 positional arguments not supported" unless CND.isa_pod Q
    arity = ( Object.keys Q ).length
  else
    arity = 0
  #.........................................................................................................
  if arity is 0 then  R  = ic_entry.arity[ 0 ] ? ic_entry.arity[ 'null' ]
  else                R  = ic_entry.arity[ arity ]
  R                     ?= ic_entry.arity[ 'null' ]
  #.........................................................................................................
  ### TAINT should devise a way to efficiently make sure keys of Q match signature ###
  # debug '27276', xrpr Q
  # debug '27276', xrpr R.signature
  #.........................................................................................................
  unless R?
    throw new Error "µ93832 calling method #{rpr ic_entry.name} with #{arity} arguments not implemented"
  return R

#-----------------------------------------------------------------------------------------------------------
@load     = ( me, path      ) => me.db.loadExtension path
@prepare  = ( me, sql       ) => me.db.prepare sql
@execute  = ( me, sql       ) => me.db.exec    sql
@query    = ( me, sql, P... ) => ( @prepare me, sql ).iterate P...


#-----------------------------------------------------------------------------------------------------------
@demo = ->
  settings  = @get_settings()
  db        = await ICQL.bind settings
  db.load join_path settings.sqlitemk_path, 'extensions/amatch.so'
  db.load join_path settings.sqlitemk_path, 'extensions/csv.so'
  # R.db.exec """select load_extension( 'fts5' );"""
  db.import_table_texnames()
  db.create_token_tables()
  db.populate_token_tables()
  # # whisper '-'.repeat 108
  # # info row for row from db.fetch_texnames()
  whisper '-'.repeat 108
  urge 'fetch_texnames';        info xrpr row for row from db.fetch_texnames { limit: 100, }
  # urge 'fetch_rows_of_txftsci'; info xrpr row for row from db.fetch_rows_of_txftsci { limit: 5, }
  # urge 'fetch_rows_of_txftscs'; info xrpr row for row from db.fetch_rows_of_txftscs { limit: 5, }
  urge 'fetch_stats'; info xrpr row for row from db.fetch_stats()
  whisper '-'.repeat 108
  urge 'fetch_token_matches'
  whisper '-'.repeat 108
  info ( xrpr row ) for row from db.fetch_token_matches { q: 'Iota', limit: 10, }
  whisper '-'.repeat 108
  info ( xrpr row ) for row from db.fetch_token_matches { q: 'acute', limit: 10, }
  whisper '-'.repeat 108
  info ( xrpr row ) for row from db.fetch_token_matches { q: 'u', limit: 10, }
  whisper '-'.repeat 108
  info ( xrpr row ) for row from limit 3, db.fetch_token_matches { q: 'mathbb', limit: 10, }
  # debug ( k for k of iterator )
  return null




############################################################################################################
unless module.parent?
  @demo()



