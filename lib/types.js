(function() {
  'use strict';
  var CND, Dba, Intertype, _import_formats, alert, badge, debug, help, info, intertype, jr, rpr, urge, warn, whisper;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'MKTS-PARSER/TYPES';

  debug = CND.get_logger('debug', badge);

  alert = CND.get_logger('alert', badge);

  whisper = CND.get_logger('whisper', badge);

  warn = CND.get_logger('warn', badge);

  help = CND.get_logger('help', badge);

  urge = CND.get_logger('urge', badge);

  info = CND.get_logger('info', badge);

  jr = JSON.stringify;

  Intertype = (require('intertype')).Intertype;

  intertype = new Intertype(module.exports);

  Dba = null;

  //-----------------------------------------------------------------------------------------------------------
  this.declare('icql_settings', {
    tests: {
      "x is a object": function(x) {
        return this.isa.object(x);
      },
      // "x has key 'db_path'":                    ( x ) -> @has_key             x, 'db_path'
      // "x has key 'icql_path'":                  ( x ) -> @has_key             x, 'icql_path'
      "x.db_path is a nonempty text": function(x) {
        return this.isa.nonempty_text(x.db_path);
      },
      "x.icql_path is a nonempty text": function(x) {
        return this.isa.nonempty_text(x.icql_path);
      },
      "x.echo? is a boolean": function(x) {
        return this.isa_optional.boolean(x.echo);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('ic_entry_type', {
    tests: {
      "x is a text": function(x) {
        return this.isa.text(x);
      },
      "x is in 'procedure', 'query', 'fragment'": function(x) {
        return x === 'procedure' || x === 'query' || x === 'fragment';
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('ic_schema', function(x) {
    if (!this.isa.text(x)) {
      /* NOTE to keep things simple, only allow lower case ASCII letters, digits, underscores in schemas */
      return false;
    }
    return /^[a-z_][a-z0-9_]*$/.test(x);
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('ic_not_temp_schema', function(x) {
    return (this.isa.ic_schema(x)) && (x !== 'temp');
  });

  this.declare('ic_path', function(x) {
    return this.isa.text(x);
  });

  this.declare('ic_name', function(x) {
    return this.isa.nonempty_text(x);
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba_ram_path', function(x) {
    return x === null || x === '' || x === ':memory:';
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba_constructor_cfg', {
    tests: {
      "x is an object": function(x) {
        return this.isa.object(x);
      },
      "x._temp_prefix is a ic_schema": function(x) {
        return this.isa.ic_schema(x._temp_prefix);
      },
      "@isa.boolean x.readonly": function(x) {
        return this.isa.boolean(x.readonly);
      },
      "@isa.boolean x.create": function(x) {
        return this.isa.boolean(x.create);
      },
      "@isa.boolean x.overwrite": function(x) {
        return this.isa.boolean(x.overwrite);
      },
      /* TAINT possibly `timout: 0` could be valid */
      "@isa.positive_float x.timeout": function(x) {
        return this.isa.positive_float(x.timeout);
      },
      // "@isa.ic_not_temp_schema x.schema":     ( x ) -> @isa.ic_not_temp_schema x.schema
      "@isa_optional.ic_path x.path": function(x) {
        return this.isa_optional.ic_path(x.path);
      },
      "@isa.boolean x.ram": function(x) {
        return this.isa.boolean(x.ram);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba_open_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.ic_not_temp_schema x.schema": function(x) {
        return this.isa.ic_not_temp_schema(x.schema);
      },
      "@isa_optional.ic_path x.path": function(x) {
        return this.isa_optional.ic_path(x.path);
      },
      "@isa.boolean x.ram": function(x) {
        return this.isa.boolean(x.ram);
      }
    }
  });

  // "@isa.boolean x.overwrite":             ( x ) -> @isa.boolean x.overwrite
  // "@isa.boolean x.create":                ( x ) -> @isa.boolean x.create

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba_create_function_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.nonempty_text x.name": function(x) {
        return this.isa.nonempty_text(x.name);
      },
      "@isa.function x.call": function(x) {
        return this.isa.function(x.call);
      },
      "@isa.boolean x.deterministic": function(x) {
        return this.isa.boolean(x.deterministic);
      },
      "@isa.boolean x.varargs": function(x) {
        return this.isa.boolean(x.varargs);
      },
      "@isa.boolean x.directOnly": function(x) {
        return this.isa.boolean(x.directOnly);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba_create_aggregate_function_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.nonempty_text x.name": function(x) {
        return this.isa.nonempty_text(x.name);
      },
      // "@isa.any x.start":               ( x ) -> @isa.any x.start
      "@isa.function x.step": function(x) {
        return this.isa.function(x.step);
      },
      "@isa.boolean x.deterministic": function(x) {
        return this.isa.boolean(x.deterministic);
      },
      "@isa.boolean x.varargs": function(x) {
        return this.isa.boolean(x.varargs);
      },
      "@isa.boolean x.directOnly": function(x) {
        return this.isa.boolean(x.directOnly);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba_create_window_function_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.nonempty_text x.name": function(x) {
        return this.isa.nonempty_text(x.name);
      },
      // "@isa.any x.start":                 ( x ) -> @isa.any x.start
      "@isa.function x.step": function(x) {
        return this.isa.function(x.step);
      },
      "@isa.function x.inverse": function(x) {
        return this.isa.function(x.inverse);
      },
      "@isa_optional.function x.result": function(x) {
        return this.isa_optional.function(x.result);
      },
      "@isa.boolean x.deterministic": function(x) {
        return this.isa.boolean(x.deterministic);
      },
      "@isa.boolean x.varargs": function(x) {
        return this.isa.boolean(x.varargs);
      },
      "@isa.boolean x.directOnly": function(x) {
        return this.isa.boolean(x.directOnly);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba_create_table_function_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.nonempty_text x.name": function(x) {
        return this.isa.nonempty_text(x.name);
      },
      "@isa_optional.list x.columns": function(x) {
        return this.isa_optional.list(x.columns);
      },
      "@isa_optional.list x.parameters": function(x) {
        return this.isa_optional.list(x.parameters);
      },
      "@isa.generatorfunction x.rows": function(x) {
        return this.isa.generatorfunction(x.rows);
      },
      "@isa.boolean x.deterministic": function(x) {
        return this.isa.boolean(x.deterministic);
      },
      "@isa.boolean x.varargs": function(x) {
        return this.isa.boolean(x.varargs);
      },
      "@isa.boolean x.directOnly": function(x) {
        return this.isa.boolean(x.directOnly);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba_create_virtual_table_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.nonempty_text x.name": function(x) {
        return this.isa.nonempty_text(x.name);
      },
      "@isa.function x.create": function(x) {
        return this.isa.function(x.create);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba_import_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.ic_not_temp_schema x.schema": function(x) {
        return this.isa.ic_not_temp_schema(x.schema);
      },
      "@isa.ic_path x.path": function(x) {
        return this.isa.ic_path(x.path);
      },
      "@isa_optional.dba_format x.format": function(x) {
        return this.isa_optional.dba_format(x.format);
      },
      "x.method in [ 'single', 'batch', ]": function(x) {
        var ref;
        return (ref = x.method) === 'single' || ref === 'batch';
      },
      "@isa_optional.positive_integer x.batch_size": function(x) {
        return this.isa_optional.positive_integer(x.batch_size);
      }
    }
  });

  // "x.overwrite is a boolean":             ( x ) -> @isa.boolean x.overwrite

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba_import_cfg_csv', {
    tests: {
      "@isa.dba_import_cfg x": function(x) {
        return this.isa.dba_import_cfg(x);
      },
      "@isa.ic_name x.table_name": function(x) {
        return this.isa.ic_name(x.table_name);
      },
      /* NOTE see `_import_csv()`; for now only RAM DBs allowed for imported CSV */
      "@isa.true x.ram": function(x) {
        return this.isa.true(x.ram);
      },
      // "@isa.boolean x.skip_first":                    ( x ) -> @isa.boolean x.skip_first
      // "@isa.boolean x.skip_empty":                    ( x ) -> @isa.boolean x.skip_empty
      // "@isa.boolean x.skip_blank":                    ( x ) -> @isa.boolean x.skip_blank
      "@isa.boolean x.skip_any_null": function(x) {
        return this.isa.boolean(x.skip_any_null);
      },
      "@isa.boolean x.skip_all_null": function(x) {
        return this.isa.boolean(x.skip_all_null);
      },
      "@isa.boolean x.trim": function(x) {
        return this.isa.boolean(x.trim);
      },
      "@isa.any x.default_value": function(x) {
        return true;
      },
      "@isa_optional.object x._extra": function(x) {
        return this.isa_optional.object(x._extra);
      },
      "x.table is deprecated": function(x) {
        return x.table === void 0;
      },
      "x.columns is deprecated": function(x) {
        return x.columns === void 0;
      },
      "x.transform is a function (sync or async)": function(x) {
        if (x.transform == null) {
          return true;
        }
        if (this.isa.asyncfunction(x.transform)) {
          return true;
        }
        if (this.isa.function(x.transform)) {
          return true;
        }
        return false;
      },
      "x.skip_comments is a boolean or a nonempty_text": function(x) {
        return (this.isa.boolean(x.skip_comments)) || (this.isa.nonempty_text(x.skip_comments));
      },
      "optional input_columns isa nonempty list of nonempty text": function(x) {
        var d;
        ({
          input_columns: d
        } = x);
        if (d == null) {
          return true;
        }
        if (d === true) {
          return true;
        }
        if (!this.isa.list(d)) {
          return false;
        }
        if (!(d.length > 0)) {
          return false;
        }
        if (!this.isa_list_of.nonempty_text(d)) {
          return false;
        }
        return true;
      },
      "optional table_columns isa nonempty list of nonempty text": function(x) {
        var d, k, v;
        ({
          table_columns: d
        } = x);
        if (d == null) {
          return true;
        }
        switch (this.type_of(d)) {
          case 'list':
            if (!(d.length > 0)) {
              return false;
            }
            if (!this.isa_list_of.nonempty_text(d)) {
              return false;
            }
            break;
          case 'object':
            k = (function() {
              var results;
              results = [];
              for (k in d) {
                v = d[k];
                results.push(k);
              }
              return results;
            })();
            if (!(k.length > 0)) {
              return false;
            }
            if (!this.isa_list_of.nonempty_text(k)) {
              return false;
            }
            v = (function() {
              var results;
              results = [];
              for (k in d) {
                v = d[k];
                results.push(v);
              }
              return results;
            })();
            if (!(v.length > 0)) {
              return false;
            }
            if (!this.isa_list_of.nonempty_text(v)) {
              return false;
            }
            break;
          default:
            return false;
        }
        return true;
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba_import_cfg_csv_extra', {
    tests: {
      /* see https://csv.js.org/parse/options/ */
      /* relying on `csv-parse` to do the right thing */
      "@isa_optional.object x": function(x) {
        return this.isa_optional.object(x);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba_save_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.ic_not_temp_schema x.schema": function(x) {
        return this.isa.ic_not_temp_schema(x.schema);
      },
      "@isa_optional.ic_path x.path": function(x) {
        return this.isa_optional.ic_path(x.path);
      },
      "@isa_optional.dba_format x.format": function(x) {
        return this.isa_optional.dba_format(x.format);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba_vacuum_atomically', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.ic_not_temp_schema x.schema": function(x) {
        return this.isa.ic_not_temp_schema(x.schema);
      },
      "@isa_optional.ic_path x.path": function(x) {
        return this.isa_optional.ic_path(x.path);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba_export_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.ic_not_temp_schema x.schema": function(x) {
        return this.isa.ic_not_temp_schema(x.schema);
      },
      "@isa.ic_path x.path": function(x) {
        return this.isa.ic_path(x.path);
      },
      "@isa_optional.dba_format x.format": function(x) {
        return this.isa_optional.dba_format(x.format);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba_attach_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.ic_not_temp_schema x.schema": function(x) {
        return this.isa.ic_not_temp_schema(x.schema);
      },
      "@isa.ic_path x.path": function(x) {
        return this.isa.ic_path(x.path);
      },
      "( x.saveas is null ) or @isa.ic_path x.saveas": function(x) {
        return (x.saveas === null) || this.isa.ic_path(x.saveas);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('copy_or_move_schema_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.ic_not_temp_schema x.from_schema": function(x) {
        return this.isa.ic_not_temp_schema(x.from_schema);
      },
      "@isa.ic_not_temp_schema x.to_schema": function(x) {
        return this.isa.ic_not_temp_schema(x.to_schema);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba_is_ram_db_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.ic_schema x.schema": function(x) {
        return this.isa.ic_schema(x.schema);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba_detach_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.ic_schema x.schema": function(x) {
        return this.isa.ic_schema(x.schema);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba_has_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.ic_schema x.schema": function(x) {
        return this.isa.ic_schema(x.schema);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba_is_empty_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.ic_schema x.schema": function(x) {
        return this.isa.ic_schema(x.schema);
      },
      "@isa.nonempty_text x.name": function(x) {
        return this.isa_optional.ic_name(x.name);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba_clear_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.ic_schema x.schema": function(x) {
        return this.isa.ic_schema(x.schema);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba_walk_objects_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.ic_schema x.schema": function(x) {
        return this.isa.ic_schema(x.schema);
      },
      "x._ordering is optionally 'drop'": function(x) {
        return (x._ordering == null) || (x._ordering === 'drop');
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba_type_of_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.ic_schema x.schema": function(x) {
        return this.isa.ic_schema(x.schema);
      },
      "@isa.nonempty_text x.name": function(x) {
        return this.isa_optional.ic_name(x.name);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba_fields_of_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.ic_schema x.schema": function(x) {
        return this.isa.ic_schema(x.schema);
      },
      "@isa.nonempty_text x.name": function(x) {
        return this.isa_optional.ic_name(x.name);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba_field_names_of_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.ic_schema x.schema": function(x) {
        return this.isa.ic_schema(x.schema);
      },
      "@isa.nonempty_text x.name": function(x) {
        return this.isa_optional.ic_name(x.name);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('sql_limit', function(x) {
    if (x == null) {
      return true;
    }
    if (this.isa.nonempty_text(x)) {
      return true;
    }
    if (this.isa.cardinal(x)) {
      return true;
    }
    return false;
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba_dump_relation_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.ic_schema x.schema": function(x) {
        return this.isa.ic_schema(x.schema);
      },
      "@isa.nonempty_text x.name": function(x) {
        return this.isa_optional.ic_name(x.name);
      },
      "@isa.nonempty_text x.order_by": function(x) {
        return this.isa.nonempty_text(x.order_by);
      },
      "@isa.sql_limit x.limit": function(x) {
        return this.isa.sql_limit(x.limit);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba', {
    tests: {
      "x instanceof Dba": function(x) {
        return x instanceof (Dba != null ? Dba : Dba = (require('./main')).Dba);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba_with_transaction_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "x.mode in [ 'deferred', 'immediate', 'exclusive', ]": function(x) {
        var ref;
        return (ref = x.mode) === 'deferred' || ref === 'immediate' || ref === 'exclusive';
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba_create_stdlib_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.ic_schema x.prefix": function(x) {
        return this.isa.ic_schema(x.prefix);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.defaults = {
    //.........................................................................................................
    dba_constructor_cfg: {
      _temp_prefix: '_dba_temp_',
      readonly: false,
      create: true,
      overwrite: false,
      timeout: 5000,
      // schema:       'main'
      path: null,
      ram: false
    },
    //.........................................................................................................
    dba_attach_cfg: {
      schema: null,
      path: '',
      saveas: null
    },
    //.........................................................................................................
    dba_detach_cfg: {
      schema: null
    },
    //.........................................................................................................
    dba_has_cfg: {
      schema: null
    },
    //.........................................................................................................
    dba_open_cfg: {
      schema: 'main',
      path: null,
      ram: false
    },
    // overwrite:  false
    // create:     true
    //.........................................................................................................
    dba_export_cfg: {
      schema: null,
      path: null,
      format: null
    },
    //.........................................................................................................
    dba_save_cfg: {
      schema: null,
      path: null,
      format: null
    },
    //.........................................................................................................
    dba_create_function_cfg: {
      deterministic: true,
      varargs: false,
      directOnly: false
    },
    //.........................................................................................................
    dba_create_aggregate_function_cfg: {
      deterministic: true,
      varargs: false,
      directOnly: false,
      start: null
    },
    //.........................................................................................................
    dba_create_window_function_cfg: {
      deterministic: true,
      varargs: false,
      directOnly: false,
      start: null
    },
    //.........................................................................................................
    dba_create_table_function_cfg: {
      deterministic: true,
      varargs: false,
      directOnly: false
    },
    //.........................................................................................................
    dba_create_virtual_table_cfg: {},
    //.........................................................................................................
    dba_vacuum_atomically: {
      schema: null,
      path: null
    },
    //.........................................................................................................
    dba_import_cfg: {
      schema: null,
      path: null,
      format: null,
      method: 'single',
      batch_size: 1000
    },
    //.........................................................................................................
    dba_import_cfg_csv: {
      table_name: 'main',
      transform: null,
      _extra: null,
      skip_any_null: false,
      skip_all_null: false,
      skip_comments: false,
      trim: true,
      default_value: null
    },
    // skip_first:       false
    // skip_empty:       true
    // skip_blank:       true
    //.........................................................................................................
    dba_import_cfg_csv_extra: {
      /* see https://github.com/mafintosh/csv-parser#options */
      headers: false, // Array[String] | Boolean
      escape: '"', // String, default: "
      // mapHeaders:       null        # Function
      // mapValues:        null        # Function (not used as it calls for each cell instead of for each row)
      newline: '\n', // String, default: '\n'
      quote: '"', // String, default: '"'
      raw: false, // Boolean, default: false
      separator: ',', // String, Default: ','
      skipComments: false, // Boolean | String, default: false
      skipLines: 0, // Number, default: 0
      maxRowBytes: 2e308, // Number, Default: Number.MAX_SAFE_INTEGER
      strict: false // Boolean, default: false
    },
    //.........................................................................................................
    dba_import_cfg_tsv_extra: {
      /* see https://github.com/mafintosh/csv-parser#options */
      headers: false, // Array[String] | Boolean
      escape: '', // String, default: "
      // mapHeaders:       null        # Function
      // mapValues:        null        # Function (not used as it calls for each cell instead of for each row)
      newline: '\n', // String, default: '\n'
      quote: '', // String, default: '"'
      raw: false, // Boolean, default: false
      separator: '\t', // String, Default: ','
      skipComments: false, // Boolean | String, default: false
      skipLines: 0, // Number, default: 0
      maxRowBytes: 2e308, // Number, Default: Number.MAX_SAFE_INTEGER
      strict: false // Boolean, default: false
    },
    //.........................................................................................................
    copy_or_move_schema_cfg: {
      from_schema: null,
      to_schema: null
    },
    //.........................................................................................................
    dba_is_ram_db_cfg: {
      schema: null
    },
    //.........................................................................................................
    dba_clear_cfg: {
      schema: null
    },
    //.........................................................................................................
    dba_walk_objects_cfg: {
      schema: null,
      _ordering: null
    },
    //.........................................................................................................
    extensions_and_formats: {
      db: 'sqlite',
      sqlite: 'sqlite',
      sqlitedb: 'sqlite',
      sql: 'sql',
      txt: 'tsv',
      tsv: 'tsv',
      csv: 'csv'
    },
    //.........................................................................................................
    dba_type_of_cfg: {
      schema: null,
      name: null
    },
    //.........................................................................................................
    dba_fields_of_cfg: {
      schema: null,
      name: null
    },
    //.........................................................................................................
    dba_field_names_of_cfg: {
      schema: null,
      name: null
    },
    //.........................................................................................................
    dba_dump_relation_cfg: {
      schema: null,
      name: null,
      order_by: 'random()',
      limit: 10
    },
    //.........................................................................................................
    dba_with_transaction_cfg: {
      mode: 'deferred'
    },
    //.........................................................................................................
    dba_create_stdlib_cfg: {
      prefix: 'std_'
    }
  };

  //-----------------------------------------------------------------------------------------------------------
  this._import_formats = _import_formats = new Set(Object.keys(this.defaults.extensions_and_formats));

  this.declare('dba_format', function(x) {
    return _import_formats.has(x);
  });

}).call(this);

//# sourceMappingURL=types.js.map