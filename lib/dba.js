(function() {
  'use strict';
  var CND, Dba, FS, HOLLERITH, LFT, badge, debug, declare, echo, help, info, isa, rpr, size_of, type_of, urge, validate, warn, whisper,
    indexOf = [].indexOf;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'ICQL/DBA';

  debug = CND.get_logger('debug', badge);

  warn = CND.get_logger('warn', badge);

  info = CND.get_logger('info', badge);

  urge = CND.get_logger('urge', badge);

  help = CND.get_logger('help', badge);

  whisper = CND.get_logger('whisper', badge);

  echo = CND.echo.bind(CND);

  //...........................................................................................................
  FS = require('fs');

  HOLLERITH = require('hollerith-codec');

  //...........................................................................................................
  this.types = require('./types');

  ({isa, validate, declare, size_of, type_of} = this.types);

  LFT = require('letsfreezethat');

  Dba = (function() {
    //===========================================================================================================

    //-----------------------------------------------------------------------------------------------------------
    class Dba {
      //---------------------------------------------------------------------------------------------------------
      /* whether to print additional debugging info */      constructor(cfg) {
        this._statements = {};
        return null;
      }

      //=========================================================================================================
      // DEBUGGING
      //---------------------------------------------------------------------------------------------------------
      _echo(ref, sql) {
        if (!this.settings.echo) {
          return null;
        }
        echo((CND.reverse(CND.blue(`^icql@888-${ref}^`))) + (CND.reverse(CND.yellow(sql))));
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _debug(...P) {
        if (!this.settings.debug) {
          return null;
        }
        debug(...P);
        return null;
      }

      //=========================================================================================================
      // QUERY RESULT ADAPTERS
      //---------------------------------------------------------------------------------------------------------
      * limit(n, iterator) {
        var count, x;
        count = 0;
        for (x of iterator) {
          if (count >= n) {
            return;
          }
          count += +1;
          yield x;
        }
      }

      //---------------------------------------------------------------------------------------------------------
      single_row(iterator) {
        var R;
        if ((R = this.first_row(iterator)) === void 0) {
          throw new Error("µ33833 expected at least one row, got none");
        }
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      all_first_values(iterator) {
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
      }

      //---------------------------------------------------------------------------------------------------------
      * first_values(iterator) {
        var R, key, row, value;
        R = [];
        for (row of iterator) {
          for (key in row) {
            value = row[key];
            yield value;
          }
        }
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      first_row(iterator) {
        var row;
        for (row of iterator) {
          return row;
        }
      }

      /* TAINT must ensure order of keys in row is same as order of fields in query */
      single_value(iterator) {
        var key, ref1, value;
        ref1 = this.single_row(iterator);
        for (key in ref1) {
          value = ref1[key];
          return value;
        }
      }

      first_value(iterator) {
        var key, ref1, value;
        ref1 = this.first_row(iterator);
        for (key in ref1) {
          value = ref1[key];
          return value;
        }
      }

      all_rows(iterator) {
        return [...iterator];
      }

      //=========================================================================================================
      // QUERYING
      //---------------------------------------------------------------------------------------------------------
      query(sql, ...P) {
        var base, statement;
        this._echo('query', sql);
        statement = ((base = this._statements)[sql] != null ? base[sql] : base[sql] = this.db.prepare(sql));
        return statement.iterate(...P);
      }

      //---------------------------------------------------------------------------------------------------------
      run(sql, ...P) {
        var base, statement;
        this._echo('run', sql);
        statement = ((base = this._statements)[sql] != null ? base[sql] : base[sql] = this.db.prepare(sql));
        return statement.run(...P);
      }

      //---------------------------------------------------------------------------------------------------------
      _run_or_query(entry_type, is_last, sql, Q) {
        var base, returns_data, statement;
        this._echo('_run_or_query', sql);
        statement = ((base = this._statements)[sql] != null ? base[sql] : base[sql] = this.db.prepare(sql));
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
      }

      //---------------------------------------------------------------------------------------------------------
      execute(sql) {
        this._echo('execute', sql);
        return this.db.exec(sql);
      }

      //---------------------------------------------------------------------------------------------------------
      prepare(sql) {
        this._echo('prepare', sql);
        return this.db.prepare(sql);
      }

      //=========================================================================================================
      // OTHER
      //---------------------------------------------------------------------------------------------------------
      aggregate(...P) {
        return this.db.aggregate(...P);
      }

      backup(...P) {
        return this.db.backup(...P);
      }

      checkpoint(...P) {
        return this.db.checkpoint(...P);
      }

      close(...P) {
        return this.db.close(...P);
      }

      read(path) {
        return this.db.exec(FS.readFileSync(path, {
          encoding: 'utf-8'
        }));
      }

      function(...P) {
        return this.db.function(...P);
      }

      load(...P) {
        return this.db.loadExtension(...P);
      }

      pragma(...P) {
        return this.db.pragma(...P);
      }

      transaction(...P) {
        return this.db.transaction(...P);
      }

      //=========================================================================================================
      // DB STRUCTURE REPORTING
      //---------------------------------------------------------------------------------------------------------
      catalog() {
        /* TAINT kludge: we sort by descending types so views, tables come before indexes (b/c you can't drop a
           primary key index in SQLite) */
        // throw new Error "µ45222 deprecated until next major version"
        return this.query("select * from sqlite_master order by type desc, name;");
      }

      //---------------------------------------------------------------------------------------------------------
      list_objects(schema = 'main') {
        var schema_x;
        validate.ic_schema(schema);
        schema_x = this.as_identifier(schema);
        return this.all_rows(this.query(`select
    type      as type,
    name      as name,
    sql       as sql
  from ${schema_x}.sqlite_master
  order by type desc, name;`));
      }

      //---------------------------------------------------------------------------------------------------------
      list_objects_2(imagine_options_object_here) {
        var schema_x;
        validate.ic_schema(schema);
        // for schema in @list_schema_names()
        schema_x = this.as_identifier(schema);
        /* thx to https://stackoverflow.com/a/53160348/256361 */
        return `select
  m.name as table_name,
  p.name as column_name
from
  ${schema_x}.sqlite_master as m
join
  ${schema_x}.pragma_table_info( m.name ) as p
order by
  m.name,
  p.cid;`;
      }

      //---------------------------------------------------------------------------------------------------------
      // list_schemas:       -> @pragma "database_list;"
      list_schemas() {
        return this.all_rows(this.query("select * from pragma_database_list order by name;"));
      }

      list_schema_names() {
        var d, i, len, ref1, results;
        ref1 = this.list_schemas();
        results = [];
        for (i = 0, len = ref1.length; i < len; i++) {
          d = ref1[i];
          results.push(d.name);
        }
        return results;
      }

      //---------------------------------------------------------------------------------------------------------
      type_of(name, schema = 'main') {
        var ref1, row;
        ref1 = this.catalog();
        for (row of ref1) {
          if (row.name === name) {
            return row.type;
          }
        }
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      column_types(table) {
        var R, ref1, row;
        R = {};
        ref1 = this.query(this.interpolate("pragma table_info( $table );", {table}));
        /* TAINT we apparently have to call the pragma in this roundabout fashion since SQLite refuses to
           accept placeholders in that statement: */
        for (row of ref1) {
          R[row.name] = row.type;
        }
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      _dependencies_of(table, schema = 'main') {
        return this.query(`pragma ${this.as_identifier(schema)}.foreign_key_list( ${this.as_identifier(table)} )`);
      }

      //---------------------------------------------------------------------------------------------------------
      dependencies_of(table, schema = 'main') {
        var row;
        validate.ic_schema(schema);
        return (function() {
          var ref1, results;
          ref1 = this._dependencies_of(table);
          results = [];
          for (row of ref1) {
            results.push(row.table);
          }
          return results;
        }).call(this);
      }

      //---------------------------------------------------------------------------------------------------------
      get_toposort(schema = 'main') {
        var LTSORT, R, dependencies, dependency, g, i, indexes, len, name, ref1, sqls, types, x;
        LTSORT = require('ltsort');
        g = LTSORT.new_graph();
        indexes = [];
        types = {};
        sqls = {};
        ref1 = this.list_objects(schema);
        for (x of ref1) {
          types[x.name] = x.type;
          sqls[x.name] = x.sql;
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
              type: types[name],
              sql: sqls[name]
            });
          }
          return results;
        })();
      }

      //=========================================================================================================
      // DB STRUCTURE MODIFICATION
      //---------------------------------------------------------------------------------------------------------
      clear() {
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
      }

      //---------------------------------------------------------------------------------------------------------
      attach(path, schema) {
        validate.ic_path(path);
        validate.ic_schema(schema);
        return this.execute(`attach ${this.as_sql(path)} as ${this.as_identifier(schema)};`);
      }

      //=========================================================================================================
      // IN-MEMORY PROCESSING
      //-----------------------------------------------------------------------------------------------------------
      copy_schema(from_schema, to_schema) {
        var d, from_schema_x, i, inserts, j, len, len1, name_x, ref1, ref2, ref3, schemas, sql, to_schema_x;
        schemas = this.list_schema_names();
        inserts = [];
        validate.ic_schema(from_schema);
        validate.ic_schema(to_schema);
        if (indexOf.call(schemas, from_schema) < 0) {
          throw new Error(`µ57873 unknown schema ${rpr(from_schema)}`);
        }
        if (indexOf.call(schemas, to_schema) < 0) {
          throw new Error(`µ57873 unknown schema ${rpr(to_schema)}`);
        }
        this.pragma(`${this.as_identifier(to_schema)}.foreign_keys = off;`);
        to_schema_x = this.as_identifier(to_schema);
        from_schema_x = this.as_identifier(from_schema);
        ref1 = this.list_objects(from_schema);
        //.......................................................................................................
        for (i = 0, len = ref1.length; i < len; i++) {
          d = ref1[i];
          this._debug('^44463^', "DB object:", d);
          if ((d.sql == null) || (d.sql === '')) {
            continue;
          }
          if ((ref2 = d.name) === 'sqlite_sequence') {
            continue;
          }
          //.....................................................................................................
          /* TAINT consider to use `validate.ic_db_object_type` */
          if ((ref3 = d.type) !== 'table' && ref3 !== 'view' && ref3 !== 'index') {
            throw new Error(`µ49888 unknown type ${rpr(d.type)} for DB object ${rpr(d)}`);
          }
          //.....................................................................................................
          /* TAINT using not-so reliable string replacement as substitute for proper parsing */
          name_x = this.as_identifier(d.name);
          sql = d.sql.replace(/\s*CREATE\s*(TABLE|INDEX|VIEW)\s*/i, `create ${d.type} ${to_schema_x}.`);
          //.....................................................................................................
          if (sql === d.sql) {
            throw new Error(`µ49889 unexpected SQL string ${rpr(d.sql)}`);
          }
          //.....................................................................................................
          this.execute(sql);
          if (d.type === 'table') {
            inserts.push(`insert into ${to_schema_x}.${name_x} select * from ${from_schema_x}.${name_x};`);
          }
        }
        //.......................................................................................................
        this._debug('^49864^', "starting with inserts");
        this._debug('^49864^', `objects in ${rpr(from_schema)}: ${rpr(((function() {
          var j, len1, ref4, results;
          ref4 = this.list_objects(from_schema);
          results = [];
          for (j = 0, len1 = ref4.length; j < len1; j++) {
            d = ref4[j];
            results.push(`(${d.type})${d.name}`);
          }
          return results;
        }).call(this)).join(', '))}`);
        this._debug('^49864^', `objects in ${rpr(to_schema)}:   ${rpr(((function() {
          var j, len1, ref4, results;
          ref4 = this.list_objects(to_schema);
          results = [];
          for (j = 0, len1 = ref4.length; j < len1; j++) {
            d = ref4[j];
            results.push(`(${d.type})${d.name}`);
          }
          return results;
        }).call(this)).join(', '))}`);
        for (j = 0, len1 = inserts.length; j < len1; j++) {
          sql = inserts[j];
          //.......................................................................................................
          this.execute(sql);
        }
        this.pragma(`${this.as_identifier(to_schema)}.foreign_keys = on;`);
        this.pragma(`${this.as_identifier(to_schema)}.foreign_key_check;`);
        return null;
      }

      //=========================================================================================================
      // SQL CONSTRUCTION
      //---------------------------------------------------------------------------------------------------------
      as_identifier(text) {
        return '"' + (text.replace(/"/g, '""')) + '"';
      }

      // as_identifier:  ( text  ) -> '[' + ( text.replace /\]/g, ']]' ) + ']'

        //---------------------------------------------------------------------------------------------------------
      escape_text(x) {
        validate.text(x);
        return x.replace(/'/g, "''");
      }

      //---------------------------------------------------------------------------------------------------------
      list_as_json(x) {
        validate.list(x);
        return JSON.stringify(x);
      }

      //---------------------------------------------------------------------------------------------------------
      as_sql(x) {
        var type;
        switch (type = type_of(x)) {
          case 'text':
            return `'${this.escape_text(x)}'`;
          case 'list':
            return `'${this.list_as_json(x)}'`;
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
      }

      //---------------------------------------------------------------------------------------------------------
      interpolate(sql, Q) {
        return sql.replace(this._interpolation_pattern, ($0, $1) => {
          var error;
          try {
            return this.as_sql(Q[$1]);
          } catch (error1) {
            error = error1;
            throw new Error(`µ55563 when trying to express placeholder ${rpr($1)} as SQL literal, an error occurred: ${rpr(error.message)}`);
          }
        });
      }

      //=========================================================================================================
      // SORTABLE LISTS
      //---------------------------------------------------------------------------------------------------------
      as_hollerith(x) {
        return HOLLERITH.encode(x);
      }

      from_hollerith(x) {
        return HOLLERITH.decode(x);
      }

    };

    //---------------------------------------------------------------------------------------------------------
    Dba._defaults = {
      sqlt: null/* [`better-sqlite3`](https://github.com/JoshuaWise/better-sqlite3/) instance */,
      echo: false/* whether to echo statements to the terminal */,
      debug: false
    };

    Dba.prototype._interpolation_pattern = /\$(?:(.+?)\b|\{([^}]+)\})/g;

    return Dba;

  }).call(this);

}).call(this);

//# sourceMappingURL=dba.js.map