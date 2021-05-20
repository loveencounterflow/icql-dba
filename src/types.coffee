


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
@declare 'dba_format', ( x ) -> x in [ 'sql', 'sqlite', ]

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
  "@isa.object x":                               ( x ) -> @isa.object x
  "@isa.ic_not_temp_schema x.schema":            ( x ) -> @isa.ic_not_temp_schema x.schema
  "@isa.ic_path x.path":                         ( x ) -> @isa.ic_path x.path
  "@isa_optional.dba_format x.format":           ( x ) -> @isa_optional.dba_format x.format
  "x.method in [ 'single', 'batch', ]":          ( x ) -> x.method in [ 'single', 'batch', ]
  "@isa_optional.positive_integer x.batch_size": ( x ) -> @isa_optional.positive_integer x.batch_size
  # "x.overwrite is a boolean":             ( x ) -> @isa.boolean x.overwrite

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
    # overwrite:  false
  #.........................................................................................................
  copy_or_move_schema_cfg:
    from_schema:  null
    to_schema:    null
  #.........................................................................................................
  dba_is_ram_db_cfg:
    schema:       null



