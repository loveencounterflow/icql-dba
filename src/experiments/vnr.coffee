

'use strict'

############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'ICQL/EXPERIMENTS/VNR'
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
#...........................................................................................................
@types                    = require '../types'
{ isa
  validate
  cast
  declare
  size_of
  type_of }               = @types
ICQL                      = require '../..'
#-----------------------------------------------------------------------------------------------------------
PATH                      = require 'path'
@cwd_abspath              = CND.cwd_abspath
@cwd_relpath              = CND.cwd_relpath
@here_abspath             = CND.here_abspath
@_drop_extension          = ( path ) => path[ ... path.length - ( PATH.extname path ).length ]
@project_abspath          = ( P... ) => CND.here_abspath __dirname, '../..', P...



#===========================================================================================================
#
#-----------------------------------------------------------------------------------------------------------
@get_icql_settings = ->
  R =
    connector:    require 'better-sqlite3'
    db_path:      '/tmp/icql.db'
    icql_path:    @project_abspath 'src/experiments/vnr.icql'
    # clear:        true
  return R


#-----------------------------------------------------------------------------------------------------------
@demo_casts = ->
  db                = ICQL.bind @get_icql_settings()
  db.$.clear()
  # urge 'µ33092', jr db.$.all_rows db.read_sqlite_master()
  db.create_demo_table()
  # urge 'µ33092', jr db.$.all_rows db.read_sqlite_master()
  db.create_myview()
  # db.create_trigger_on_master()
  # urge 'µ33092', jr db.$.all_rows db.read_sqlite_master()
  #---------------------------------------------------------------------------------------------------------
  # types = db.$.column_types 'mytable'
  # insert_into_mytable =
  rows = [
    { vnr: 'x', bytes: 'x', n: 'x', is_great: 'x', something: 'x', }
    { vnr: 'x', bytes: 1, n: 'x', is_great: 'x', something: 'x', }
    # { vnr: 'x', bytes: true, n: 'x', is_great: 'x', something: 'x', }
    ]
  for row in rows
    db.insert_into_mytable row
  #---------------------------------------------------------------------------------------------------------
  for row from db.read_mytable()
    info jr row
  debug db.$.column_types 'mytable'
  debug db.$.column_types 'myview'
  debug cast.boolean 'number', true
  debug cast.boolean 'number', false
  #---------------------------------------------------------------------------------------------------------
  statement = db.$.prepare "select * from mytable limit 0;"
  help jr ( "#{c.name}: #{c.type}" for c in statement.columns() )
  statement = db.$.prepare "select * from myview limit 0;"
  help jr ( "#{c.name}: #{rpr c.type}" for c in statement.columns() )
  #---------------------------------------------------------------------------------------------------------
  return null

provide_VNR = ->
  HOLLERITH = require 'hollerith-codec'

  #-----------------------------------------------------------------------------------------------------------
  @deepen = ( vnr, start = 0 ) ->
    validate.vnr vnr
    return vnr.push start

  #-----------------------------------------------------------------------------------------------------------
  @advance = ( vnr ) ->
    validate.vnr vnr
    vnr[ vnr.length - 1 ]++
    return vnr

  #-----------------------------------------------------------------------------------------------------------
  @encode = ( vnr ) ->
    validate.vnr vnr
    return HOLLERITH.encode R.vnr

  #-----------------------------------------------------------------------------------------------------------
  @decode = ( buffer ) ->
    validate.buffer buffer
    return HOLLERITH.decode buffer


  return @
VNR = provide_VNR.apply {}

#-----------------------------------------------------------------------------------------------------------
@demo_vnr = ->
  HOLLERITH = require 'hollerith-codec'
  db        = ICQL.bind @get_icql_settings()
  db.$.clear()
  db.create_vnrtable()
  # debug 'µ44433', @types.specs
  #.........................................................................................................
  db.insert_into_vnrtable = ( Q ) ->
    validate.vnr Q.vnr
    R             = assign {}, Q
    R.vnr_blob    = HOLLERITH.encode R.vnr
    R.vnr         = jr R.vnr
    R.is_stamped  = cast.boolean 'number', R.is_stamped
    return @_insert_into_vnrtable R
  #.........................................................................................................
  db.read_vnrtable = ->
    for R from @_read_vnrtable()
      R.vnr_blob    = R.vnr_blob.toString 'hex'
      R.vnr         = JSON.parse R.vnr
      R.is_stamped  = cast.number 'boolean', R.is_stamped
      yield R
  #.........................................................................................................
  rows = [
    { vnr: [  -1, ],      is_stamped: true,   text: "some text",  }
    { vnr: [ -10, ],      is_stamped: true,   text: "some text",  }
    { vnr: [  -2, ],      is_stamped: false,  text: "some text",  }
    { vnr: [ -20, ],      is_stamped: true,   text: "some text",  }
    { vnr: [   0, ],      is_stamped: true,   text: "some text",  }
    { vnr: [   1, ],      is_stamped: true,   text: "some text",  }
    { vnr: [  10, ],      is_stamped: true,   text: "some text",  }
    { vnr: [  10, -1, ],  is_stamped: true,   text: "some text",  }
    { vnr: [  10, -2, ],  is_stamped: true,   text: "some text",  }
    { vnr: [  10, 0, ],   is_stamped: true,   text: "some text",  }
    { vnr: [  10, 1, ],   is_stamped: true,   text: "some text",  }
    { vnr: [  10, 2, ],   is_stamped: true,   text: "some text",  }
    { vnr: [  10, 10, ],  is_stamped: true,   text: "some text",  }
    { vnr: [  12, ],      is_stamped: true,   text: "some text",  }
    { vnr: [   2, ],      is_stamped: true,   text: "some text",  }
    { vnr: [  20, ],      is_stamped: true,   text: "some text",  }
    ]
  for row in rows
    # delete db.vnr_blob
    db.insert_into_vnrtable row
  #.........................................................................................................
  for row from db.read_vnrtable()
    # delete row.vnr_blob
    info jr row
  return null


############################################################################################################
unless module.parent?
  do =>
    # await @demo_casts()
    await @demo_vnr()








