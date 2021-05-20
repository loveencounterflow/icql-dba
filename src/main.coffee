

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
  validate_optional
  declare
  size_of
  type_of }               = @types
{ freeze
  lets }                  = require 'letsfreezethat'
Multimix                  = require 'multimix'
L                         = @
L._misfit                 = Symbol 'misfit'
new_bsqlt3_connection     = require 'better-sqlite3'
PATH                      = require 'path'

#-----------------------------------------------------------------------------------------------------------
L.pick = ( d, key, fallback, type = null ) ->
  R = d?[ key ] ? fallback
  validate[ type ] R if type?
  return R

#-----------------------------------------------------------------------------------------------------------
L._get_extension = ( path ) ->
  return null if ( R = PATH.extname path ) is ''
  return R[ 1 .. ]

#-----------------------------------------------------------------------------------------------------------
L._get_format = ( path, format = null ) ->
  return format if format?
  return @._get_extension path

#-----------------------------------------------------------------------------------------------------------
class L.Dba_error extends Error
  constructor: ( ref, message ) ->
    super()
    @message  = "#{ref} (#{@constructor.name}) #{message}"
    @ref      = ref
    return undefined ### always return `undefined` from constructor ###

#-----------------------------------------------------------------------------------------------------------
class L.Dba_cfg_error                 extends L.Dba_error
  constructor: ( ref, message )     -> super ref, message
class L.Dba_schema_exists             extends L.Dba_error
  constructor: ( ref, schema )      -> super ref, "schema #{rpr schema} already exists"
class L.Dba_schema_unknown            extends L.Dba_error
  constructor: ( ref, schema )      -> super ref, "schema #{rpr schema} does not exist"
class L.Dba_schema_nonempty           extends L.Dba_error
  constructor: ( ref, schema )      -> super ref, "schema #{rpr schema} isn't empty"
class L.Dba_schema_not_allowed        extends L.Dba_error
  constructor: ( ref, schema )      -> super ref, "schema #{rpr schema} not allowed here"
class L.Dba_schema_repeated           extends L.Dba_error
  constructor: ( ref, schema )      -> super ref, "unable to copy schema to itself, got #{rpr schema}"
class L.Dba_expected_one_row          extends L.Dba_error
  constructor: ( ref, row_count )   -> super ref, "expected 1 row, got #{row_count}"
class L.Dba_import_format_unknown     extends L.Dba_error
  constructor: ( ref, format )      -> super ref, "unknown import format #{ref format}"
class L.Dba_not_implemented           extends L.Dba_error
  constructor: ( ref, what )        -> super ref, "#{what} isn't implemented (yet)"
class L.Dba_deprecated                extends L.Dba_error
  constructor: ( ref, what )        -> super ref, "#{what} has been deprecated"
class L.Dba_unexpected_db_object_type extends L.Dba_error
  constructor: ( ref, type, value ) -> super ref, "µ769 unknown type #{rpr type} of DB object #{d}"
class L.Dba_sql_value_error           extends L.Dba_error
  constructor: ( ref, type, value ) -> super ref, "unable to express a #{type} as SQL literal, got #{rpr x}"
class L.Dba_unexpected_sql            extends L.Dba_error
  constructor: ( ref, sql )         -> super ref, "unexpected SQL string #{rpr sql}"
class L.Dba_sqlite_too_many_dbs       extends L.Dba_error
  constructor: ( ref, schema )      -> super ref, "unable to attach schema #{rpr schema}: too many attached databases"
class L.Dba_sqlite_error              extends L.Dba_error
  constructor: ( ref, error )       -> super ref, "#{error.code ? 'SQLite error'}: #{error.message}"


