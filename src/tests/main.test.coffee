

'use strict'


############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'ICQL/TESTS/MAIN'
debug                     = CND.get_logger 'debug',     badge
warn                      = CND.get_logger 'warn',      badge
info                      = CND.get_logger 'info',      badge
urge                      = CND.get_logger 'urge',      badge
help                      = CND.get_logger 'help',      badge
whisper                   = CND.get_logger 'whisper',   badge
echo                      = CND.echo.bind CND
#...........................................................................................................
test                      = require 'guy-test'
jr                        = JSON.stringify
IC                        = require '../..'
{ inspect, }              = require 'util'
xrpr                      = ( x ) -> inspect x, { colors: yes, breakLength: Infinity, maxArrayLength: Infinity, depth: Infinity, }
xrpr2                     = ( x ) -> inspect x, { colors: yes, breakLength: 20, maxArrayLength: Infinity, depth: Infinity, }
#...........................................................................................................
ICQL                      = require '../..'
PATH                      = require 'path'
require '../exception-handler'

#-----------------------------------------------------------------------------------------------------------
get_icql_settings = ->
  R                 = {}
  R.connector       = require 'better-sqlite3'
  R.db_path         = '/tmp/icql.db'
  R.icql_path       = PATH.resolve PATH.join __dirname, '../../src/tests/test.icql'
  return R

#-----------------------------------------------------------------------------------------------------------
@[ "oneliners" ] = ( T, done ) ->
  PATH              = require 'path'
  IC                = require 'intercourse'
  intercourse_path  = require.resolve 'intercourse'
  demo_path         = PATH.join intercourse_path, '../../demos/sqlite-demo.icql'
  debug '22999', demo_path
  db                = {}
  ICQL.definitions_from_path_sync db, demo_path
  debug '33442', db
  return done()
  throw new Error "sorry no tests as yet"
  probes_and_matchers = [
    # ["procedure foobar:  some text\n  illegal line",null,'illegal follow-up after one-liner']
    ["procedure foobar: some text",{"foobar":{"type":"procedure","null":{"text":"some text\n","location":{"line_nr":1},"kenning":"null","type":"procedure"}}},null]
    ["procedure foobar(): some text",{"foobar":{"type":"procedure","()":{"text":"some text\n","location":{"line_nr":1},"kenning":"()","type":"procedure","signature":[]}}},null]
    ["procedure foobar( first ): some text",{"foobar":{"type":"procedure","(first)":{"text":"some text\n","location":{"line_nr":1},"kenning":"(first)","type":"procedure","signature":["first"]}}},null]
    ["procedure foobar(first): some text",{"foobar":{"type":"procedure","(first)":{"text":"some text\n","location":{"line_nr":1},"kenning":"(first)","type":"procedure","signature":["first"]}}},null]
    ["procedure foobar( first, ): some text",{"foobar":{"type":"procedure","(first)":{"text":"some text\n","location":{"line_nr":1},"kenning":"(first)","type":"procedure","signature":["first"]}}},null]
    ["procedure foobar(first,): some text",{"foobar":{"type":"procedure","(first)":{"text":"some text\n","location":{"line_nr":1},"kenning":"(first)","type":"procedure","signature":["first"]}}},null]
    ["procedure foobar( first, second ): some text",{"foobar":{"type":"procedure","(first,second)":{"text":"some text\n","location":{"line_nr":1},"kenning":"(first,second)","type":"procedure","signature":["first","second"]}}},null]
    ["procedure foobar( first, second, ): some text",{"foobar":{"type":"procedure","(first,second)":{"text":"some text\n","location":{"line_nr":1},"kenning":"(first,second)","type":"procedure","signature":["first","second"]}}},null]
    ]
  #.........................................................................................................
  # for [ probe, matcher, error, ] in probes_and_matchers
  #   await T.perform probe, matcher, error, -> return new Promise ( resolve, reject ) ->
  #     # try
  #     result = await IC.read_definitions_from_text probe
  #     # catch error
  #     #   return resolve error
  #     # debug '29929', xrpr2 result
  #     resolve result
  done()

