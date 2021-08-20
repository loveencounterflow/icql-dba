(function() {
  'use strict';
  var CND, badge, debug, rpr;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'ICQL-DBA/ERRORS';

  debug = CND.get_logger('debug', badge);

  // warn                      = CND.get_logger 'warn',      badge
  // info                      = CND.get_logger 'info',      badge
  // urge                      = CND.get_logger 'urge',      badge
  // help                      = CND.get_logger 'help',      badge
  // whisper                   = CND.get_logger 'whisper',   badge
  // echo                      = CND.echo.bind CND

  //-----------------------------------------------------------------------------------------------------------
  this.Dba_error = class Dba_error extends Error {
    constructor(ref, message) {
      super();
      this.message = `${ref} (${this.constructor.name}) ${message}`;
      this.ref = ref;
      return void 0/* always return `undefined` from constructor */;
    }

  };

  //-----------------------------------------------------------------------------------------------------------
  this.Dba_cfg_error = class Dba_cfg_error extends this.Dba_error {
    constructor(ref, message) {
      super(ref, message);
    }

  };

  this.Dba_schema_exists = class Dba_schema_exists extends this.Dba_error {
    constructor(ref, schema) {
      super(ref, `schema ${rpr(schema)} already exists`);
    }

  };

  this.Dba_schema_unknown = class Dba_schema_unknown extends this.Dba_error {
    constructor(ref, schema) {
      super(ref, `schema ${rpr(schema)} does not exist`);
    }

  };

  this.Dba_object_unknown = class Dba_object_unknown extends this.Dba_error {
    constructor(ref, schema, name) {
      super(ref, `object ${rpr(schema + '.' + name)} does not exist`);
    }

  };

  this.Dba_schema_nonempty = class Dba_schema_nonempty extends this.Dba_error {
    constructor(ref, schema) {
      super(ref, `schema ${rpr(schema)} isn't empty`);
    }

  };

  this.Dba_schema_not_allowed = class Dba_schema_not_allowed extends this.Dba_error {
    constructor(ref, schema) {
      super(ref, `schema ${rpr(schema)} not allowed here`);
    }

  };

  this.Dba_schema_repeated = class Dba_schema_repeated extends this.Dba_error {
    constructor(ref, schema) {
      super(ref, `unable to copy schema to itself, got ${rpr(schema)}`);
    }

  };

  this.Dba_expected_one_row = class Dba_expected_one_row extends this.Dba_error {
    constructor(ref, row_count) {
      super(ref, `expected 1 row, got ${row_count}`);
    }

  };

  this.Dba_extension_unknown = class Dba_extension_unknown extends this.Dba_error {
    constructor(ref, path) {
      super(ref, `extension of path ${path} is not registered for any format`);
    }

  };

  this.Dba_not_implemented = class Dba_not_implemented extends this.Dba_error {
    constructor(ref, what) {
      super(ref, `${what} isn't implemented (yet)`);
    }

  };

  this.Dba_deprecated = class Dba_deprecated extends this.Dba_error {
    constructor(ref, what) {
      super(ref, `${what} has been deprecated`);
    }

  };

  this.Dba_unexpected_db_object_type = class Dba_unexpected_db_object_type extends this.Dba_error {
    constructor(ref, type, value) {
      super(ref, `µ769 unknown type ${rpr(type)} of DB object ${d}`);
    }

  };

  this.Dba_sql_value_error = class Dba_sql_value_error extends this.Dba_error {
    constructor(ref, type, value) {
      super(ref, `unable to express a ${type} as SQL literal, got ${rpr(value)}`);
    }

  };

  this.Dba_sql_not_a_list_error = class Dba_sql_not_a_list_error extends this.Dba_error {
    constructor(ref, type, value) {
      super(ref, `expected a list, got a ${type}`);
    }

  };

  this.Dba_unexpected_sql = class Dba_unexpected_sql extends this.Dba_error {
    constructor(ref, sql) {
      super(ref, `unexpected SQL string ${rpr(sql)}`);
    }

  };

  this.Dba_sqlite_too_many_dbs = class Dba_sqlite_too_many_dbs extends this.Dba_error {
    constructor(ref, schema) {
      super(ref, `unable to attach schema ${rpr(schema)}: too many attached databases`);
    }

  };

  this.Dba_sqlite_error = class Dba_sqlite_error extends this.Dba_error {
    constructor(ref, error) {
      var ref1;
      super(ref, `${(ref1 = error.code) != null ? ref1 : 'SQLite error'}: ${error.message}`);
    }

  };

  this.Dba_no_arguments_allowed = class Dba_no_arguments_allowed extends this.Dba_error {
    constructor(ref, name, arity) {
      super(ref, `method ${name} doesn't take arguments, got ${arity}`);
    }

  };

  this.Dba_argument_not_allowed = class Dba_argument_not_allowed extends this.Dba_error {
    constructor(ref, name, value) {
      super(ref, `argument ${name} not allowed, got ${rpr(value)}`);
    }

  };

  this.Dba_empty_csv = class Dba_empty_csv extends this.Dba_error {
    constructor(ref, path) {
      super(ref, `no CSV records found in file ${path}`);
    }

  };

  this.Dba_interpolation_format_unknown = class Dba_interpolation_format_unknown extends this.Dba_error {
    constructor(ref, format) {
      super(ref, `unknown interpolation format ${rpr(format)}`);
    }

  };

  /* TAINT replace with more specific error, like below */
  this.Dba_format_unknown = class Dba_format_unknown extends this.Dba_error {
    constructor(ref, format) {
      super(ref, `unknown DB format ${ref(format)}`);
    }

  };

  this.Dba_import_format_unknown = class Dba_import_format_unknown extends this.Dba_error {
    constructor(ref, format) {
      var formats;
      formats = [...(require('./types'))._import_formats].join(', ');
      super(ref, `unknown import format ${rpr(format)} (known formats are ${formats})`);
    }

  };

}).call(this);

//# sourceMappingURL=errors.js.map