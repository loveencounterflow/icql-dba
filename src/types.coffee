


'use strict'


############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'MKTS-PARSER/TYPES'
debug                     = CND.get_logger 'debug',     badge
alert                     = CND.get_logger 'alert',     badge
whisper                   = CND.get_logger 'whisper',   badge
warn                      = CND.get_logger 'warn',      badge
help                      = CND.get_logger 'help',      badge
urge                      = CND.get_logger 'urge',      badge
info                      = CND.get_logger 'info',      badge
jr                        = JSON.stringify
Intertype                 = ( require 'intertype' ).Intertype
intertype                 = new Intertype module.exports
Dba                       = null

#-----------------------------------------------------------------------------------------------------------
@declare 'icql_settings',
  tests:
    "x is a object":                          ( x ) -> @isa.object          x
    # "x has key 'db_path'":                    ( x ) -> @has_key             x, 'db_path'
    # "x has key 'icql_path'":                  ( x ) -> @has_key             x, 'icql_path'
    "x.db_path is a nonempty text":           ( x ) -> @isa.nonempty_text x.db_path
    "x.icql_path is a nonempty text":         ( x ) -> @isa.nonempty_text x.icql_path
    "x.echo? is a boolean":                   ( x ) -> @isa_optional.boolean x.echo

#-----------------------------------------------------------------------------------------------------------
@declare 'ic_entry_type',
  tests:
    "x is a text":                              ( x ) -> @isa.text    x
    "x is in 'procedure', 'query', 'fragment'": ( x ) -> x in [ 'procedure', 'query', 'fragment', ]

#-----------------------------------------------------------------------------------------------------------
@declare 'ic_schema', ( x ) ->
  ### NOTE to keep things simple, only allow lower case ASCII letters, digits, underscores in schemas ###
  return false unless @isa.text x
  return ( /^[a-z_][a-z0-9_]*$/ ).test x

#-----------------------------------------------------------------------------------------------------------
@declare 'ic_not_temp_schema',  ( x ) -> ( @isa.ic_schema x ) and ( x isnt 'temp' )
@declare 'ic_path',             ( x ) -> @isa.text x
@declare 'ic_name',             ( x ) -> @isa.nonempty_text x

#-----------------------------------------------------------------------------------------------------------
@declare 'dba_ram_path',        ( x ) -> x in [ null, '', ':memory:', ]

#-----------------------------------------------------------------------------------------------------------
@declare 'dba_list_objects_ordering', ( x ) -> ( not x? ) or ( x is 'drop' )

#-----------------------------------------------------------------------------------------------------------
@declare 'dba_constructor_cfg', tests:
  "x is an object":                       ( x ) -> @isa.object          x
  "x._temp_prefix is a ic_schema":        ( x ) -> @isa.ic_schema       x._temp_prefix

#-----------------------------------------------------------------------------------------------------------
@declare 'dba_open_cfg', tests:
  "@isa.object x":                        ( x ) -> @isa.object x
  "@isa.ic_not_temp_schema x.schema":     ( x ) -> @isa.ic_not_temp_schema x.schema
  "@isa_optional.ic_path x.path":         ( x ) -> @isa_optional.ic_path x.path
  "@isa.boolean x.ram":                   ( x ) -> @isa.boolean x.ram
  # "@isa.boolean x.overwrite":             ( x ) -> @isa.boolean x.overwrite
  # "@isa.boolean x.create":                ( x ) -> @isa.boolean x.create

#-----------------------------------------------------------------------------------------------------------
@declare 'dba_import_cfg', tests:
  "@isa.object x":                                ( x ) -> @isa.object x
  "@isa.ic_not_temp_schema x.schema":             ( x ) -> @isa.ic_not_temp_schema x.schema
  "@isa.ic_path x.path":                          ( x ) -> @isa.ic_path x.path
  "@isa_optional.dba_format x.format":            ( x ) -> @isa_optional.dba_format x.format
  "x.method in [ 'single', 'batch', ]":           ( x ) -> x.method in [ 'single', 'batch', ]
  "@isa_optional.positive_integer x.batch_size":  ( x ) -> @isa_optional.positive_integer x.batch_size
  # "x.overwrite is a boolean":             ( x ) -> @isa.boolean x.overwrite

