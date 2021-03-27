(function() {
  'use strict';
  var CND, FS, HOLLERITH, L, LFT, Multimix, badge, debug, declare, echo, help, info, isa, rpr, size_of, type_of, urge, validate, validate_optional, warn, whisper,
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

  ({isa, validate, validate_optional, declare, size_of, type_of} = this.types);

  LFT = require('letsfreezethat');

  Multimix = require('multimix');

  L = this;

  L._misfit = Symbol('misfit');

  //-----------------------------------------------------------------------------------------------------------
  L.pick = function(d, key, fallback, type = null) {
    var R, ref1;
    R = (ref1 = d != null ? d[key] : void 0) != null ? ref1 : fallback;
    if (type != null) {
      validate[type](R);
    }
    return R;
  };

  //===========================================================================================================

  //-----------------------------------------------------------------------------------------------------------
  this.Dba = (function() {
    class Dba extends Multimix {
      //---------------------------------------------------------------------------------------------------------
      constructor(cfg) {
        var ref1, ref2;
        super();
        this.cfg = {...this.constructor._defaults, ...cfg};
        /* TAINT allow to pass through `better-sqlite3` options with `cfg` */
        /* TAINT use `L.pick()` */
        this.sqlt = (ref1 = this.cfg.sqlt) != null ? ref1 : (require('better-sqlite3'))((ref2 = this.cfg.path) != null ? ref2 : this.constructor._defaults.path);
        this._statements = {};
        return void 0/* always return `undefined` from constructor */;
      }

      //---------------------------------------------------------------------------------------------------------
      static open(cfg) {
        var R, path, schema;
        path = L.pick(cfg, 'path', '', 'ic_path');
        schema = L.pick(cfg, 'schema', 'main', 'ic_schema');
        if (schema === 'main') {
          R = new this({path});
        } else {
          R = new this({
            path: ''
          });
          R.attach({path, schema});
        }
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      open(cfg) {
        var path, schema;
        path = L.pick(cfg, 'path', null, 'ic_path');
        schema = L.pick(cfg, 'schema', 'main', 'ic_schema');
        if (this.has({schema})) {
          if (!this.is_empty({schema})) {
            throw new Error(`^icql-dba.open@445^ schema ${rpr(schema)} not empty`);
          }
          if (schema === 'main') {
            throw new Error(`^icql-dba.open@445^ cannot open schema ${rpr(schema)} (yet)`);
          }
          this.detach({schema});
        }
        this.attach({path, schema});
        return null;
      }

      //=========================================================================================================
      // DEBUGGING
      //---------------------------------------------------------------------------------------------------------
      _echo(ref, sql) {
        if (!this.cfg.echo) {
          return null;
        }
        echo((CND.reverse(CND.blue(`^icql@888-${ref}^`))) + (CND.reverse(CND.yellow(sql))));
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _debug(...P) {
        if (!this.cfg.debug) {
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
          throw new Error("µ763 expected at least one row, got none");
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

      list(iterator) {
        return [...iterator];
      }

      //=========================================================================================================
      // QUERYING
      //---------------------------------------------------------------------------------------------------------
      query(sql, ...P) {
        var base, statement;
        this._echo('query', sql);
        statement = ((base = this._statements)[sql] != null ? base[sql] : base[sql] = this.sqlt.prepare(sql));
        return statement.iterate(...P);
      }

      //---------------------------------------------------------------------------------------------------------
      run(sql, ...P) {
        var base, statement;
        this._echo('run', sql);
        statement = ((base = this._statements)[sql] != null ? base[sql] : base[sql] = this.sqlt.prepare(sql));
        return statement.run(...P);
      }

      //---------------------------------------------------------------------------------------------------------
      _run_or_query(entry_type, is_last, sql, Q) {
        var base, returns_data, statement;
        this._echo('_run_or_query', sql);
        statement = ((base = this._statements)[sql] != null ? base[sql] : base[sql] = this.sqlt.prepare(sql));
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
        return this.sqlt.exec(sql);
      }

      //---------------------------------------------------------------------------------------------------------
      prepare(sql) {
        this._echo('prepare', sql);
        return this.sqlt.prepare(sql);
      }

      //=========================================================================================================
      // OTHER
      //---------------------------------------------------------------------------------------------------------
      aggregate(...P) {
        return this.sqlt.aggregate(...P);
      }

      backup(...P) {
        return this.sqlt.backup(...P);
      }

      checkpoint(...P) {
        return this.sqlt.checkpoint(...P);
      }

      close(...P) {
        return this.sqlt.close(...P);
      }

      read(path) {
        return this.sqlt.exec(FS.readFileSync(path, {
          encoding: 'utf-8'
        }));
      }

      function(...P) {
        return this.sqlt.function(...P);
      }

      load_extension(...P) {
        return this.sqlt.loadExtension(...P);
      }

      pragma(...P) {
        return this.sqlt.pragma(...P);
      }

      transaction(...P) {
        return this.sqlt.transaction(...P);
      }

      //---------------------------------------------------------------------------------------------------------
      get_foreign_key_state() {
        return !!(this.pragma("foreign_keys;"))[0].foreign_keys;
      }

      //---------------------------------------------------------------------------------------------------------
      set_foreign_key_state(onoff) {
        validate.boolean(onoff);
        this.pragma(`foreign_keys = ${onoff};`);
        return null;
      }

      //=========================================================================================================
      // DB STRUCTURE REPORTING
      //---------------------------------------------------------------------------------------------------------
      catalog() {
        /* TAINT kludge: we sort by descending types so views, tables come before indexes (b/c you can't drop a
           primary key index in SQLite) */
        // throw new Error "µ764 deprecated until next major version"
        return this.query("select * from sqlite_schema order by type desc, name;");
      }

      //---------------------------------------------------------------------------------------------------------
      walk_objects(cfg) {
        var ordering, ordering_x, schema, schema_x;
        schema = L.pick(cfg, 'schema', 'main', 'ic_schema');
        ordering = L.pick(cfg, '_ordering', null);
        validate_optional.dba_list_objects_ordering(ordering);
        schema_x = this.as_identifier(schema);
        ordering_x = ordering === 'drop' ? 'desc' : 'asc';
        //.......................................................................................................
        return this.query(`select
    type      as type,
    name      as name,
    sql       as sql
  from ${schema_x}.sqlite_schema
  order by type ${ordering_x}, name;`);
      }

      //---------------------------------------------------------------------------------------------------------
      is_empty(cfg) {
        var has_schema, name, schema;
        schema = L.pick(cfg, 'schema', 'main', 'ic_schema');
        name = L.pick(cfg, 'name', null);
        validate_optional.ic_name(name);
        if (name == null) {
          return (has_schema = this._is_empty_schema(this.as_identifier(schema)));
        }
        throw new Error(`^icql-dba.is_empty@34543^ not implemented: is_empty() for anything but schemas, got ${rpr(cfg)}`);
      }

      // return has_schema and @_get_row_counts ...

        //---------------------------------------------------------------------------------------------------------
      _is_empty_schema(schema_x) {
        return (this.list(this.query(`select 1 from ${schema_x}.sqlite_schema limit 1;`))).length === 0;
      }

      //---------------------------------------------------------------------------------------------------------
      _get_size(cfg) {
        /* thx to https://stackoverflow.com/a/58251635/256361 */
        /* see https://www.sqlite.org/dbstat.html */
        /* TAINT field `ncell` may not be the right one to query for row / element count (?) */
        /* NOTE SQLite must be compiled with `SQLITE_ENABLE_DBSTAT_VTAB` */
        var name, schema;
        schema = L.pick(cfg, 'schema', 'main', 'ic_schema');
        name = L.pick(cfg, 'name', null);
        validate_optional.ic_name(name);
        if (name == null) {
          return null;
        }
      }

      //---------------------------------------------------------------------------------------------------------
      _get_all_sizes() {
        // @list @query \
        "select distinct name, sum( ncell ) over ( partition by name ) from dbstat;";
        return "select d1.name as name, d1.ncell as row_count  from dbstat('foo',1) as d1;";
      }

      //---------------------------------------------------------------------------------------------------------
      _create_icqldba_schema() {
        var d, parts, ref1, row, schema, schema_id, schema_sql, schemas, sql;
        schemas = {};
        parts = [];
        ref1 = this.query("select seq, name, file as path from pragma_database_list order by seq;");
        //.......................................................................................................
        /* TAINT use API */
        for (row of ref1) {
          schemas[row.name] = row;
        }
//.......................................................................................................
        for (schema in schemas) {
          d = schemas[schema];
          // info '^44345^', { schema, d, }
          schema_id = this.as_identifier(schema);
          schema_sql = this.as_sql(schema);
          // parts.push "select #{d.seq} as seq, #{schema_sql} as schema, #{schema_sql} as name, 'schema' as type"
          parts.push(`select
  ${d.seq} as seq,
  ${schema_sql} as schema,
  name,
  type
from ${schema_id}.sqlite_schema as d1`);
        }
        // join dbstat( #{schema_sql}, 1 ) using ( name ) """
        parts = parts.join(" union all\n");
        //.......................................................................................................
        sql = '';
        sql += "drop view if exists temp.icqldba_schema;\n";
        sql += "create view temp.icqldba_schema as\n";
        sql += parts;
        sql += "\norder by seq, name;";
        debug('^5345^', sql);
        this.execute(sql);
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _list_objects_2(imagine_options_object_here) {
        var schema, schema_x;
        // for schema in @list_schema_names()
        schema = 'main';
        validate.ic_schema(schema);
        schema_x = this.as_identifier(schema);
        /* thx to https://stackoverflow.com/a/53160348/256361 */
        return this.list(this.query(`select
  'main'  as schema,
  'field' as type,
  m.name  as relation_name,
  p.name  as field_name
from
  ${schema_x}.sqlite_schema as m
join
  ${schema_x}.pragma_table_info( m.name ) as p
order by
  m.name,
  p.cid;`));
      }

      //---------------------------------------------------------------------------------------------------------
      // list_schemas:       -> @pragma "database_list;"
      list_schemas() {
        return this.list(this.query("select * from pragma_database_list order by name;"));
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
      has(cfg) {
        var schema;
        schema = L.pick(cfg, 'schema', null, 'ic_schema');
        return indexOf.call(this.list_schema_names(), schema) >= 0;
      }

      //---------------------------------------------------------------------------------------------------------
      get_schemas() {
        var R, ref1, row;
        R = {};
        ref1 = this.query("select * from pragma_database_list order by seq;");
        for (row of ref1) {
          R[row.name] = row.file;
        }
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      _path_of_schema(schema, fallback = L._misfit) {
        var R;
        R = this.first_value(this.query("select file from pragma_database_list where name = ?;", [schema]));
        if (R != null) {
          return R;
        }
        if (fallback !== L._misfit) {
          return fallback;
        }
        throw new Error(`^icql-dba.attach@44822^ unknown schema ${rpr(schema)}`);
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

      //=========================================================================================================
      // DB STRUCTURE MODIFICATION
      //---------------------------------------------------------------------------------------------------------
      /* TAINT Error: index associated with UNIQUE or PRIMARY KEY constraint cannot be dropped */
      clear(cfg) {
        var R, fk_state, i, len, name, ref1, schema, schema_x, statement, type;
        schema = L.pick(cfg, 'schema', 'main');
        validate.ic_schema(schema);
        schema_x = this.as_identifier(schema);
        R = 0;
        fk_state = this.get_foreign_key_state();
        this.set_foreign_key_state(false);
        ref1 = this.list(this.walk_objects({
          schema,
          _ordering: 'drop'
        }));
        for (i = 0, len = ref1.length; i < len; i++) {
          ({type, name} = ref1[i]);
          statement = `drop ${type} if exists ${this.as_identifier(name)};`;
          this.execute(statement);
          R += +1;
        }
        this.set_foreign_key_state(fk_state);
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      attach(cfg) {
        var path, path_x, schema, schema_x, tmp_schema;
        schema = L.pick(cfg, 'schema', 'main', 'ic_not_temp_schema');
        path = L.pick(cfg, 'path', '', 'ic_path');
        schema_x = this.as_identifier(schema);
        path_x = this.as_sql(path);
        // debug '^attach@54-1^', cfg
        // debug '^attach@54-2^', { schema, schema_x, path, path_x, }
        //.......................................................................................................
        if (this.has({schema})) {
          // debug '^attach@54-3^'
          if (!this._is_empty_schema(schema_x)) {
            throw new Error(`^icql-dba.attach@44834^ schema ${rpr(schema)} not empty`);
          }
          if (schema === 'main') {
            if (!isa.ic_ram_path(this._path_of_schema(schema))) {
              throw new Error("^icql-dba.attach@44835^ schema 'main' cannot be overwritten if based on file");
            }
            // debug '^attach@54-4^'
            tmp_schema = this._get_free_random_schema();
            this.attach({
              schema: tmp_schema,
              path
            });
            this.copy_schema({
              from_schema: tmp_schema,
              to_schema: 'main'
            });
            this.detach({
              schema: tmp_schema
            });
            return null;
          }
          // debug '^attach@54-5^'
          this.detach({schema});
        }
        //.......................................................................................................
        this.execute(`attach ${path_x} as ${schema_x};`);
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      detach(cfg) {
        var schema, schema_x;
        schema = L.pick(cfg, 'schema', null, 'ic_schema');
        schema_x = this.as_identifier(schema);
        return this.execute(`detach ${schema_x};`);
      }

      //=========================================================================================================
      // IN-MEMORY PROCESSING
      //-----------------------------------------------------------------------------------------------------------
      copy_schema(cfg) {
        var d, fk_state, from_schema, from_schema_objects, from_schema_x, i, inserts, j, known_schemas, len, len1, name_x, ref1, ref2, sql, to_schema, to_schema_objects, to_schema_x;
        from_schema = L.pick(cfg, 'from_schema', 'main');
        to_schema = L.pick(cfg, 'to_schema', 'main');
        validate.ic_schema(from_schema);
        validate.ic_schema(to_schema);
        //.......................................................................................................
        if (from_schema === to_schema) {
          throw new Error(`µ767 unable to copy schema to itself, got ${rpr(cfg)} (schema ${rpr(from_schema)})`);
        }
        //.......................................................................................................
        known_schemas = this.list_schema_names();
        if (indexOf.call(known_schemas, from_schema) < 0) {
          throw new Error(`µ765 unknown schema ${rpr(from_schema)}`);
        }
        if (indexOf.call(known_schemas, to_schema) < 0) {
          throw new Error(`µ766 unknown schema ${rpr(to_schema)}`);
        }
        //.......................................................................................................
        to_schema_objects = this.list(this.walk_objects({
          schema: to_schema
        }));
        // if @cfg.debug
        //   @_debug '^49864^', "objects in #{rpr to_schema}: #{rpr ( "(#{d.type})#{d.name}" for d in to_schema_objects ).join ', '}"
        if (to_schema_objects.length > 0) {
          throw new Error(`µ768 unable to copy to non-empty schema ${rpr(to_schema)}`);
        }
        //.......................................................................................................
        from_schema_objects = this.list(this.walk_objects({
          schema: from_schema
        }));
        if (from_schema_objects.length === 0) {
          return null;
        }
        // if @cfg.debug
        //   @_debug '^49864^', "objects in #{rpr from_schema}: #{rpr ( "(#{d.type})#{d.name}" for d in from_schema_objects ).join ', '}"
        //.......................................................................................................
        to_schema_x = this.as_identifier(to_schema);
        from_schema_x = this.as_identifier(from_schema);
        //.......................................................................................................
        inserts = [];
        //.......................................................................................................
        fk_state = this.get_foreign_key_state();
        this.set_foreign_key_state(false);
//.......................................................................................................
        for (i = 0, len = from_schema_objects.length; i < len; i++) {
          d = from_schema_objects[i];
          if ((d.sql == null) || (d.sql === '')) {
            // @_debug '^44463^', "copying DB object: (#{d.type}) #{d.name}"
            continue;
          }
          if ((ref1 = d.name) === 'sqlite_sequence') {
            continue;
          }
          //.....................................................................................................
          /* TAINT consider to use `validate.ic_db_object_type` */
          if ((ref2 = d.type) !== 'table' && ref2 !== 'view' && ref2 !== 'index') {
            throw new Error(`µ769 unknown type ${rpr(d.type)} for DB object ${rpr(d)}`);
          }
          //.....................................................................................................
          /* TAINT using not-so reliable string replacement as substitute for proper parsing */
          name_x = this.as_identifier(d.name);
          sql = d.sql.replace(/\s*CREATE\s*(TABLE|INDEX|VIEW)\s*/i, `create ${d.type} ${to_schema_x}.`);
          //.....................................................................................................
          if (sql === d.sql) {
            throw new Error(`µ770 unexpected SQL string ${rpr(d.sql)}`);
          }
          //.....................................................................................................
          this.execute(sql);
          if (d.type === 'table') {
            inserts.push(`insert into ${to_schema_x}.${name_x} select * from ${from_schema_x}.${name_x};`);
          }
        }
        for (j = 0, len1 = inserts.length; j < len1; j++) {
          sql = inserts[j];
          // #.......................................................................................................
          // @_debug '^49864^', "starting with inserts"
          //.......................................................................................................
          this.execute(sql);
        }
        this.set_foreign_key_state(fk_state);
        if (fk_state) {
          this.pragma(`${this.as_identifier(to_schema)}.foreign_key_check;`);
        }
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      save_as(cfg) {
        var path, schema, schema_x;
        schema = L.pick(cfg, 'schema', 'main');
        path = L.pick(cfg, 'path', null);
        schema_x = this.as_identifier(schema);
        db.$.run(`vacuum ${schema_x} into ?;`, [path]);
        return null;
      }

      //=========================================================================================================
      // SQL CONSTRUCTION
      //---------------------------------------------------------------------------------------------------------
      as_identifier(x) {
        validate.text(x);
        return '"' + (x.replace(/"/g, '""')) + '"';
      }

      // as_identifier:  ( x  ) -> '[' + ( x.replace /\]/g, ']]' ) + ']'

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
            throw new Error("µ771 unable to express 'undefined' as SQL literal");
        }
        throw new Error(`µ772 unable to express a ${type} as SQL literal, got ${rpr(x)}`);
      }

      //---------------------------------------------------------------------------------------------------------
      interpolate(sql, Q) {
        return sql.replace(this._interpolation_pattern, ($0, $1) => {
          var error;
          try {
            return this.as_sql(Q[$1]);
          } catch (error1) {
            error = error1;
            throw new Error(`µ773 when trying to express placeholder ${rpr($1)} as SQL literal, an error occurred: ${rpr(error.message)}`);
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
      debug: false/* whether to print additional debugging info */,
      path: ''
    };

    Dba.prototype._interpolation_pattern = /\$(?:(.+?)\b|\{([^}]+)\})/g;

    return Dba;

  }).call(this);

}).call(this);

//# sourceMappingURL=main.js.map