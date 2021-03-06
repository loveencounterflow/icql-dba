

'use strict'

############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'ICQL-DBA/IMPORT-EXPORT-MIXIN'
debug                     = CND.get_logger 'debug',     badge
warn                      = CND.get_logger 'warn',      badge
info                      = CND.get_logger 'info',      badge
urge                      = CND.get_logger 'urge',      badge
help                      = CND.get_logger 'help',      badge
whisper                   = CND.get_logger 'whisper',   badge
echo                      = CND.echo.bind CND
#...........................................................................................................
PATH                      = require 'path'
FS                        = require 'fs'
E                         = require './errors'
{ misfit }                = require './common'

# #-----------------------------------------------------------------------------------------------------------
# any_value_null = ( input_columns, object ) ->
#   for k in input_columns
#     return true unless object[ k ]?
#   return false

# #-----------------------------------------------------------------------------------------------------------
# all_values_null = ( input_columns, object ) ->
#   for k in input_columns
#     return false if object[ k ]?
#   return true


#-----------------------------------------------------------------------------------------------------------
@Import_export_mixin = ( clasz = Object ) => class extends clasz

  #---------------------------------------------------------------------------------------------------------
  import: ( cfg ) ->
    cfg         = { @types.defaults.dba_import_cfg..., cfg..., }
    cfg.format ?= @_format_from_path cfg.path
    @types.validate.dba_import_cfg cfg
    switch cfg.format
      # when 'db'   then await @_import_db  cfg
      # when 'sql'  then await @_import_sql cfg
      when 'csv', 'tsv' then await @_import_csv_tsv cfg
      else
        if @types._import_formats.has cfg.format
          throw new E.Dba_not_implemented '^dba@309^', "import format #{rpr cfg.format}"
        throw new E.Dba_import_format_unknown '^dba@309^', cfg.format
    return null


  #=========================================================================================================
  # FORMAT GUESSING
  #---------------------------------------------------------------------------------------------------------
  _extension_from_path: ( path ) -> if ( R = PATH.extname path ) is '' then null else R[ 1 .. ]
  _format_from_path:    ( path ) -> @_formats[ @._extension_from_path path ] ? null

  #---------------------------------------------------------------------------------------------------------
  _is_sqlite3_db: ( path ) ->
    # validate.nonempty_text path
    buffer  = Buffer.alloc 16
    fd      = FS.openSync path
    FS.readSync fd, buffer
    return ( buffer.toString 'utf-8' ) is 'SQLite format 3\x00'

  #---------------------------------------------------------------------------------------------------------
  _import_db: ( cfg ) ->
    tmp_schema = @_get_free_temp_schema()
    @_attach { schema: tmp_schema, path: cfg.path, }
    # debug '^469465^', @list_schemas()
    @_attach { schema: cfg.schema, path: '', }
    # debug '^469465^', @list_schemas()
    @copy_schema { from_schema: tmp_schema, to_schema: cfg.schema, }
    @_detach { schema: tmp_schema, }
    return null

  #---------------------------------------------------------------------------------------------------------
  _import_sql: ( cfg ) ->
    throw new E.Dba_format_unknown '^dba@310^', 'sql'

  #---------------------------------------------------------------------------------------------------------
  _import_csv_tsv: ( cfg ) -> new Promise ( resolve, reject ) =>
    ### TAINT always requires `ram: true` ###
    ### TAINT no streaming, no batching ###
    ### TAINT no configurable CSV parsing ###
    ### NOTE optimisation: instead of n-readlines, use (unpublished) `chunkreader` that reads n bytes,
      only looks for last newline, then parses chunk ###
    ### NOTE optimisation: do not call `insert` for each line, but assemble big `insert .. values (...)`
      statement (as done before, should be fastest) ###
    parse_csv   = require 'csv-parser'
    cfg         = {
      @types.defaults.dba_import_cfg...,
      @types.defaults.dba_import_cfg_csv...,
      cfg..., }
    @types.validate.dba_import_cfg_csv cfg
    { path
      schema
      transform
      input_columns
      table_columns
      skip_any_null
      skip_all_null
      table_name
      _extra  } = cfg
    if cfg.format is 'tsv' then parser_cfg_defaults = @types.defaults.dba_import_cfg_tsv_extra
    else                        parser_cfg_defaults = @types.defaults.dba_import_cfg_csv_extra
    parser_cfg  = {
      parser_cfg_defaults...,
      _extra...,
      columns: input_columns, }
    #.......................................................................................................
    if      input_columns is false  then parser_cfg.headers = false
    else if input_columns is true   then delete parser_cfg.headers
    else parser_cfg.headers = input_columns
    parser_cfg.skipComments = cfg.skip_comments
    @types.validate.dba_import_cfg_csv_extra parser_cfg
    #.......................................................................................................
    stop        = Symbol.for 'stop'
    lnr         = 0
    buffer      = null
    batch_size  = 1_000
    @_attach { schema, ram: true, }
    insert      = null
    is_first    = true
    row_count   = 0
    has_stopped = false
    source      = null
    stream      = null
    #.......................................................................................................
    flush = =>
      return null if has_stopped
      if is_first
        is_first = false
        { insert
          table_columns } = @_create_csv_table { schema, table_name, input_columns, table_columns, }
        # debug '^324^', input_columns
        # debug '^324^', table_columns
      return unless buffer?
      rows    = buffer
      buffer  = null
      #.....................................................................................................
      for row in rows
        row_count++
        unless transform?
          insert.run ( row[ column ] ? null for column of table_columns )
          continue
        #...................................................................................................
        subrows = await transform { row, stop, }
        if subrows is stop
          has_stopped = true
          source.destroy()
          stream.destroy()
          stream.emit 'end'
          return null
        continue unless subrows?
        if @types.isa.list subrows
          for subrow in subrows
            insert.run ( subrow[ column ] for column of table_columns )
          continue
        insert.run ( subrows[ column ] for column of table_columns )
      return null
    # #.......................................................................................................
    # echo '^3423^'
    # ### !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! ###
    # t2 = require '../../hengist/node_modules/through2'
    # ### !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! ###
    # xxx = true
    # xxx = false
    # if xxx
    #   source  = FS.createReadStream path, { highWaterMark: 10, }
    #   stream  = source.pipe t2 ( chunk, encoding, callback ) ->
    #     # debug '^333442^', chunk.length
    #     @push chunk
    #     callback()
    #   stream  = stream.pipe parse_csv parser_cfg
    # else
    source  = FS.createReadStream path
    stream  = source.pipe parse_csv parser_cfg
    #.......................................................................................................
    stream.on 'data', ( row ) =>
      return null if has_stopped
      all_columns_null  = true
      new_row           = {}
      #.....................................................................................................
      for column in input_columns
        v = row[ column ] ? null
        v = v.trim() if v? and cfg.trim
        v = null if v is ''
        if v is null
          return null if skip_any_null
          new_row[ column ] = cfg.default_value
        else
          all_columns_null  = false
          new_row[ column ] = v
      #.....................................................................................................
      return null if skip_all_null and all_columns_null
      ( buffer ?= [] ).push new_row
      await flush() if buffer.length >= batch_size
      return null
    #.......................................................................................................
    stream.on 'headers', ( headers )  => input_columns = headers
    stream.on 'end',                  => await flush(); resolve { row_count, }
    #.......................................................................................................
    return null

  #---------------------------------------------------------------------------------------------------------
  _create_csv_table: ( cfg ) ->
    { schema
      input_columns
      table_columns
      table_name  } = cfg
    #.......................................................................................................
    # debug '^3534^', { table_columns, input_columns, }
    table_columns ?= input_columns
    if @types.isa.list table_columns then do =>
      _tc                 = table_columns
      table_columns       = {}
      table_columns[ k ]  = 'text' for k in _tc
    # debug '^3534^', { table_columns, input_columns, }
    #.......................................................................................................
    schema_i        = @sql.I schema
    table_name_i    = @sql.I table_name
    columns_sql     = ( "#{@sql.I n} #{@sql.I t}" for n, t of table_columns ).join ', '
    placeholder_sql = ( "?"                                       for _    of table_columns ).join ', '
    create_sql      = "create table #{schema_i}.#{table_name_i} ( #{columns_sql} );"
    try @execute create_sql catch error
      warn CND.reverse """when trying to execute SQL:

      #{create_sql}

      an error was encountered: #{error.message}"""
      throw error
    #.......................................................................................................
    insert = @prepare "insert into #{schema_i}.#{table_name_i} values ( #{placeholder_sql} );"
    return { insert, table_columns, }

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
    # stream        = FS.createReadStream sql_path
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