#-----------------------------------------------------------------------------------------------------------
@declare 'dba_import_cfg_csv', tests:
  "@isa.dba_import_cfg x":                        ( x ) -> @isa.dba_import_cfg x
  "@isa.ic_name x.table_name":                    ( x ) -> @isa.ic_name x.table_name
  ### NOTE see `_import_csv()`; for now only RAM DBs allowed for imported CSV ###
  "@isa.true x.ram":                              ( x ) -> @isa.true x.ram
  # "@isa.boolean x.skip_first":                    ( x ) -> @isa.boolean x.skip_first
  # "@isa.boolean x.skip_empty":                    ( x ) -> @isa.boolean x.skip_empty
  # "@isa.boolean x.skip_blank":                    ( x ) -> @isa.boolean x.skip_blank
  "@isa.boolean x.skip_any_null":                 ( x ) -> @isa.boolean x.skip_any_null
  "@isa.boolean x.skip_all_null":                 ( x ) -> @isa.boolean x.skip_all_null
  "@isa.boolean x.trim":                          ( x ) -> @isa.boolean x.trim
  "@isa.any x.default_value":                     ( x ) -> true
  "@isa_optional.object x._extra":                ( x ) -> @isa_optional.object x._extra
  "x.table is deprecated":                        ( x ) -> x.table is undefined
  "x.columns is deprecated":                      ( x ) -> x.columns is undefined
  "x.transform is a function (sync or async)":    ( x ) ->
    return true if ( not x.transform? )
    return true if @isa.asyncfunction x.transform
    return true if @isa.function x.transform
    return false
  "x.skip_comments is a boolean or a nonempty_text": ( x ) ->
    ( @isa.boolean x.skip_comments ) or ( @isa.nonempty_text x.skip_comments )
  "optional input_columns isa nonempty list of nonempty text": ( x ) ->
    { input_columns: d, } = x
    return true if not d?
    return true if d is true
    return false unless @isa.list d
    return false unless d.length > 0
    return false unless @isa_list_of.nonempty_text d
    return true
  "optional table_columns isa nonempty list of nonempty text": ( x ) ->
    { table_columns: d, } = x
    return true if not d?
    switch @type_of d
      when 'list'
        return false unless d.length > 0
        return false unless @isa_list_of.nonempty_text d
      when 'object'
        k = ( k for k, v of d )
        return false unless k.length > 0
        return false unless @isa_list_of.nonempty_text k
        v = ( v for k, v of d )
        return false unless v.length > 0
        return false unless @isa_list_of.nonempty_text v
      else
        return false
    return true

#-----------------------------------------------------------------------------------------------------------
@declare 'dba_import_cfg_csv_extra', tests:
  ### see https://csv.js.org/parse/options/ ###
  ### relying on `csv-parse` to do the right thing ###
  "@isa_optional.object x":                       ( x ) -> @isa_optional.object x

#-----------------------------------------------------------------------------------------------------------
@declare 'dba_save_cfg', tests:
  "@isa.object x":                               ( x ) -> @isa.object x
  "@isa.ic_not_temp_schema x.schema":            ( x ) -> @isa.ic_not_temp_schema x.schema
  "@isa_optional.ic_path x.path":                ( x ) -> @isa_optional.ic_path x.path
  "@isa_optional.dba_format x.format":           ( x ) -> @isa_optional.dba_format x.format

#-----------------------------------------------------------------------------------------------------------
@declare 'dba_vacuum_atomically', tests:
  "@isa.object x":                               ( x ) -> @isa.object x
  "@isa.ic_not_temp_schema x.schema":            ( x ) -> @isa.ic_not_temp_schema x.schema
  "@isa_optional.ic_path x.path":                ( x ) -> @isa_optional.ic_path x.path

#-----------------------------------------------------------------------------------------------------------
@declare 'dba_export_cfg', tests:
  "@isa.object x":                               ( x ) -> @isa.object x
  "@isa.ic_not_temp_schema x.schema":            ( x ) -> @isa.ic_not_temp_schema x.schema
  "@isa.ic_path x.path":                         ( x ) -> @isa.ic_path x.path
  "@isa_optional.dba_format x.format":           ( x ) -> @isa_optional.dba_format x.format

#-----------------------------------------------------------------------------------------------------------
@declare 'dba_attach_cfg', tests:
  "@isa.object x":                                  ( x ) -> @isa.object x
  "@isa.ic_not_temp_schema x.schema":               ( x ) -> @isa.ic_not_temp_schema x.schema
  "@isa.ic_path x.path":                            ( x ) -> @isa.ic_path x.path
  "( x.saveas is null ) or @isa.ic_path x.saveas":  ( x ) -> ( x.saveas is null ) or @isa.ic_path x.saveas

