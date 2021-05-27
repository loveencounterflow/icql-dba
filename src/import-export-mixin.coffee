

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
  _import_csv: ( cfg ) ->
    ### TAINT always requires `ram: true` ###
    ### TAINT no streaming, no batching ###
    ### TAINT no configurable CSV parsing ###
    parse       = require 'csv-parse/lib/sync'
    cfg         = {
      @types.defaults.dba_import_cfg...,
      @types.defaults.dba_import_cfg_csv...,
      cfg..., }
    @types.validate.dba_import_cfg_csv cfg
    { path
      schema
      transform
      _extra
      table }   = cfg
    csv_cfg     = { @types.defaults.dba_import_cfg_csv_extra..., _extra..., }
    @types.validate.dba_import_cfg_csv_extra csv_cfg
    source      = FS.readFileSync path, { encoding: 'utf-8', }
    rows        = parse source, csv_cfg
    #.......................................................................................................
    unless rows.length > 0
      throw new E.Dba_empty_csv '^dba@333^', path
    #.......................................................................................................
    columns = ( k for k of rows[ 0 ] )
    columns = transform { columns, } if transform?
    @_attach { schema, ram: true, }
    insert  = @_create_csv_table { schema, table, columns, }
    #.......................................................................................................
    for row in rows
      if transform?
        if @types.isa.list ( subrows = transform { row, } )
          for subrow in subrows
            insert.run ( subrow[ column ] for column in columns )
        else
          insert.run ( subrows[ column ] for column in columns )
        continue
      insert.run ( row[ column ] for column in columns )
    return null

  #---------------------------------------------------------------------------------------------------------
  _create_csv_table: ( cfg ) ->
    { schema
      table
      columns }     = cfg
    schema_i        = @as_identifier schema
    table_i         = @as_identifier table
    columns_i       = ( @as_identifier d for d in columns )
    columns_sql     = ( "#{ci} text"  for ci in columns_i ).join ', '
    placeholder_sql = ( "?"           for ci in columns_i ).join ', '
    create_sql      = "create table #{schema_i}.#{table_i} ( #{columns_sql} );"
    @execute create_sql
    #.......................................................................................................
    return @prepare "insert into #{schema_i}.#{table_i} values ( #{placeholder_sql} );"

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
