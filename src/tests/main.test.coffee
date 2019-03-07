

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
  # test @[ "x" ]
  # test @[ "basic 1" ]
  # test @[ "signatures" ]
  # test @[ "oneliners" ]
  # test @[ "_parse demo" ]


