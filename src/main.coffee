

'use strict'

############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'ICQL/DBA'
debug                     = CND.get_logger 'debug',     badge
warn                      = CND.get_logger 'warn',      badge
info                      = CND.get_logger 'info',      badge
urge                      = CND.get_logger 'urge',      badge
help                      = CND.get_logger 'help',      badge
whisper                   = CND.get_logger 'whisper',   badge
echo                      = CND.echo.bind CND
#...........................................................................................................
FS                        = require 'fs'
HOLLERITH                 = require 'hollerith-codec'
#...........................................................................................................
@types                    = require './types'
{ isa
  validate
  declare
  size_of
  type_of }               = @types
LFT                       = require 'letsfreezethat'
Multimix                  = require 'multimix'
L                         = @

#-----------------------------------------------------------------------------------------------------------
L.pick = ( d, key, fallback, type = null ) ->
  R = d?[ key ] ? fallback
  validate[ type ] R if type?
  return R


#===========================================================================================================
#
#-----------------------------------------------------------------------------------------------------------
class @Dba extends Multimix

  #---------------------------------------------------------------------------------------------------------
  @_defaults:
    sqlt:       null  ### [`better-sqlite3`](https://github.com/JoshuaWise/better-sqlite3/) instance ###
    echo:       false ### whether to echo statements to the terminal ###
    debug:      false ### whether to print additional debugging info ###
    path:       ''

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    super()
    @cfg          = { @constructor._defaults..., cfg..., }
    ### TAINT allow to pass through `better-sqlite3` options with `cfg` ###
    @sqlt         = @cfg.sqlt ? ( require 'better-sqlite3' ) ( @cfg.path ? '' )
    @_statements  = {}
    return null


  #=========================================================================================================
  # DEBUGGING
  #---------------------------------------------------------------------------------------------------------
  _echo: ( ref, sql ) ->
    return null unless @cfg.echo
    echo ( CND.reverse CND.blue "^icql@888-#{ref}^" ) + ( CND.reverse CND.yellow sql )
    return null

  #---------------------------------------------------------------------------------------------------------
  _debug: ( P... ) ->
    return null unless @cfg.debug
    debug P...
    return null


  #=========================================================================================================
  # QUERY RESULT ADAPTERS
  #---------------------------------------------------------------------------------------------------------
  limit: ( n, iterator ) ->
    count = 0
    for x from iterator
      return if count >= n
      count += +1
      yield x
    return

  #---------------------------------------------------------------------------------------------------------
  single_row:   ( iterator ) ->
    throw new Error "µ763 expected at least one row, got none" if ( R = @first_row iterator ) is undefined
    return R

  #---------------------------------------------------------------------------------------------------------
  all_first_values: ( iterator ) ->
    R = []
    for row from iterator
      for key, value of row
        R.push value
        break
    return R

  #---------------------------------------------------------------------------------------------------------
  first_values: ( iterator ) ->
    R = []
    for row from iterator
      for key, value of row
        yield value
    return R

  #---------------------------------------------------------------------------------------------------------
  first_row:    ( iterator  ) -> return row for row from iterator
  ### TAINT must ensure order of keys in row is same as order of fields in query ###
  single_value: ( iterator  ) -> return value for key, value of @single_row iterator
  first_value:  ( iterator  ) -> return value for key, value of @first_row iterator
  list:         ( iterator  ) -> [ iterator..., ]


  #=========================================================================================================
  # QUERYING
  #---------------------------------------------------------------------------------------------------------
  query: ( sql, P... ) ->
    @_echo 'query', sql
    statement = ( @_statements[ sql ] ?= @sqlt.prepare sql )
    return statement.iterate P...

  #---------------------------------------------------------------------------------------------------------
  run: ( sql, P... ) ->
    @_echo 'run', sql
    statement = ( @_statements[ sql ] ?= @sqlt.prepare sql )
    return statement.run P...

  #---------------------------------------------------------------------------------------------------------
  _run_or_query: ( entry_type, is_last, sql, Q ) ->
    @_echo '_run_or_query', sql
    statement     = ( @_statements[ sql ] ?= @sqlt.prepare sql )
    returns_data  = statement.reader
    #.......................................................................................................
    ### Always use `run()` method if statement does not return data: ###
    unless returns_data
      return if Q? then ( statement.run Q ) else statement.run()
    #.......................................................................................................
    ### If statement does return data, consume iterator unless this is the last statement: ###
    if ( entry_type is 'procedure' ) or ( not is_last )
      return if Q? then ( statement.all Q ) else statement.all()
    #.......................................................................................................
    ### Return iterator: ###
    return if Q? then ( statement.iterate Q ) else statement.iterate()

  #---------------------------------------------------------------------------------------------------------
  execute: ( sql  ) ->
    @_echo 'execute', sql
    return @sqlt.exec sql

  #---------------------------------------------------------------------------------------------------------
  prepare: ( sql  ) ->
    @_echo 'prepare', sql
    return @sqlt.prepare sql


  #=========================================================================================================
  # OTHER
  #---------------------------------------------------------------------------------------------------------
  aggregate:      ( P...  ) -> @sqlt.aggregate        P...
  backup:         ( P...  ) -> @sqlt.backup           P...
  checkpoint:     ( P...  ) -> @sqlt.checkpoint       P...
  close:          ( P...  ) -> @sqlt.close            P...
  read:           ( path  ) -> @sqlt.exec FS.readFileSync path, { encoding: 'utf-8', }
  function:       ( P...  ) -> @sqlt.function         P...
  load_extension: ( P...  ) -> @sqlt.loadExtension    P...
  pragma:         ( P...  ) -> @sqlt.pragma           P...
  transaction:    ( P...  ) -> @sqlt.transaction      P...

  #---------------------------------------------------------------------------------------------------------
  get_foreign_key_state: -> not not ( @pragma "foreign_keys;" )[ 0 ].foreign_keys

  #---------------------------------------------------------------------------------------------------------
  set_foreign_key_state: ( onoff ) ->
    validate.boolean onoff
    @pragma "foreign_keys = #{onoff};"
    return null


  #=========================================================================================================
  # DB STRUCTURE REPORTING
  #---------------------------------------------------------------------------------------------------------
  catalog: ->
    ### TAINT kludge: we sort by descending types so views, tables come before indexes (b/c you can't drop a
    primary key index in SQLite) ###
    # throw new Error "µ764 deprecated until next major version"
    @query "select * from sqlite_master order by type desc, name;"

  #---------------------------------------------------------------------------------------------------------
  walk_objects: ( cfg ) ->
    schema      = L.pick cfg, 'schema',     'main'
    ordering    = L.pick cfg, '_ordering',  null
    validate.ic_schema schema
    validate.dba_list_objects_ordering ordering
    schema_x    = @as_identifier schema
    ordering_x  = if ( ordering is 'drop' ) then 'desc' else 'asc'
    #.......................................................................................................
    return @query """
      select
          type      as type,
          name      as name,
          sql       as sql
        from #{schema_x}.sqlite_master
        order by type #{ordering_x}, name;"""

  #---------------------------------------------------------------------------------------------------------
  is_empty: ( cfg ) ->
    schema = L.pick cfg, 'schema', 'main'
    validate.ic_schema schema
    return @_is_empty @as_identifier schema

  #---------------------------------------------------------------------------------------------------------
  @_is_empty: ( schema_x ) -> ( @list @query "select 1 from #{schema_x}.sqlite_master limit 1;" ).length is 0

  #---------------------------------------------------------------------------------------------------------
  _list_objects_2: ( imagine_options_object_here ) ->
    # for schema in @list_schema_names()
    schema    = 'main'
    validate.ic_schema schema
    schema_x  = @as_identifier schema
    ### thx to https://stackoverflow.com/a/53160348/256361 ###
    return @list @query """
      select
        'main'  as schema,
        'field' as type,
        m.name  as relation_name,
        p.name  as field_name
      from
        #{schema_x}.sqlite_master as m
      join
        #{schema_x}.pragma_table_info( m.name ) as p
      order by
        m.name,
        p.cid;"""

  #---------------------------------------------------------------------------------------------------------
  # list_schemas:       -> @pragma "database_list;"
  list_schemas:       -> @list @query "select * from pragma_database_list order by name;"
  list_schema_names:  -> ( d.name for d in @list_schemas() )

  #---------------------------------------------------------------------------------------------------------
  get_schemas: ->
    R             = {}
    R[ row.name ] = row.file for row from @query "select * from pragma_database_list order by name;"
    return R

  #---------------------------------------------------------------------------------------------------------
  type_of: ( name, schema = 'main' ) ->
    for row from @catalog()
      return row.type if row.name is name
    return null

  #---------------------------------------------------------------------------------------------------------
  column_types: ( table ) ->
    R = {}
    ### TAINT we apparently have to call the pragma in this roundabout fashion since SQLite refuses to
    accept placeholders in that statement: ###
    for row from @query @interpolate "pragma table_info( $table );", { table, }
      R[ row.name ] = row.type
    return R

  #---------------------------------------------------------------------------------------------------------
  _dependencies_of: ( table, schema = 'main' ) ->
    return @query "pragma #{@as_identifier schema}.foreign_key_list( #{@as_identifier table} )"

  #---------------------------------------------------------------------------------------------------------
  dependencies_of:  ( table, schema = 'main' ) ->
    validate.ic_schema schema
    return ( row.table for row from @_dependencies_of table )


  #=========================================================================================================
  # DB STRUCTURE MODIFICATION
  #---------------------------------------------------------------------------------------------------------
  ### TAINT Error: index associated with UNIQUE or PRIMARY KEY constraint cannot be dropped ###
  clear: ( cfg ) ->
    schema        = L.pick cfg, 'schema', 'main'
    validate.ic_schema schema
    schema_x      = @as_identifier schema
    R             = 0
    fk_state      = @get_foreign_key_state()
    @set_foreign_key_state off
    for { type, name, } in @list @walk_objects { schema, _ordering: 'drop', }
      statement = "drop #{type} if exists #{@as_identifier name};"
      @execute statement
      R += +1
    @set_foreign_key_state fk_state
    return R

  #---------------------------------------------------------------------------------------------------------
  attach: ( cfg ) ->
    schema        = L.pick cfg, 'schema', null
    path          = L.pick cfg, 'path',   ''
    validate.ic_schema  schema
    validate.ic_path    path
    schema_x      = @as_identifier  schema
    path_x        = @as_sql         path
    return @execute "attach #{path_x} as #{schema_x};"

  #---------------------------------------------------------------------------------------------------------
  detach: ( cfg ) ->
    schema        = L.pick cfg, 'schema', null
    validate.ic_schema  schema
    schema_x      = @as_identifier  schema
    return @execute "detach #{schema_x};"


  #=========================================================================================================
  # IN-MEMORY PROCESSING
  #-----------------------------------------------------------------------------------------------------------
  copy_schema: ( cfg ) ->
    from_schema   = L.pick cfg, 'from_schema',  'main'
    to_schema     = L.pick cfg, 'to_schema',    'main'
    validate.ic_schema from_schema
    validate.ic_schema to_schema
    #.......................................................................................................
    if from_schema is to_schema
      throw new Error "µ767 unable to copy schema to itself, got #{rpr cfg} (schema #{rpr from_schema})"
    #.......................................................................................................
    known_schemas     = @list_schema_names()
    throw new Error "µ765 unknown schema #{rpr from_schema}" unless from_schema in known_schemas
    throw new Error "µ766 unknown schema #{rpr to_schema}"   unless to_schema   in known_schemas
    #.......................................................................................................
    to_schema_objects = @list @walk_objects { schema: to_schema, }
    # if @cfg.debug
    #   @_debug '^49864^', "objects in #{rpr to_schema}: #{rpr ( "(#{d.type})#{d.name}" for d in to_schema_objects ).join ', '}"
    if to_schema_objects.length > 0
      throw new Error "µ768 unable to copy to non-empty schema #{rpr to_schema}"
    #.......................................................................................................
    from_schema_objects = @list @walk_objects { schema: from_schema }
    return null if from_schema_objects.length is 0
    # if @cfg.debug
    #   @_debug '^49864^', "objects in #{rpr from_schema}: #{rpr ( "(#{d.type})#{d.name}" for d in from_schema_objects ).join ', '}"
    #.......................................................................................................
    to_schema_x   = @as_identifier to_schema
    from_schema_x = @as_identifier from_schema
    #.......................................................................................................
    inserts       = []
    #.......................................................................................................
    fk_state      = @get_foreign_key_state()
    @set_foreign_key_state off
    #.......................................................................................................
    for d in from_schema_objects
      # @_debug '^44463^', "copying DB object: (#{d.type}) #{d.name}"
      continue if ( not d.sql? ) or ( d.sql is '' )
      continue if d.name in [ 'sqlite_sequence', ]
      #.....................................................................................................
      ### TAINT consider to use `validate.ic_db_object_type` ###
      unless d.type in [ 'table', 'view', 'index', ]
        throw new Error "µ769 unknown type #{rpr d.type} for DB object #{rpr d}"
      #.....................................................................................................
      ### TAINT using not-so reliable string replacement as substitute for proper parsing ###
      name_x  = @as_identifier d.name
      sql     = d.sql.replace /\s*CREATE\s*(TABLE|INDEX|VIEW)\s*/i, "create #{d.type} #{to_schema_x}."
      #.....................................................................................................
      if sql is d.sql
        throw new Error "µ770 unexpected SQL string #{rpr d.sql}"
      #.....................................................................................................
      @execute sql
      if d.type is 'table'
        inserts.push "insert into #{to_schema_x}.#{name_x} select * from #{from_schema_x}.#{name_x};"
    # #.......................................................................................................
    # @_debug '^49864^', "starting with inserts"
    #.......................................................................................................
    @execute sql for sql in inserts
    @set_foreign_key_state fk_state
    @pragma "#{@as_identifier to_schema}.foreign_key_check;" if fk_state
    return null

  #---------------------------------------------------------------------------------------------------------
  save_as: ( cfg ) ->
    schema    = L.pick cfg, 'schema', 'main'
    path      = L.pick cfg, 'path', null
    schema_x  = @as_identifier schema
    db.$.run "vacuum #{schema_x} into ?;", [ path, ]
    return null


  #=========================================================================================================
  # SQL CONSTRUCTION
  #---------------------------------------------------------------------------------------------------------
  as_identifier:  ( x  ) ->
    validate.text x
    '"' + ( x.replace /"/g, '""' ) + '"'
  # as_identifier:  ( x  ) -> '[' + ( x.replace /\]/g, ']]' ) + ']'

  #---------------------------------------------------------------------------------------------------------
  escape_text: ( x ) ->
    validate.text x
    x.replace /'/g, "''"

  #---------------------------------------------------------------------------------------------------------
  list_as_json: ( x ) ->
    validate.list x
    return JSON.stringify x

  #---------------------------------------------------------------------------------------------------------
  as_sql: ( x ) ->
    switch type = type_of x
      when 'text'     then return "'#{@escape_text x}'"
      when 'list'     then return "'#{@list_as_json x}'"
      when 'float'    then return x.toString()
      when 'boolean'  then return ( if x then '1' else '0' )
      when 'null'     then return 'null'
      when 'undefined'
        throw new Error "µ771 unable to express 'undefined' as SQL literal"
    throw new Error "µ772 unable to express a #{type} as SQL literal, got #{rpr x}"

  #---------------------------------------------------------------------------------------------------------
  interpolate: ( sql, Q ) ->
    return sql.replace @_interpolation_pattern, ( $0, $1 ) =>
      try
        return @as_sql Q[ $1 ]
      catch error
        throw new Error \
          "µ773 when trying to express placeholder #{rpr $1} as SQL literal, an error occurred: #{rpr error.message}"
  _interpolation_pattern: /// \$ (?: ( .+? ) \b | \{ ( [^}]+ ) \} ) ///g


  #=========================================================================================================
  # SORTABLE LISTS
  #---------------------------------------------------------------------------------------------------------
  as_hollerith:   ( x ) -> HOLLERITH.encode x
  from_hollerith: ( x ) -> HOLLERITH.decode x


