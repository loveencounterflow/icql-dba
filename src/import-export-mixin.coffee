

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

#-----------------------------------------------------------------------------------------------------------
@Import_export_mixin = ( clasz = Object ) => class extends clasz

  #---------------------------------------------------------------------------------------------------------
  import: ( cfg ) ->
    cfg         = { @types.defaults.dba_import_cfg..., cfg..., }
    cfg.format ?= @_format_from_path cfg.path
    @types.validate.dba_import_cfg cfg
    switch cfg.format
      when 'db'   then @_import_db  cfg
      when 'sql'  then @_import_sql cfg
      when 'csv'  then @_import_csv cfg
      else
        throw new E.Dba_format_unknown '^dba@309^', format
    return null


  #=========================================================================================================
  # FORMAT GUESSING
  #---------------------------------------------------------------------------------------------------------
  _extension_from_path: ( path ) -> if ( R = PATH.extname path ) is '' then null else R[ 1 .. ]
  _format_from_path:    ( path ) -> @_formats[ @._extension_from_path path ] ? null


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
    # switch cfg.method
    #   when 'single' then return @_import_sql_single cfg
    #   when 'batch'  then return @_import_sql_batch  cfg
    # return null

  #---------------------------------------------------------------------------------------------------------
  _columns_from_csv: ( path, csv_cfg ) ->
    readlines   = new ( require 'n-readlines' ) path
    parse       = require 'csv-parse/lib/sync'
    while ( line = readlines.next() ) isnt false
      line = line.toString 'utf-8'
      debug '^33453^', rpr line
      debug '^33453^', parse line, csv_cfg
      break
    return null

  #---------------------------------------------------------------------------------------------------------
  _import_csv: ( cfg ) ->
    ### TAINT always requires `ram: true` ###
    ### TAINT no streaming, no batching ###
    ### TAINT no configurable CSV parsing ###
    ### NOTE optimisation: instead of n-readlines, use (unpublished) `chunkreader` that reads n bytes,
      only looks for last newline, then parses chunk ###
    ### NOTE optimisation: do not call `insert` for each line, but assemble big `insert .. values (...)`
      statement (as done before, should be fastest) ###
    parse       = require 'csv-parse/lib/sync'
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
      skip_first
      skip_empty
      skip_blank
      table_name
      _extra  } = cfg
    csv_cfg     = {
      @types.defaults.dba_import_cfg_csv_extra...,
      _extra...,
      columns: input_columns, }
    if ( csv_cfg.columns is true ) and ( not table_columns? )
      urge '^5675783^', @_columns_from_csv path, csv_cfg
    debug '^675675^', cfg
    debug '^675675^', csv_cfg
    if transform? then csv_cfg.relax_column_count = true
    @types.validate.dba_import_cfg_csv_extra csv_cfg
    readlines   = new ( require 'n-readlines' ) path
    stop        = Symbol.for 'stop'
    lnr         = 0
    buffer      = null
    batch_size  = 10000
    @_attach { schema, ram: true, }
    insert      = null
    is_first    = true
    #.......................................................................................................
    flush = =>
      return unless buffer? and buffer.length > 0
      lines       = buffer
      source      = lines.join '\n'
      buffer      = null
      rows        = parse source, csv_cfg
      row_columns = null
      debug '^38690-1^', { rows, }
      #.....................................................................................................
      for row, row_idx in rows
        # info '^38690^', { row, meta, }
        if is_first
          is_first = false
          # if columns is true
          #   # skip_first  = true
          #   columns     = ( k for k of row )
          # else if ( columns is false ) or ( not columns? )
          debug '^38690-1^', { table_columns, row_columns }
          unless table_columns?
            if @types.isa.list row
              table_columns = ( "c#{col_idx}" for col_idx in [ 1 .. row.length ] )
              row_columns   = [ 0 ... row.length ]
            else
              table_columns = ( k for k of row )
              row_columns   = table_columns
          else
            throw new Error "^4456^ table_columns not implemented"
          debug '^38690-2^', { table_columns, row_columns }
          insert = @_create_csv_table { schema, table_name, table_columns, }
        #...................................................................................................
        unless transform?
          insert.run ( row[ c ] for c in row_columns )
          continue
        line      = lines[ row_idx ].toString 'utf-8'
        lnr++
        continue if skip_empty and line is ''
        continue if skip_blank and /^\s*$/.test line
        subrows   = transform { row, lnr, line, stop, }
        debug '^33442^', { subrows, }
        break if subrows is stop
        continue unless subrows?
        if @types.isa.list subrows
          for subrow in subrows
            insert.run ( subrow[ c ] for c in table_columns )
          continue
        insert.run ( subrows[ c ] for c in table_columns )
      return null
    #.......................................................................................................
    ### TAINT this use of n-readlines is inefficient as it splits the bytes into line-sized chunks which we
    then re-assembly into strings with lines. However, it only takes up a small part of the overall time
    it takes to parse and insert records. ###
    while ( line = readlines.next() ) isnt false
      ( buffer ?= [] ).push line
      flush() if buffer.length >= batch_size
    flush()
    return null

  #---------------------------------------------------------------------------------------------------------
  _create_csv_table: ( cfg ) ->
    { schema
      table_columns
      table_name  } = cfg
    schema_i        = @as_identifier schema
    table_name_i    = @as_identifier table_name
    if @types.isa.list table_columns
      columns_i = ( [ ( @as_identifier d ), "'text'", ] for d in table_columns )
    else
      throw new Error "^69578^ not implemented"
    columns_sql     = ( "#{ni} #{ti}" for [ ni, ti, ] in columns_i ).join ', '
    placeholder_sql = ( "?"           for d           in columns_i ).join ', '
    create_sql      = "create table #{schema_i}.#{table_name_i} ( #{columns_sql} );"
    @execute create_sql
    #.......................................................................................................
    return @prepare "insert into #{schema_i}.#{table_name_i} values ( #{placeholder_sql} );"

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
