
# use icql.sublime-syntax for syntax
# and Monokai-Neue.sublime-color-scheme
# (both in ~/.config/sublime-text-3/Packages/User)
# for syntax and hiliting colors


%%%.coffee -------------------------------------------------------------------------------------------------
if condition
  f = ( x ) -> x ** x

  %%%.sql
  \echo :signal ———{ :filename 1 }———:reset
  create function PGBOSSX.on_after_insert_into_pgboss_job() returns trigger language plpgsql as $$
    begin
      -- perform log( '^34433^', new::text );
      perform log( '^34433^', new.id::text );
      return new; end; $$;

%%%.js -----------------------------------------------------------------------------------------------------
var k = 42;


function d ( x ) { return x ** x; };
function f ( x ) {
  %%%.coffee
  %%%.js
  };
var k = 42;

%%%.coffee -------------------------------------------------------------------------------------------------

a = ( x ) -> 42
function d ( x ) { return x ** x; };



%%%.js -----------------------------------------------------------------------------------------------------

a = ( x ) -> 42
function d ( x ) { return x ** x; };





%%%.coffee -------------------------------------------------------------------------------------------------

```
var k = 42;
function d ( x ) { return x ** x; };
```


'use strict'


############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'FLOWMATIC/INTERACTION'
log                       = CND.get_logger 'plain',     badge
debug                     = CND.get_logger 'debug',     badge
info                      = CND.get_logger 'info',      badge
warn                      = CND.get_logger 'warn',      badge
alert                     = CND.get_logger 'alert',     badge
help                      = CND.get_logger 'help',      badge
urge                      = CND.get_logger 'urge',      badge
whisper                   = CND.get_logger 'whisper',   badge
echo                      = CND.echo.bind CND
#...........................................................................................................
# FS                        = require 'fs'
# FSP                       = ( require 'fs' ).promises
PATH                      = require 'path'
#...........................................................................................................
SP                        = require 'steampipes'
{ $
  $async
  $watch
  $show
  $drain }                = SP.export()
DATOM                     = require 'datom'
{ new_datom
  freeze
  select }                = DATOM.export()
sleep                     = ( dts ) -> new Promise ( done ) => setTimeout done, dts * 1000
{ jr }                    = CND
DB                        = require '../../intershop/intershop_modules/db'
#...........................................................................................................
types                     = require '../types'
{ isa
  validate
  cast
  type_of }               = types
#...........................................................................................................
require 'cnd/lib/exception-handler'


# #-----------------------------------------------------------------------------------------------------------
# demo_2 = -> new Promise ( resolve ) =>
#   fifo      = FIFO.new_fifo()
#   pipeline  = []
#   pipeline.push FIFO.new_message_source fifo
#   pipeline.push $watch ( d ) => info '^333^', d
#   pipeline.push $drain =>
#     resolve()
#   SP.pull pipeline...
#   return null

#-----------------------------------------------------------------------------------------------------------
emit = ( $key, $value ) ->
  validate.undefined $value
  await DB.query [ "select FM.emit( $1 );", $key, ]
  return null

#-----------------------------------------------------------------------------------------------------------
show = ->
  ### TAINT assemble value in DB ###
  R = {}
  for row in await DB.query "select * from FM.current_user_state order by topic;"
    R[ row.topic ] = row.focus
  urge jr R

#-----------------------------------------------------------------------------------------------------------
demo = ->
  rpc_server = require '../../intershop/intershop_modules/intershop-rpc-server-secondary'
  rpc_server.listen()
  process.on 'uncaughtException',  -> rpc_server.stop()
  process.on 'unhandledRejection', -> rpc_server.stop()
  #.........................................................................................................
  rpc_server.contract 'on_flowmatic_event', ( S, Q ) ->
    validate.object Q
    { event, } = Q
    debug '^33373^', rpr event
    return [ '°s^zero', ] if event is '°s^one'
    return null
  #.........................................................................................................
  # info jr row for row in await DB.query """select * from FM.journal;"""
  await show()
  await emit '°s^zero'
  await show()
  await emit '°s^zero'
  await show()
  await emit '°s^one'
  await show()
  process.exit 0


############################################################################################################
if require.main is module then do =>

  #-----------------------------------------------------------------------------------------------------------
  read_configuration = ->
    PTVR                      = require '../../intershop/intershop_modules/ptv-reader'
    guest_intershop_ptv_path  = PATH.resolve PATH.join __dirname, '../../intershop/intershop.ptv'
    host_intershop_ptv_path   = PATH.resolve PATH.join __dirname, '../../intershop.ptv'
    return freeze PTVR.hash_from_paths guest_intershop_ptv_path, host_intershop_ptv_path

  #-----------------------------------------------------------------------------------------------------------
  new_boss = ->
    cfg         = read_configuration()
    database    = cfg[ 'intershop/db/name'    ].value
    user        = cfg[ 'intershop/db/user'    ].value
    # port        = cfg[ 'intershop/db/port'    ].value
    # boss_url    = "postgres://#{db_user}@localhost/#{db_name}"
    # host:                       'host',
    # password:                   'password',
    # poolSize:                   5, // or max: 5
    # archiveCompletedJobsEvery:  '2 days'
    PgBoss  = require 'pg-boss'
    # R       = new PgBoss boss_url
    R       = new PgBoss { database, user, }
    R.on 'error', ( error ) => warn error
    return R

  # help PgBoss.getConstructionPlans()
  boss  = new_boss()
  await boss.start()
  # await DB.
  await boss.deleteAllQueues()
  # debug '^66676^', boss
  debug await boss.subscribe '^foobar', {}, ( d ) ->
    urge d.name, jr d.data
    d.done()
  for nr in [ 1 .. 5 ]
     whisper msg_id = await boss.publish '^foobar', { msg: "msg##{nr}", }
     await sleep 0.25
  info '^7776-1^', jr row for row in await DB.query "select * from pgboss.archive;"
  for row in await DB.query "select * from pgboss.job order by createdon;"
    { id, name, data, state, expirein, createdon, } = row
    # info '^7776-2^', "#{id} #{name} #{jr data} #{state} #{jr expirein} #{createdon}"
    info '^7776-2^', "#{id} #{name} #{state}"
  process.exit 1