#===========================================================================================================
#
#-----------------------------------------------------------------------------------------------------------
class @Dba extends Multimix

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    super()
    @_statements  = {}
    @_schemas     = freeze {}
    @cfg          = freeze { L.types.defaults.dba_constructor_cfg..., cfg..., }
    validate.dba_constructor_cfg @cfg
    @_dbg         = { debug: @cfg.debug, echo: @cfg.echo, }
    # debug '^345^', @cfg
    throw new L.Dba_cfg_error '^dba@300^', "property `sqlt` not supported (yet)"   if @cfg.sqlt?
    throw new L.Dba_cfg_error '^dba@301^', "property `schema` not supported (yet)" if @cfg.schema?
    throw new L.Dba_cfg_error '^dba@302^', "property `path` not supported (yet)"   if @cfg.path?
    bsqlt3_cfg    =
      readonly:       @cfg.readonly
      fileMustExist:  not @cfg.create
      timeout:        @cfg.timeout
      # verbose:        ### TAINT to be done ###
    #.......................................................................................................
    @sqlt = new_bsqlt3_connection '', bsqlt3_cfg
    return undefined

  #---------------------------------------------------------------------------------------------------------
  open: ( cfg ) ->
    validate.dba_open_cfg ( cfg = { L.types.defaults.dba_open_cfg..., cfg..., } )
    { path, schema, ram, }  = cfg
    throw new L.Dba_schema_not_allowed  '^dba@303^', schema if schema in [ 'main', 'temp', ]
    throw new L.Dba_schema_exists       '^dba@304^', schema if @has { schema, }
    #.......................................................................................................
    ### TAINT troublesome logic with `path` and `saveas` ###
    if path?
      saveas  = path
    else
      path    = '' ### TAINT or ':memory:' depending on `cfg.disk` ###
      saveas  = null
    #.......................................................................................................
    if ram then @_open_file_db_in_ram { path, schema, saveas, }
    else        @_attach              { path, schema, saveas, }
    #.......................................................................................................
    return null

  #---------------------------------------------------------------------------------------------------------
  _open_file_db_in_ram: ( cfg ) ->
    ### Given a `path` and a `schema`, create a temporary schema to open the file DB in as well as an empty
    in-memory schema; then copy all DB objects and their contents from the temporary file schema to the RAM
    schema. Finally, detach the file schema. Ensure the `path` given is kept around as the `saveas`
    (implicit) path to be used for eventual persistency (`dba.save()`). ###
    ### TAINT validate? ###
    { path, schema, saveas, } = cfg
    #.......................................................................................................
    if L.types.isa.dba_ram_path path
      @_attach { schema, path, saveas, }
      return null
    #.......................................................................................................
    tmp_schema = @_get_free_temp_schema()
    @_attach { schema: tmp_schema, path, }
    @_attach { schema, path: '', saveas, }
    @_copy_schema { from_schema: tmp_schema, to_schema: schema, }
    @_detach { schema: tmp_schema, }
    #.......................................................................................................
    return null

  #---------------------------------------------------------------------------------------------------------
  is_ram_db: ( cfg ) ->
    validate.dba_is_ram_db_cfg ( cfg = { L.types.defaults.dba_is_ram_db_cfg..., cfg..., } )
    { schema } = cfg
    sql = "select file from pragma_database_list where name = ? limit 1;"
    try
      return L.types.isa.dba_ram_path @single_value @query sql, [ schema, ]
    catch error
      throw new L.Dba_schema_unknown '^dba@305^', schema if error instanceof L.Dba_expected_one_row
      throw error

  #---------------------------------------------------------------------------------------------------------
  _list_temp_schema_numbers: ->
    matcher = @cfg._temp_prefix + '%'
    sql     = """
      select
          cast( substring( name, ? ) as integer ) as n
        from pragma_database_list
        where name like ?;"""
    return @all_first_values @query sql, [ @cfg._temp_prefix.length + 1, matcher, ]

  #---------------------------------------------------------------------------------------------------------
  _max_temp_schema_number: ->
    matcher = @cfg._temp_prefix + '%'
    sql     = """
      select
          max( cast( substring( name, ? ) as integer ) ) as n
        from pragma_database_list
        where name like ?;"""
    return ( @first_value @query sql, [ @cfg._temp_prefix.length + 1, matcher, ] ) ? 0

  #---------------------------------------------------------------------------------------------------------
  _get_free_temp_schema: -> @cfg._temp_prefix + "#{( @_max_temp_schema_number() + 1 )}"

  #---------------------------------------------------------------------------------------------------------
  import: ( cfg ) ->
    cfg         = { L.types.defaults.dba_import_cfg..., cfg..., }
    cfg.format ?= L._get_format cfg.path, cfg.format
    validate.dba_import_cfg cfg
    switch cfg.format
      when 'db'   then @_import_db  cfg
      when 'sql'  then @_import_sql cfg
      else
        throw new L.Dba_import_format_unknown '^dba@306^', format
    return null

  #---------------------------------------------------------------------------------------------------------
  _import_db: ( cfg ) ->
    tmp_schema = @_get_free_temp_schema()
    @_attach { schema: tmp_schema, path: cfg.path, }
    debug '^469465^', @list_schemas()
    @_attach { schema: cfg.schema, path: '', }
    debug '^469465^', @list_schemas()
    @copy_schema { from_schema: tmp_schema, to_schema: cfg.schema, }
    @_detach { schema: tmp_schema, }
    return null

  #---------------------------------------------------------------------------------------------------------
  _import_sql: ( cfg ) ->
    throw new L.Dba_import_format_unknown '^dba@307^', 'sql'
    # switch cfg.method
    #   when 'single' then return @_import_sql_single cfg
    #   when 'batch'  then return @_import_sql_batch  cfg
    # return null

  #---------------------------------------------------------------------------------------------------------
  _import_sql_single: ( cfg ) ->
    @execute FS.readFileSync cfg.path, { encoding: 'utf-8', }
    return null

  #---------------------------------------------------------------------------------------------------------
  _import_sql_batch: ( cfg ) ->
    for statements from @_walk_batches ( @_walk_statements_from_path cfg.path ), cfg.batch_size
      compound_statement  = statements.join ''
      count              += compound_statement.length
      @execute compound_statement
    return null

  #---------------------------------------------------------------------------------------------------------
  _walk_statements_from_path: ( sql_path ) ->
    ### Given a path, iterate over SQL statements which are signalled by semicolons (`;`) that appear outside
    of literals and comments (and the end of input). ###
    ### thx to https://stackabuse.com/reading-a-file-line-by-line-in-node-js/ ###
    ### thx to https://github.com/nacholibre/node-readlines ###
    readlines       = new ( require 'n-readlines' ) sql_path
    #.......................................................................................................
    cfg           =
      regExp: ( require 'mysql-tokenizer/lib/regexp-sql92' )
    tokenize      = ( require 'mysql-tokenizer' ) cfg
    collector     = null
    stream        = FS.createReadStream sql_path
    #.......................................................................................................
    flush = ->
      R         = collector.join ''
      collector = null
      return R
    #.......................................................................................................
    while ( line = readlines.next() ) isnt false
      for token, cur_idx in tokenize line + '\n'
        if token is ';'
          ( collector ?= [] ).push token
          yield flush()
          continue
        # if token.startsWith '--'
        #   continue
        ( collector ?= [] ).push token
    #.......................................................................................................
    yield flush() if collector?
    return null

  #---------------------------------------------------------------------------------------------------------
  _walk_batches: ( iterator, batch_size = 1 ) ->
    ### Given an iterator and a batch size, iterate over lists of values yielded by the iterator. ###
    batch = null
    for d from iterator
      ( batch ?= [] ).push d
      if batch.length >= batch_size
        yield batch
        batch = null
    yield batch if batch?
    return null


  #=========================================================================================================
  # DEBUGGING
  #---------------------------------------------------------------------------------------------------------
  _echo: ( ref, sql ) ->
    return null unless @_dbg.echo
    echo ( CND.reverse CND.blue "^icql@888-#{ref}^" ) + ( CND.reverse CND.yellow sql )
    return null

  #---------------------------------------------------------------------------------------------------------
  _debug: ( P... ) ->
    return null unless @_dbg.debug
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
    throw new L.Dba_expected_one_row 'dba@763^', 0 if ( R = @first_row iterator ) is undefined
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
  _get_foreign_key_state: -> not not ( @pragma "foreign_keys;" )[ 0 ].foreign_keys

  #---------------------------------------------------------------------------------------------------------
  _set_foreign_key_state: ( onoff ) ->
    validate.boolean onoff
    @pragma "foreign_keys = #{onoff};"
    return null


  #=========================================================================================================
  # DB STRUCTURE REPORTING
  #---------------------------------------------------------------------------------------------------------
  catalog: ->
    ### TAINT kludge: we sort by descending types so views, tables come before indexes (b/c you can't drop a
    primary key index in SQLite) ###
    throw new L.Dba_not_implemented '^dba@308^', "method dba.catalog()"
    @query "select * from sqlite_schema order by type desc, name;"

  #---------------------------------------------------------------------------------------------------------
  walk_objects: ( cfg ) ->
    schema      = L.pick cfg, 'schema',     null
    ordering    = L.pick cfg, '_ordering',  null
    return @_walk_all_objects() unless schema?
    validate_optional.ic_schema schema
    validate_optional.dba_list_objects_ordering ordering
    schema_i    = @as_identifier  schema
    schema_s    = @as_sql         schema
    ordering_x  = if ( ordering is 'drop' ) then 'desc' else 'asc'
    seq         = @first_value @query "select seq from pragma_database_list where name = #{schema_s};"
    #.......................................................................................................
    return @query """
      select
          #{seq}    as seq,
          #{schema_s} as schema,
          name      as name,
          type      as type,
          sql       as sql
        from #{schema_i}.sqlite_schema
        order by seq, type #{ordering_x}, name;"""

  #---------------------------------------------------------------------------------------------------------
  _walk_all_objects: ->
    schemas   = {}
    parts     = []
    #.......................................................................................................
    ### TAINT use API ###
    for row from @query "select seq, name, file as path from pragma_database_list order by seq;"
      schemas[ row.name ] = row
    #.......................................................................................................
    for schema, d of schemas
      schema_i    = @as_identifier  schema
      schema_s  = @as_sql         schema
      parts.push """select
          #{d.seq} as seq,
          #{schema_s} as schema,
          name  as name,
          type  as type,
          sql   as sql
        from #{schema_i}.sqlite_schema as d1"""
    parts     = parts.join " union all\n"
    #.......................................................................................................
    sql       = ''
    sql      += parts
    sql      += "\norder by seq, type, name;"
    return @query sql

  #---------------------------------------------------------------------------------------------------------
  is_empty: ( cfg ) ->
    schema      = L.pick cfg, 'schema', 'main', 'ic_schema'
    name        = L.pick cfg, 'name', null
    validate_optional.ic_name name
    return ( has_schema = @_is_empty_schema @as_identifier schema ) unless name?
    throw new L.Dba_not_implemented '^dba@309^', "dba.is_empty() for anything but schemas (got #{rpr cfg})"

  #---------------------------------------------------------------------------------------------------------
  _is_empty_schema: ( schema_i ) -> (
    @list @query "select 1 from #{schema_i}.sqlite_schema limit 1;" ).length is 0

  #---------------------------------------------------------------------------------------------------------
  list_schemas:       -> @list @query "select * from pragma_database_list order by name;"
  list_schema_names:  -> ( d.name for d in @list_schemas() )

  #---------------------------------------------------------------------------------------------------------
  has: ( cfg ) ->
    schema = L.pick cfg, 'schema', null, 'ic_schema'
    return schema in @list_schema_names()

  #---------------------------------------------------------------------------------------------------------
  get_schemas: ->
    R             = {}
    R[ row.name ] = row.file for row from @query "select * from pragma_database_list order by seq;"
    return R

  #---------------------------------------------------------------------------------------------------------
  _path_of_schema: ( schema, fallback = L._misfit ) ->
    R = @first_value @query "select file from pragma_database_list where name = ?;", [ schema, ]
    return R if R?
    return fallback unless fallback is L._misfit
    throw new L.Dba_schema_unknown '^dba@310^', schema

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
  # ### TAINT Error: index associated with UNIQUE or PRIMARY KEY constraint cannot be dropped ###
  # clear: ( cfg ) ->
  #   validate.ic_schema schema
  #   schema_i      = @as_identifier schema
  #   R             = 0
  #   fk_state      = @_get_foreign_key_state()
  #   @_set_foreign_key_state off
  #   for { type, name, } in @list @walk_objects { schema, _ordering: 'drop', }
  #     statement = "drop #{type} if exists #{@as_identifier name};"
  #     @execute statement
  #     R += +1
  #   @_set_foreign_key_state fk_state
  #   return R

  #---------------------------------------------------------------------------------------------------------
  _attach: ( cfg ) ->
    validate.dba_attach_cfg ( cfg = { L.types.defaults.dba_attach_cfg..., cfg..., } )
    { path, schema, saveas, }   = cfg
    #.......................................................................................................
    if @has { schema, }
      throw new L.Dba_schema_exists '^dba@311^', schema
    #.......................................................................................................
    try
      @run "attach ? as ?;", [ path, schema, ]
    catch error
      throw error unless error.code is 'SQLITE_ERROR'
      throw new L.Dba_sqlite_too_many_dbs '^dba@312^', schema if error.message.startsWith 'too many attached databases'
      throw new L.Dba_sqlite_error        '^dba@313^', error
    @_schemas = lets @_schemas, ( d ) => d[ schema ] = { path: saveas, }
    return null

  #---------------------------------------------------------------------------------------------------------
  _detach: ( cfg ) ->
    schema        = L.pick cfg, 'schema', null, 'ic_schema'
    schema_i      = @as_identifier  schema
    @execute "detach #{schema_i};"
    @_schemas     = lets @_schemas, ( d ) => delete d[ schema ]
    return null


  #=========================================================================================================
  # IN-MEMORY PROCESSING
  #-----------------------------------------------------------------------------------------------------------
  _move_schema: ( cfg ) -> @_copy_or_move_schema cfg, true
  _copy_schema: ( cfg ) -> @_copy_or_move_schema cfg, false

  #-----------------------------------------------------------------------------------------------------------
  _copy_or_move_schema: ( cfg, detach_schema = false ) ->
    detach_from_schema = ->
      return null unless detach_schema
      return @_detach { schema: from_schema, }
    #.......................................................................................................
    validate.copy_or_move_schema_cfg ( cfg = { L.types.defaults.copy_or_move_schema_cfg..., cfg..., } )
    { from_schema, to_schema, } = cfg
    #.......................................................................................................
    if from_schema is to_schema
      throw new L.Dba_schema_repeated '^dba@314^', from_schema
    #.......................................................................................................
    known_schemas     = @list_schema_names()
    throw new L.Dba_schema_unknown '^dba@315^', from_schema unless from_schema in known_schemas
    throw new L.Dba_schema_unknown '^dba@316^', to_schema   unless to_schema   in known_schemas
    #.......................................................................................................
    to_schema_objects = @list @walk_objects { schema: to_schema, }
    if to_schema_objects.length > 0
      throw new L.Dba_schema_nonempty '^dba@317^', to_schema
    #.......................................................................................................
    from_schema_objects = @list @walk_objects { schema: from_schema }
    return detach_from_schema() if from_schema_objects.length is 0
    #.......................................................................................................
    to_schema_x   = @as_identifier to_schema
    from_schema_x = @as_identifier from_schema
    inserts       = []
    fk_state      = @_get_foreign_key_state()
    @_set_foreign_key_state off
    #.......................................................................................................
    for d in from_schema_objects
      continue if ( not d.sql? ) or ( d.sql is '' )
      continue if d.name in [ 'sqlite_sequence', ]
      #.....................................................................................................
      ### TAINT consider to use `validate.ic_db_object_type` ###
      unless d.type in [ 'table', 'view', 'index', ]
        throw new L.Dba_unexpected_db_object_type '^dba@318^', d.type, d
      #.....................................................................................................
      ### TAINT using not-so reliable string replacement as substitute for proper parsing ###
      name_x  = @as_identifier d.name
      sql     = d.sql.replace /\s*CREATE\s*(TABLE|INDEX|VIEW)\s*/i, "create #{d.type} #{to_schema_x}."
      #.....................................................................................................
      if sql is d.sql
        throw new L.Dba_unexpected_sql '^dba@319^', d.sql
      #.....................................................................................................
      @execute sql
      if d.type is 'table'
        inserts.push "insert into #{to_schema_x}.#{name_x} select * from #{from_schema_x}.#{name_x};"
    #.......................................................................................................
    @execute sql for sql in inserts
    @_set_foreign_key_state fk_state
    @pragma "#{@as_identifier to_schema}.foreign_key_check;" if fk_state
    return detach_from_schema()

  # #---------------------------------------------------------------------------------------------------------
  # export: ( cfg ) ->
  #   ### TAINT add boolean `cfg.overwrite` ###
  #   format    = @_format_from_path path
  #   format   ?= L.pick cfg, 'format',     format, 'ic_db_file_format'
  #   schema_i  = @as_identifier schema
  #   switch format
  #     when 'sqlitedb'
  #       db.$.run "vacuum #{schema_i} into ?;", [ path, ]
  #     else throw new L.Dba_error "µ47492 unknown format #{rpr format}"
  #   return null


  #=========================================================================================================
  # SQL CONSTRUCTION
  #---------------------------------------------------------------------------------------------------------
  as_identifier:  ( x  ) ->
    validate.text x
    return '"' + ( x.replace /"/g, '""' ) + '"'

  #---------------------------------------------------------------------------------------------------------
  escape_text: ( x ) ->
    validate.text x
    return x.replace /'/g, "''"

  #---------------------------------------------------------------------------------------------------------
  list_as_json: ( x ) ->
    validate.list x
    return JSON.stringify x

  #---------------------------------------------------------------------------------------------------------
  as_sql: ( x ) ->
    switch type = type_of x
      when 'text'       then return "'#{@escape_text x}'"
      when 'list'       then return "'#{@list_as_json x}'"
      when 'float'      then return x.toString()
      when 'boolean'    then return ( if x then '1' else '0' )
      when 'null'       then return 'null'
    throw new L.Dba_sql_value_error '^dba@320^', type, x

  #---------------------------------------------------------------------------------------------------------
  interpolate: ( sql, Q ) -> sql.replace @_interpolation_pattern, ( $0, $1 ) => @as_sql Q[ $1 ]
      # try
      #   return @as_sql Q[ $1 ]
      # catch error
      #   throw new L.Dba_error \
      #     "µ773 when trying to express placeholder #{rpr $1} as SQL literal, an error occurred: #{rpr error.message}"
  _interpolation_pattern: /// \$ (?: ( .+? ) \b | \{ ( [^}]+ ) \} ) ///g


  #=========================================================================================================
  # SORTABLE LISTS
  #---------------------------------------------------------------------------------------------------------
  as_hollerith:   ( x ) -> HOLLERITH.encode x
  from_hollerith: ( x ) -> HOLLERITH.decode x


