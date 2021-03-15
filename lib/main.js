(function() {
  'use strict';
  var CND, FS, HOLLERITH, IC, assign, badge, debug, declare, echo, help, info, inspect, isa, jr, local_methods, max_excerpt_length, rpr, size_of, type_of, urge, validate, warn, whisper, xrpr;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'ICQL/MAIN';

  debug = CND.get_logger('debug', badge);

  warn = CND.get_logger('warn', badge);

  info = CND.get_logger('info', badge);

  urge = CND.get_logger('urge', badge);

  help = CND.get_logger('help', badge);

  whisper = CND.get_logger('whisper', badge);

  echo = CND.echo.bind(CND);

  //...........................................................................................................
  // PATH                      = require 'path'
  // PD                        = require 'pipedreams'
  // { $
  //   $async
  //   select }                = PD
  ({assign, jr} = CND);

  // #...........................................................................................................
  // join_path                 = ( P... ) -> PATH.resolve PATH.join P...
  // boolean_as_int            = ( x ) -> if x then 1 else 0
  ({inspect} = require('util'));

  xrpr = function(x) {
    return inspect(x, {
      colors: true,
      breakLength: 2e308,
      maxArrayLength: 2e308,
      depth: 2e308
    });
  };

  //...........................................................................................................
  FS = require('fs');

  IC = require('intercourse');

  this.HOLLERITH = HOLLERITH = require('hollerith-codec');

  //...........................................................................................................
  this.types = require('./types');

  ({isa, validate, declare, size_of, type_of} = this.types);

  max_excerpt_length = 10000;

  //===========================================================================================================
  // LOCAL METHODS
  //-----------------------------------------------------------------------------------------------------------
  local_methods = {
    //---------------------------------------------------------------------------------------------------------
    _echo: function(me, ref, sql) {
      if (!me.$.settings.echo) {
        return null;
      }
      echo((CND.reverse(CND.blue(`^icql@888-${ref}^`))) + (CND.reverse(CND.yellow(sql))));
      return null;
    },
    //---------------------------------------------------------------------------------------------------------
    limit: function*(me, n, iterator) {
      var count, x;
      count = 0;
      for (x of iterator) {
        if (count >= n) {
          return;
        }
        count += +1;
        yield x;
      }
    },
    //---------------------------------------------------------------------------------------------------------
    single_row: function(me, iterator) {
      var R;
      if ((R = this.first_row(iterator)) === void 0) {
        throw new Error("µ33833 expected at least one row, got none");
      }
      return R;
    },
    //---------------------------------------------------------------------------------------------------------
    all_first_values: function(me, iterator) {
      var R, key, row, value;
      R = [];
      for (row of iterator) {
        for (key in row) {
          value = row[key];
          R.push(value);
          break;
        }
      }
      return R;
    },
    //---------------------------------------------------------------------------------------------------------
    first_values: function*(me, iterator) {
      var R, key, row, value;
      R = [];
      for (row of iterator) {
        for (key in row) {
          value = row[key];
          yield value;
        }
      }
      return R;
    },
    //---------------------------------------------------------------------------------------------------------
    first_row: function(me, iterator) {
      var row;
      for (row of iterator) {
        return row;
      }
    },
    /* TAINT must ensure order of keys in row is same as order of fields in query */
    single_value: function(me, iterator) {
      var key, ref1, value;
      ref1 = this.single_row(iterator);
      for (key in ref1) {
        value = ref1[key];
        return value;
      }
    },
    first_value: function(me, iterator) {
      var key, ref1, value;
      ref1 = this.first_row(iterator);
      for (key in ref1) {
        value = ref1[key];
        return value;
      }
    },
    all_rows: function(me, iterator) {
      return [...iterator];
    },
    //---------------------------------------------------------------------------------------------------------
    query: function(me, sql, ...P) {
      var base, statement;
      this._echo('1', sql);
      statement = ((base = me.$._statements)[sql] != null ? base[sql] : base[sql] = me.$.db.prepare(sql));
      return statement.iterate(...P);
    },
    //---------------------------------------------------------------------------------------------------------
    run: function(me, sql, ...P) {
      var base, statement;
      this._echo('2', sql);
      statement = ((base = me.$._statements)[sql] != null ? base[sql] : base[sql] = me.$.db.prepare(sql));
      return statement.run(...P);
    },
    //---------------------------------------------------------------------------------------------------------
    _run_or_query: function(me, entry_type, is_last, sql, Q) {
      var base, returns_data, statement;
      this._echo('3', sql);
      statement = ((base = me.$._statements)[sql] != null ? base[sql] : base[sql] = me.$.db.prepare(sql));
      returns_data = statement.reader;
      //.......................................................................................................
      /* Always use `run()` method if statement does not return data: */
      if (!returns_data) {
        if (Q != null) {
          return statement.run(Q);
        } else {
          return statement.run();
        }
      }
      //.......................................................................................................
      /* If statement does return data, consume iterator unless this is the last statement: */
      if ((entry_type === 'procedure') || (!is_last)) {
        if (Q != null) {
          return statement.all(Q);
        } else {
          return statement.all();
        }
      }
      //.......................................................................................................
      /* Return iterator: */
      if (Q != null) {
        return statement.iterate(Q);
      } else {
        return statement.iterate();
      }
    },
    //---------------------------------------------------------------------------------------------------------
    execute: function(me, sql) {
      this._echo('4', sql);
      return me.$.db.exec(sql);
    },
    //---------------------------------------------------------------------------------------------------------
    prepare: function(me, ...P) {
      return me.$.db.prepare(...P);
    },
    aggregate: function(me, ...P) {
      return me.$.db.aggregate(...P);
    },
    backup: function(me, ...P) {
      return me.$.db.backup(...P);
    },
    checkpoint: function(me, ...P) {
      return me.$.db.checkpoint(...P);
    },
    close: function(me, ...P) {
      return me.$.db.close(...P);
    },
    read: function(me, path) {
      return me.$.db.exec(FS.readFileSync(path, {
        encoding: 'utf-8'
      }));
    },
    function: function(me, ...P) {
      return me.$.db.function(...P);
    },
    load: function(me, ...P) {
      return me.$.db.loadExtension(...P);
    },
    pragma: function(me, ...P) {
      return me.$.db.pragma(...P);
    },
    transaction: function(me, ...P) {
      return me.$.db.transaction(...P);
    },
    //.........................................................................................................
    as_identifier: function(me, text) {
      return '"' + (text.replace(/"/g, '""')) + '"';
    },
    /* TAINT kludge: we sort by descending types so views, tables come before indexes (b/c you can't drop a
     primary key index in SQLite) */
    catalog: function(me) {
      return this.query("select * from sqlite_master order by type desc, name;");
    },
    //.........................................................................................................
    list_objects: function(me, schema = 'main') {
      validate.ic_schema(schema);
      return this.query(`select * from ${schema}.sqlite_master order by type desc, name;`);
    },
    list_schemas: function(me) {
      return this.pragma("database_list;");
    },
    //-----------------------------------------------------------------------------------------------------------
    /* TAINT must escape path, schema */
    attach: function(me, path, schema) {
      validate.ic_schema(schema);
      return this.execute(`attach '${path}' as [${schema}];`);
    },
    //-----------------------------------------------------------------------------------------------------------
    type_of: function(me, name, schema = 'main') {
      var ref1, row;
      ref1 = me.$.catalog();
      for (row of ref1) {
        if (row.name === name) {
          return row.type;
        }
      }
      return null;
    },
    //-----------------------------------------------------------------------------------------------------------
    column_types: function(me, table) {
      var R, ref1, row;
      R = {};
      ref1 = me.$.query(me.$.interpolate("pragma table_info( $table );", {table}));
      /* TAINT we apparently have to call the pragma in this roundabout fashion since SQLite refuses to
         accept placeholders in that statement: */
      for (row of ref1) {
        R[row.name] = row.type;
      }
      return R;
    },
    //---------------------------------------------------------------------------------------------------------
    _dependencies_of: function(me, table, schema = 'main') {
      return me.$.query(`pragma ${schema}.foreign_key_list( ${me.$.as_sql(table)} )`);
    },
    //---------------------------------------------------------------------------------------------------------
    dependencies_of: function(me, table, schema = 'main') {
      var row;
      validate.ic_schema(schema);
      return (function() {
        var ref1, results;
        ref1 = me.$._dependencies_of(table);
        results = [];
        for (row of ref1) {
          results.push(row.table);
        }
        return results;
      })();
    },
    //---------------------------------------------------------------------------------------------------------
    get_toposort: function(me, schema = 'main') {
      var LTSORT, R, dependencies, dependency, g, i, indexes, len, name, ref1, types, x;
      LTSORT = require('ltsort');
      g = LTSORT.new_graph();
      indexes = [];
      types = {};
      ref1 = this.list_objects(schema);
      for (x of ref1) {
        types[x.name] = x.type;
        if (x.type !== 'table') {
          indexes.push(x.name);
          continue;
        }
        dependencies = this.dependencies_of(x.name);
        if (dependencies.length === 0) {
          LTSORT.add(g, x.name);
        } else {
          for (i = 0, len = dependencies.length; i < len; i++) {
            dependency = dependencies[i];
            LTSORT.add(g, x.name, dependency);
          }
        }
      }
      R = [...(LTSORT.linearize(g)), ...indexes];
      return (function() {
        var j, len1, results;
        results = [];
        for (j = 0, len1 = R.length; j < len1; j++) {
          name = R[j];
          results.push({
            name,
            type: types[name]
          });
        }
        return results;
      })();
    },
    //---------------------------------------------------------------------------------------------------------
    clear: function(me) {
      var count, i, len, name, ref1, statement, type;
      count = 0;
      ref1 = this.get_toposort();
      for (i = 0, len = ref1.length; i < len; i++) {
        ({type, name} = ref1[i]);
        statement = `drop ${type} if exists ${this.as_identifier(name)};`;
        this.execute(statement);
        count += +1;
      }
      return count;
    },
    //---------------------------------------------------------------------------------------------------------
    escape_text: function(me, x) {
      validate.text(x);
      return x.replace(/'/g, "''");
    },
    //---------------------------------------------------------------------------------------------------------
    list_as_json: function(me, x) {
      validate.list(x);
      return jr(x);
    },
    //---------------------------------------------------------------------------------------------------------
    as_sql: function(me, x) {
      var type;
      switch (type = type_of(x)) {
        case 'text':
          return `'${me.$.escape_text(x)}'`;
        case 'list':
          return `'${me.$.list_as_json(x)}'`;
        case 'float':
          return x.toString();
        case 'boolean':
          return (x ? '1' : '0');
        case 'null':
          return 'null';
        case 'undefined':
          throw new Error("µ12341 unable to express 'undefined' as SQL literal");
      }
      throw new Error(`µ12342 unable to express a ${type} as SQL literal, got ${rpr(x)}`);
    },
    //---------------------------------------------------------------------------------------------------------
    interpolate: function(me, sql, Q) {
      return sql.replace(this._interpolation_pattern, ($0, $1) => {
        var error;
        try {
          return me.$.as_sql(Q[$1]);
        } catch (error1) {
          error = error1;
          throw new Error(`µ55563 when trying to express placeholder ${rpr($1)} as SQL literal, an error occurred: ${rpr(error.message)}`);
        }
      });
    },
    _interpolation_pattern: /\$(?:(.+?)\b|\{([^}]+)\})/g,
    //---------------------------------------------------------------------------------------------------------
    as_hollerith: function(me, x) {
      return HOLLERITH.encode(x);
    },
    from_hollerith: function(me, x) {
      return HOLLERITH.decode(x);
    }
  };

  //===========================================================================================================

  //-----------------------------------------------------------------------------------------------------------
  this.bind = function(settings) {
    var connector, me, ref1;
    validate.icql_settings(settings);
    me = {
      $: {
        _statements: {},
        settings
      }
    };
    connector = (ref1 = settings.connector) != null ? ref1 : require('better-sqlite3');
    me.icql_path = settings.icql_path;
    this.connect(me, connector, settings.db_path, settings.db_settings);
    this.definitions_from_path_sync(me, settings.icql_path);
    this.bind_definitions(me);
    this.bind_udfs(me);
    return me;
  };

  //-----------------------------------------------------------------------------------------------------------
  /* TAINT should check connector API compatibility */
  /* TAINT consider to use `new`-less call convention (should be possible acc. to bsql3 docs) */
  this.connect = function(me, connector, db_path, db_settings = {}) {
    if (me.$ == null) {
      me.$ = {};
    }
    me.$.db = new connector(db_path, db_settings);
    // me.$.dbr  = me.$.db
    // me.$.dbw  = new connector db_path, db_settings
    return me;
  };

  //-----------------------------------------------------------------------------------------------------------
  this.definitions_from_path_sync = function(me, icql_path) {
    (me.$ != null ? me.$ : me.$ = {}).sql = IC.definitions_from_path_sync(icql_path);
    return me;
  };

  //-----------------------------------------------------------------------------------------------------------
  this.bind_definitions = function(me) {
    var check_unique, ic_entry, local_method, name, ref1;
    check_unique = function(name) {
      if (me[name] != null) {
        throw new Error(`µ11292 name collision: ${rpr(name)} already defined`);
      }
    };
    if (me.$ == null) {
      me.$ = {};
    }
//.........................................................................................................
    for (name in local_methods) {
      local_method = local_methods[name];
      (function(name, local_method) {
        var method;
        check_unique(name);
        if (isa.function(local_method)) {
          local_method = local_method.bind(me.$);
          method = function(...P) {
            var error, excerpt, ref1, x;
            try {
              return local_method(me, ...P);
            } catch (error1) {
              error = error1;
              excerpt = rpr(P);
              if (excerpt.length > max_excerpt_length) {
                x = max_excerpt_length / 2;
                excerpt = excerpt.slice(0, +x + 1 || 9e9) + ' ... ' + excerpt.slice(excerpt.length - x);
              }
              warn(`^icql#15543^ when trying to call method ${name} with ${excerpt}`);
              warn(`^icql#15544^ an error occurred: ${(ref1 = error.name) != null ? ref1 : error.code}: ${error.message}`);
              throw error;
            }
          };
          return me.$[name] = method.bind(me.$);
        } else {
          return me.$[name] = local_method;
        }
      })(name, local_method);
    }
    ref1 = me.$.sql;
    //.........................................................................................................
    for (name in ref1) {
      ic_entry = ref1[name];
      /* TAINT fix in intercourse */
      ic_entry.name = name;
      check_unique(name);
      me[name] = this._method_from_ic_entry(me, ic_entry);
    }
    //.........................................................................................................
    return me;
  };

  //-----------------------------------------------------------------------------------------------------------
  this.bind_udfs = function(me) {
    me.$.function('as_hollerith', {
      deterministic: true,
      varargs: false
    }, (x) => {
      return HOLLERITH.encode(x);
    });
    me.$.function('from_hollerith', {
      deterministic: true,
      varargs: false
    }, (x) => {
      return HOLLERITH.decode(x);
    });
    return me;
  };

  //-----------------------------------------------------------------------------------------------------------
  this._method_from_ic_entry = function(me, ic_entry) {
    validate.ic_entry_type(ic_entry.type);
    //.........................................................................................................
    if (ic_entry.type === 'fragment') {
      return (Q) => {
        var descriptor, sql;
        descriptor = this._descriptor_from_arguments(me, ic_entry, Q);
        sql = descriptor.parts.join('\n');
        return me.$.interpolate(sql, Q);
      };
    }
    //.........................................................................................................
    return (Q) => {
      var R, descriptor, error, i, idx, is_last, kenning, last_idx, len, line_nr, location, name, part, ref1, type;
      descriptor = this._descriptor_from_arguments(me, ic_entry, Q);
      last_idx = descriptor.parts.length - 1;
      try {
        ref1 = descriptor.parts;
        for (idx = i = 0, len = ref1.length; i < len; idx = ++i) {
          part = ref1[idx];
          is_last = idx === last_idx;
          R = me.$._run_or_query(ic_entry.type, is_last, part, Q);
        }
      } catch (error1) {
        error = error1;
        name = ic_entry.name;
        type = ic_entry.type;
        kenning = descriptor.kenning;
        line_nr = descriptor.location.line_nr;
        location = `line ${line_nr}, ${type} ${name}${kenning}`;
        throw new Error(`µ11123 At *.icql ${location}: ${error.message}`);
      }
      return R;
    };
  };

  //-----------------------------------------------------------------------------------------------------------
  this._descriptor_from_arguments = function(me, ic_entry, Q) {
    var R, is_void_signature, kenning, ref1, signature;
    [signature, kenning] = IC.get_signature_and_kenning(Q);
    is_void_signature = kenning === '()' || kenning === 'null';
    if (is_void_signature) {
      R = (ref1 = ic_entry['()']) != null ? ref1 : ic_entry['null'];
    } else {
      R = ic_entry[kenning];
    }
    if (R == null) {
      R = ic_entry['null'];
    }
    //.........................................................................................................
    if (R == null) {
      throw new Error(`µ93832 calling method ${rpr(ic_entry.name)} with signature ${kenning} not implemented`);
    }
    return R;
  };

}).call(this);

//# sourceMappingURL=main.js.map