#-----------------------------------------------------------------------------------------------------------
@[ "parameters are expanded in procedures" ] = ( T, done ) ->
  db                = ICQL.bind get_icql_settings()
  # debug 'µ44433', db
  db.create_demo_table()
  #.........................................................................................................
  db.$.function 'echo', { deterministic: false, varargs: true  }, ( P... ) -> urge ( CND.grey 'DB' ), P...;  null
  db.$.function 'e',    { deterministic: false, varargs: false }, ( x    ) -> urge ( CND.grey 'DB' ), rpr x; x
  #.........................................................................................................
  debug db.$.all_rows db.read_demo_rows()
  debug db.$.all_rows db.select_by_rowid { rowid: 2, }
  try
    db.update_by_rowid { rowid: 2, status: 'bar', }
  catch error
    debug 'µ33555', error.code
    debug 'µ33555', error.name
    debug 'µ33555', ( k for k of error )
    debug 'µ33555', error.message
    # TypeError
    process.exit 1
  debug db.$.all_rows db.select_by_rowid { rowid: 2, }
  #.........................................................................................................
  # statement = db.$.prepare "select rowid, * from demo where rowid = $rowid;"
  # info 'µ00908', [ ( statement.iterate { rowid: 2, } )..., ]
  # # statement = db.$.prepare "select 42; select rowid, * from demo where rowid = $rowid;"
  # # statement = db.$.prepare "update demo set status = 'yes!' where rowid = $rowid;"
  # # info 'µ00908', statement.run { rowid: 2, }
  # info 'µ00908', db.$.run "update demo set status = 'yes!' where rowid = $rowid;", { rowid: 2, extra: true, }
  # debug db.$.all_rows db.select_by_rowid { rowid: 2, }

  # probes_and_matchers = [
  #   # ["procedure foobar:  some text\n  illegal line",null,'illegal follow-up after one-liner']
  #   ["procedure foobar: some text",{"foobar":{"type":"procedure","null":{"text":"some text\n","location":{"line_nr":1},"kenning":"null","type":"procedure"}}},null]
  #   ["procedure foobar(): some text",{"foobar":{"type":"procedure","()":{"text":"some text\n","location":{"line_nr":1},"kenning":"()","type":"procedure","signature":[]}}},null]
  #   ["procedure foobar( first ): some text",{"foobar":{"type":"procedure","(first)":{"text":"some text\n","location":{"line_nr":1},"kenning":"(first)","type":"procedure","signature":["first"]}}},null]
  #   ["procedure foobar(first): some text",{"foobar":{"type":"procedure","(first)":{"text":"some text\n","location":{"line_nr":1},"kenning":"(first)","type":"procedure","signature":["first"]}}},null]
  #   ["procedure foobar( first, ): some text",{"foobar":{"type":"procedure","(first)":{"text":"some text\n","location":{"line_nr":1},"kenning":"(first)","type":"procedure","signature":["first"]}}},null]
  #   ["procedure foobar(first,): some text",{"foobar":{"type":"procedure","(first)":{"text":"some text\n","location":{"line_nr":1},"kenning":"(first)","type":"procedure","signature":["first"]}}},null]
  #   ["procedure foobar( first, second ): some text",{"foobar":{"type":"procedure","(first,second)":{"text":"some text\n","location":{"line_nr":1},"kenning":"(first,second)","type":"procedure","signature":["first","second"]}}},null]
  #   ["procedure foobar( first, second, ): some text",{"foobar":{"type":"procedure","(first,second)":{"text":"some text\n","location":{"line_nr":1},"kenning":"(first,second)","type":"procedure","signature":["first","second"]}}},null]
  #   ]
  #.........................................................................................................
  # for [ probe, matcher, error, ] in probes_and_matchers
  #   await T.perform probe, matcher, error, -> return new Promise ( resolve, reject ) ->
  #     # try
  #     result = await IC.read_definitions_from_text probe
  #     # catch error
  #     #   return resolve error
  #     # debug '29929', xrpr2 result
  #     resolve result
  done()

#-----------------------------------------------------------------------------------------------------------
@[ "as_sql" ] = ( T, done ) ->
  PATH              = require 'path'
  db                = ICQL.bind get_icql_settings()
  probes_and_matchers = [
    [true,'1',]
    [false,'0',]
    [42,'42',]
    ['text',"'text'",]
    ["text with 'quotes'","'text with ''quotes'''",]
    [[1,2,3],"'[ 1, 2, 3 ]'",]
    [[],"'[]'",]
    ]
  #.........................................................................................................
  for [ probe, matcher, error, ] in probes_and_matchers
    await T.perform probe, matcher, error, -> return new Promise ( resolve, reject ) ->
      resolve db.$.as_sql probe
  done()

#-----------------------------------------------------------------------------------------------------------
@[ "interpolate" ] = ( T, done ) ->
  PATH              = require 'path'
  db                = ICQL.bind get_icql_settings()
  probes_and_matchers = [
    [["foo, $bar, baz",{bar:42,}],"foo, 42, baz"]
    [["select * from t where d = $d;",{bar:42,}],null,"unable to express 'undefined' as SQL literal"]
    [["select * from t where d = $d;",{d:true,}],"select * from t where d = 1;"]
    ]
  #.........................................................................................................
  for [ probe, matcher, error, ] in probes_and_matchers
    await T.perform probe, matcher, error, -> return new Promise ( resolve, reject ) ->
      [ sql, Q, ] = probe
      resolve db.$.interpolate sql, Q
  done()

#-----------------------------------------------------------------------------------------------------------
@[ "fragments return interpolated source text" ] = ( T, done ) ->
  db                = ICQL.bind get_icql_settings()
  # debug 'µ44430', db
  # debug 'µ44430', db.$.sql
  # debug 'µ44430', db.create_demo_table_middle
  key     = 'somekey'
  value   = 'somevalue'
  status  = 'somestatus'
  first   = db.create_demo_table_first()
  middle  = db.create_demo_table_middle { key, value, status, }
  last    = db.create_demo_table_last()
  T.eq first,   "drop table if exists demo;\ncreate table demo (\n  key     text,\n  value   text,\n  status  text );\ninsert into demo values"
  T.eq middle,  "( 'somekey', 'somevalue', 'somestatus' )"
  T.eq last,    ";"
  done()

#-----------------------------------------------------------------------------------------------------------
@[ "_demo 2" ] = ( T, done ) ->
  settings  = @get_settings()
  db        = await ICQL.bind settings
  db.load join_path settings.sqlitemk_path, 'extensions/amatch.so'
  db.load join_path settings.sqlitemk_path, 'extensions/csv.so'
  # R.$.db.exec """select load_extension( 'fts5' );"""
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

# #-----------------------------------------------------------------------------------------------------------
# @[ "x" ] = ( T, done ) ->
#   T.eq 42, 42
#   T.eq 42, 43
#   done()
#   return null


############################################################################################################
unless module.parent?
  test @
  # test @[ "as_sql" ]
  # test @[ "interpolate" ]
  # test @[ "fragments return interpolated source text" ]
  # test @[ "parameters are expanded in procedures" ]
  # @[ "parameters are expanded in procedures" ]()
  # test @[ "x" ]
  # test @[ "basic 1" ]
  # test @[ "signatures" ]
  # test @[ "oneliners" ]
  # test @[ "_parse demo" ]


