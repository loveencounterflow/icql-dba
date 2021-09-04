'use strict'


############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'ICQL-DBA/ERRORS'
debug                     = CND.get_logger 'debug',     badge
# warn                      = CND.get_logger 'warn',      badge
# info                      = CND.get_logger 'info',      badge
# urge                      = CND.get_logger 'urge',      badge
# help                      = CND.get_logger 'help',      badge
# whisper                   = CND.get_logger 'whisper',   badge
# echo                      = CND.echo.bind CND


#-----------------------------------------------------------------------------------------------------------
class @Dba_error extends Error
  constructor: ( ref, message ) ->
    super()
    @message  = "#{ref} (#{@constructor.name}) #{message}"
    @ref      = ref
    return undefined ### always return `undefined` from constructor ###

#-----------------------------------------------------------------------------------------------------------
class @Dba_cfg_error                 extends @Dba_error
  constructor: ( ref, message )     -> super ref, message
class @Dba_schema_exists             extends @Dba_error
  constructor: ( ref, schema )      -> super ref, "schema #{rpr schema} already exists"
class @Dba_schema_unknown            extends @Dba_error
  constructor: ( ref, schema )      -> super ref, "schema #{rpr schema} does not exist"
class @Dba_object_unknown            extends @Dba_error
  constructor: ( ref, schema, name )-> super ref, "object #{rpr schema + '.' + name} does not exist"
class @Dba_schema_nonempty           extends @Dba_error
  constructor: ( ref, schema )      -> super ref, "schema #{rpr schema} isn't empty"
class @Dba_schema_not_allowed        extends @Dba_error
  constructor: ( ref, schema )      -> super ref, "schema #{rpr schema} not allowed here"
class @Dba_schema_repeated           extends @Dba_error
  constructor: ( ref, schema )      -> super ref, "unable to copy schema to itself, got #{rpr schema}"
class @Dba_expected_one_row          extends @Dba_error
  constructor: ( ref, row_count )   -> super ref, "expected 1 row, got #{row_count}"
class @Dba_extension_unknown         extends @Dba_error
  constructor: ( ref, path )        -> super ref, "extension of path #{path} is not registered for any format"
class @Dba_not_implemented           extends @Dba_error
  constructor: ( ref, what )        -> super ref, "#{what} isn't implemented (yet)"
class @Dba_deprecated                extends @Dba_error
  constructor: ( ref, what )        -> super ref, "#{what} has been deprecated"
class @Dba_unexpected_db_object_type extends @Dba_error
  constructor: ( ref, type, value ) -> super ref, "µ769 unknown type #{rpr type} of DB object #{d}"
class @Dba_sql_value_error           extends @Dba_error
  constructor: ( ref, type, value ) -> super ref, "unable to express a #{type} as SQL literal, got #{rpr value}"
class @Dba_sql_not_a_list_error      extends @Dba_error
  constructor: ( ref, type, value ) -> super ref, "expected a list, got a #{type}"
class @Dba_unexpected_sql            extends @Dba_error
  constructor: ( ref, sql )         -> super ref, "unexpected SQL string #{rpr sql}"
class @Dba_sqlite_too_many_dbs       extends @Dba_error
  constructor: ( ref, schema )      -> super ref, "unable to attach schema #{rpr schema}: too many attached databases"
class @Dba_sqlite_error              extends @Dba_error
  constructor: ( ref, error )       -> super ref, "#{error.code ? 'SQLite error'}: #{error.message}"
class @Dba_no_arguments_allowed      extends @Dba_error
  constructor: ( ref, name, arity ) -> super ref, "method #{name} doesn't take arguments, got #{arity}"
class @Dba_argument_not_allowed      extends @Dba_error
  constructor: ( ref, name, value ) -> super ref, "argument #{name} not allowed, got #{rpr value}"
class @Dba_wrong_arity               extends @Dba_error
  constructor: ( ref, name, min, max, found ) -> super ref, "#{name} expected between #{min} and #{max} arguments, got #{found}"
class @Dba_empty_csv                 extends @Dba_error
  constructor: ( ref, path )        -> super ref, "no CSV records found in file #{path}"
class @Dba_interpolation_format_unknown extends @Dba_error
  constructor: ( ref, format )      -> super ref, "unknown interpolation format #{rpr format}"
class @Dba_no_nested_transactions    extends @Dba_error
  constructor: ( ref )              -> super ref, "cannot start a transaction within a transaction"
class @Dba_no_deferred_fks_in_tx     extends @Dba_error
  constructor: ( ref )              -> super ref, "cannot defer foreign keys inside a transaction"

### TAINT replace with more specific error, like below ###
class @Dba_format_unknown extends @Dba_error
  constructor: ( ref, format ) ->
    super ref, "unknown DB format #{ref format}"

class @Dba_import_format_unknown extends @Dba_error
  constructor: ( ref, format ) ->
    formats = [ ( require './types' )._import_formats..., ].join ', '
    super ref, "unknown import format #{rpr format} (known formats are #{formats})"