#-----------------------------------------------------------------------------------------------------------
@declare 'copy_or_move_schema_cfg', tests:
  "@isa.object x":                          ( x ) -> @isa.object x
  "@isa.ic_not_temp_schema x.from_schema":  ( x ) -> @isa.ic_not_temp_schema x.from_schema
  "@isa.ic_not_temp_schema x.to_schema":    ( x ) -> @isa.ic_not_temp_schema x.to_schema

#-----------------------------------------------------------------------------------------------------------
@declare 'dba_is_ram_db_cfg', tests:
  "@isa.object x":                          ( x ) -> @isa.object x
  "@isa.ic_schema x.schema":                ( x ) -> @isa.ic_schema x.schema

#-----------------------------------------------------------------------------------------------------------
@declare 'dba', tests:
  "x instanceof Dba":                     ( x ) -> x instanceof ( Dba ?= ( require './main' ).Dba )

#-----------------------------------------------------------------------------------------------------------
@defaults =
  #.........................................................................................................
  dba_constructor_cfg:
    _temp_prefix: '_dba_temp_'
    readonly:     false
    create:       true
    overwrite:    false
    timeout:      5000
  #.........................................................................................................
  dba_attach_cfg:
    schema:     null
    path:       ''
    saveas:     null
  #.........................................................................................................
  dba_open_cfg:
    schema:     null
    path:       null
    ram:        false
    # overwrite:  false
    # create:     true
  #.........................................................................................................
  dba_export_cfg:
    schema:     null
    path:       null
    format:     null
  #.........................................................................................................
  dba_save_cfg:
    schema:     null
    path:       null
    format:     null
  #.........................................................................................................
  dba_vacuum_atomically:
    schema:     null
    path:       null
  #.........................................................................................................
  dba_import_cfg:
    schema:     null
    path:       null
    format:     null
    method:     'single'
    batch_size: 1000
  #.........................................................................................................
  dba_import_cfg_csv:
    table_name:       'main'
    transform:        null
    _extra:           null
    skip_any_null:    false
    skip_all_null:    false
    skip_comments:    false
    trim:             true
    default_value:    null
    # skip_first:       false
    # skip_empty:       true
    # skip_blank:       true
  #.........................................................................................................
  dba_import_cfg_csv_extra:
    ### see https://github.com/mafintosh/csv-parser#options ###
    headers:          false       # Array[String] | Boolean
    escape:           '"'         # String, default: "
    # mapHeaders:       null        # Function
    # mapValues:        null        # Function (not used as it calls for each cell instead of for each row)
    newline:          '\n'        # String, default: '\n'
    quote:            '"'         # String, default: '"'
    raw:              false       # Boolean, default: false
    separator:        ','         # String, Default: ','
    skipComments:     false       # Boolean | String, default: false
    skipLines:        0           # Number, default: 0
    maxRowBytes:      Infinity    # Number, Default: Number.MAX_SAFE_INTEGER
    strict:           false       # Boolean, default: false
  #.........................................................................................................
  dba_import_cfg_tsv_extra:
    ### see https://github.com/mafintosh/csv-parser#options ###
    headers:          false       # Array[String] | Boolean
    escape:           ''          # String, default: "
    # mapHeaders:       null        # Function
    # mapValues:        null        # Function (not used as it calls for each cell instead of for each row)
    newline:          '\n'        # String, default: '\n'
    quote:            ''          # String, default: '"'
    raw:              false       # Boolean, default: false
    separator:        '\t'         # String, Default: ','
    skipComments:     false       # Boolean | String, default: false
    skipLines:        0           # Number, default: 0
    maxRowBytes:      Infinity    # Number, Default: Number.MAX_SAFE_INTEGER
    strict:           false       # Boolean, default: false
  #.........................................................................................................
  copy_or_move_schema_cfg:
    from_schema:  null
    to_schema:    null
  #.........................................................................................................
  dba_is_ram_db_cfg:
    schema:       null
  #.........................................................................................................
  extensions_and_formats:
    db:           'sqlite'
    sqlite:       'sqlite'
    sqlitedb:     'sqlite'
    sql:          'sql'
    txt:          'tsv'
    tsv:          'tsv'
    csv:          'csv'


#-----------------------------------------------------------------------------------------------------------
@_import_formats = _import_formats = new Set Object.keys @defaults.extensions_and_formats
@declare 'dba_format', ( x ) -> _import_formats.has x




