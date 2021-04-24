(function() {
  'use strict';
  var CND, FS, HOLLERITH, L, LFT, Multimix, PATH, badge, debug, declare, echo, help, info, isa, new_bsqlt3_connection, rpr, size_of, type_of, urge, validate, validate_optional, warn, whisper,
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

  new_bsqlt3_connection = require('better-sqlite3');

  PATH = require('path');

  //-----------------------------------------------------------------------------------------------------------
  L.pick = function(d, key, fallback, type = null) {
    var R, ref1;
    R = (ref1 = d != null ? d[key] : void 0) != null ? ref1 : fallback;
    if (type != null) {
      validate[type](R);
    }
    return R;
  };

  //-----------------------------------------------------------------------------------------------------------
  L._get_extension = function(path) {
    var R;
    if ((R = PATH.extname(path)) === '') {
      return null;
    }
    return R.slice(1);
  };

  //-----------------------------------------------------------------------------------------------------------
  L._get_format = function(path, format = null) {
    if (format != null) {
      return format;
    }
    return this._get_extension(path);
  };

  //===========================================================================================================

  //-----------------------------------------------------------------------------------------------------------
  this.Dba = (function() {
    class Dba extends Multimix {
      // #---------------------------------------------------------------------------------------------------------
      // @_defaults:
      //   sqlt:           null  ### [`better-sqlite3`](https://github.com/JoshuaWise/better-sqlite3/) instance ###
      //   echo:           false ### whether to echo statements to the terminal ###
      //   debug:          false ### whether to print additional debugging info ###
      //   path:           ''
      //   schema:         'main'
      //   create:         true
      //   timeout:        5000
      //   readonly:       false

        //---------------------------------------------------------------------------------------------------------
      constructor(cfg) {
        var bsqlt3_cfg;
        super();
        this._statements = {};
        this._schemas = {};
        cfg = {...L.types.defaults.dba_constructor_cfg, ...cfg};
        this._dbg = {
          debug: cfg.debug,
          echo: cfg.echo
        };
        debug('^345^', cfg);
        if (cfg.sqlt != null) {
          throw new Error("^dba@333^ property `sqlt` not supported (yet)");
        }
        if (cfg.schema != null) {
          throw new Error("^dba@334^ property `schema` not supported (yet)");
        }
        if (cfg.path != null) {
          throw new Error("^dba@335^ property `path` not supported (yet)");
        }
        bsqlt3_cfg = {
          readonly: cfg.readonly,
          fileMustExist: !cfg.create,
          timeout: cfg.timeout
        };
        // verbose:        ### TAINT to be done ###
        //.......................................................................................................
        this.sqlt = new_bsqlt3_connection('', bsqlt3_cfg);
        return void 0/* always return `undefined` from constructor */;
      }

      //---------------------------------------------------------------------------------------------------------
      open(cfg) {
        cfg = {...L.types.defaults.dba_open_cfg, ...cfg};
        validate.dba_open_cfg;
        if (cfg.schema === 'main') {
          throw new Error(`^dba@336^ cannot open schema ${rpr(cfg.schema)} (yet)`);
        }
        if (this.has({
          schema: cfg.schema
        })) {
          throw new Error(`^dba@337^ schema ${rpr(cfg.schema)} already exists`);
        }
        this._attach({path, schema});
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      import(cfg) {
        cfg = {...L.types.defaults.dba_import_cfg, ...cfg};
        validate.dba_import_cfg(cfg);
        if (cfg.save_as != null) {
          throw new Error("^dba@338^ `save_as` not implemented");
        }
        cfg.format = L._get_format(cfg.path, cfg.format);
        debug('^4587984^', {cfg});
        switch (cfg.format) {
          case 'db':
            // tmp_schema = @_get_free_random_schema()
            this._attach({
              schema: tmp_schema,
              path: cfg.path
            });
            throw new Error(`^dba@339^ format ${rpr(cfg.format)} not implemented`);
          case 'sql':
            throw new Error(`^dba@340^ format ${rpr(cfg.format)} not implemented`);
          default:
            throw new Error(`^dba@341^ unknown format ${rpr(cfg.format)}`);
        }
        return null;
      }

      //=========================================================================================================
      // DEBUGGING
      //---------------------------------------------------------------------------------------------------------
      _echo(ref, sql) {
        if (!this._dbg.echo) {
          return null;
        }
        echo((CND.reverse(CND.blue(`^icql@888-${ref}^`))) + (CND.reverse(CND.yellow(sql))));
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _debug(...P) {
        if (!this._dbg.debug) {
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
        throw new Error("µ764 deprecated until next major version");
        return this.query("select * from sqlite_schema order by type desc, name;");
      }

      //---------------------------------------------------------------------------------------------------------
      walk_objects(cfg) {
        var ordering, ordering_x, schema, schema_i, schema_s, seq;
        schema = L.pick(cfg, 'schema', null);
        ordering = L.pick(cfg, '_ordering', null);
        if (schema == null) {
          return this._walk_all_objects();
        }
        validate_optional.ic_schema(schema);
        validate_optional.dba_list_objects_ordering(ordering);
        schema_i = this.as_identifier(schema);
        schema_s = this.as_sql(schema);
        ordering_x = ordering === 'drop' ? 'desc' : 'asc';
        seq = this.first_value(this.query(`select seq from pragma_database_list where name = ${schema_s};`));
        //.......................................................................................................
        return this.query(`select
    ${seq}    as seq,
    ${schema_s} as schema,
    name      as name,
    type      as type,
    sql       as sql
  from ${schema_i}.sqlite_schema
  order by seq, type ${ordering_x}, name;`);
      }

      //---------------------------------------------------------------------------------------------------------
      _walk_all_objects() {
        var d, parts, ref1, row, schema, schema_i, schema_s, schemas, sql;
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
          schema_i = this.as_identifier(schema);
          schema_s = this.as_sql(schema);
          parts.push(`select
  ${d.seq} as seq,
  ${schema_s} as schema,
  name  as name,
  type  as type,
  sql   as sql
from ${schema_i}.sqlite_schema as d1`);
        }
        parts = parts.join(" union all\n");
        //.......................................................................................................
        sql = '';
        sql += parts;
        sql += "\norder by seq, type, name;";
        return this.query(sql);
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
        throw new Error(`^dba@342^ not implemented: is_empty() for anything but schemas, got ${rpr(cfg)}`);
      }

      //---------------------------------------------------------------------------------------------------------
      _is_empty_schema(schema_i) {
        return (this.list(this.query(`select 1 from ${schema_i}.sqlite_schema limit 1;`))).length === 0;
      }

      // #---------------------------------------------------------------------------------------------------------
      // _get_size: ( cfg ) ->
      //   ### thx to https://stackoverflow.com/a/58251635/256361 ###
      //   ### see https://www.sqlite.org/dbstat.html ###
      //   ### TAINT field `ncell` may not be the right one to query for row / element count (?) ###
      //   ### NOTE SQLite must be compiled with `SQLITE_ENABLE_DBSTAT_VTAB` ###
      //   schema      = L.pick cfg, 'schema', 'main', 'ic_schema'
      //   name        = L.pick cfg, 'name', null
      //   validate_optional.ic_name name
      //   unless name?
      //     null

        // #---------------------------------------------------------------------------------------------------------
      // _get_all_sizes: ->
      //   # @list @query \
      //   "select distinct name, sum( ncell ) over ( partition by name ) from dbstat;"
      //   "select d1.name as name, d1.ncell as row_count  from dbstat('foo',1) as d1;"

        // #---------------------------------------------------------------------------------------------------------
      // _list_objects_2: ( imagine_options_object_here ) ->
      //   # for schema in @list_schema_names()
      //   schema    = 'main'
      //   validate.ic_schema schema
      //   schema_i  = @as_identifier schema
      //   ### thx to https://stackoverflow.com/a/53160348/256361 ###
      //   return @list @query """
      //     select
      //       'main'  as schema,
      //       'field' as type,
      //       m.name  as relation_name,
      //       p.name  as field_name
      //     from
      //       #{schema_i}.sqlite_schema as m
      //     join
      //       #{schema_i}.pragma_table_info( m.name ) as p
      //     order by
      //       m.name,
      //       p.cid;"""

        //---------------------------------------------------------------------------------------------------------
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
        throw new Error(`^dba@343^ unknown schema ${rpr(schema)}`);
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
        var R, fk_state, i, len, name, ref1, schema, schema_i, statement, type;
        schema = L.pick(cfg, 'schema', 'main');
        validate.ic_schema(schema);
        schema_i = this.as_identifier(schema);
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
      _attach(cfg) {
        var path, path_x, schema, schema_i, tmp_schema;
        schema = L.pick(cfg, 'schema', 'main', 'ic_not_temp_schema');
        path = L.pick(cfg, 'path', '', 'ic_path');
        schema_i = this.as_identifier(schema);
        path_x = this.as_sql(path);
        //.......................................................................................................
        if (this.has({schema})) {
          if (!this._is_empty_schema(schema_i)) {
            throw new Error(`^dba@344^ schema ${rpr(schema)} not empty`);
          }
          if (schema === 'main') {
            if (!isa.ic_ram_path(this._path_of_schema(schema))) {
              throw new Error("^dba@345^ schema 'main' cannot be overwritten if based on file");
            }
            tmp_schema = this._get_free_random_schema();
            this._attach({
              schema: tmp_schema,
              path
            });
            this.copy_schema({
              from_schema: tmp_schema,
              to_schema: 'main'
            });
            this._detach({
              schema: tmp_schema
            });
            return null;
            this._schemas[schema] = {path};
          }
          this._detach({schema});
        }
        //.......................................................................................................
        this.execute(`attach ${path_x} as ${schema_i};`);
        this._schemas[schema] = {path};
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _detach(cfg) {
        var schema, schema_i;
        schema = L.pick(cfg, 'schema', null, 'ic_schema');
        schema_i = this.as_identifier(schema);
        this.execute(`detach ${schema_i};`);
        delete this._schemas[schema];
        return null;
      }

      //=========================================================================================================
      // IN-MEMORY PROCESSING
      //-----------------------------------------------------------------------------------------------------------
      move_schema(cfg) {
        return this._copy_schema(cfg, true);
      }

      copy_schema(cfg) {
        return this._copy_schema(cfg, false);
      }

      //-----------------------------------------------------------------------------------------------------------
      _copy_schema(cfg, detach_schema = false) {
        var d, detach_from_schema, fk_state, from_schema, from_schema_objects, from_schema_x, i, inserts, j, known_schemas, len, len1, name_x, ref1, ref2, sql, to_schema, to_schema_objects, to_schema_x;
        detach_from_schema = function() {
          if (!detach_schema) {
            return null;
          }
          return this._detach({
            schema: from_schema
          });
        };
        //.......................................................................................................
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
        if (to_schema_objects.length > 0) {
          throw new Error(`µ768 unable to copy to non-empty schema ${rpr(to_schema)}`);
        }
        //.......................................................................................................
        from_schema_objects = this.list(this.walk_objects({
          schema: from_schema
        }));
        if (from_schema_objects.length === 0) {
          return detach_from_schema();
        }
        //.......................................................................................................
        to_schema_x = this.as_identifier(to_schema);
        from_schema_x = this.as_identifier(from_schema);
        inserts = [];
        fk_state = this.get_foreign_key_state();
        this.set_foreign_key_state(false);
//.......................................................................................................
        for (i = 0, len = from_schema_objects.length; i < len; i++) {
          d = from_schema_objects[i];
          if ((d.sql == null) || (d.sql === '')) {
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
          //.......................................................................................................
          this.execute(sql);
        }
        this.set_foreign_key_state(fk_state);
        if (fk_state) {
          this.pragma(`${this.as_identifier(to_schema)}.foreign_key_check;`);
        }
        return detach_from_schema();
      }

      //---------------------------------------------------------------------------------------------------------
      save_as(cfg) {
        /* TAINT add boolean `cfg.overwrite` */
        var overwrite, path, schema;
        schema = L.pick(cfg, 'schema', 'main', 'ic_schema');
        path = L.pick(cfg, 'path', null, 'ic_path');
        overwrite = L.pick(cfg, 'overwrite', false, 'boolean');
        this._export(schema, path, 'sqlitedb', overwrite);
        /* TAINT associate path with schema */
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      export(cfg) {
        /* TAINT add boolean `cfg.overwrite` */
        var format, overwrite, path, schema;
        schema = L.pick(cfg, 'schema', 'main', 'ic_schema');
        path = L.pick(cfg, 'path', null, 'ic_path');
        overwrite = L.pick(cfg, 'overwrite', false, 'boolean');
        format = this._format_from_path(path);
        format = L.pick(cfg, 'format', format, 'ic_db_file_format');
        return this._export(schema, path, format, overwrite);
      }

      //---------------------------------------------------------------------------------------------------------
      _export(schema, path, format, overwrite) {
        /* TAINT add boolean `cfg.overwrite` */
        /* TAINT implement `format` */
        var schema_i;
        schema_i = this.as_identifier(schema);
        switch (format) {
          case 'sqlitedb':
            db.$.run(`vacuum ${schema_i} into ?;`, [path]);
            break;
          default:
            throw new Error(`µ47492 unknown format ${rpr(format)}`);
        }
        return null;
      }

      //=========================================================================================================
      // SQL CONSTRUCTION
      //---------------------------------------------------------------------------------------------------------
      as_identifier(x) {
        validate.text(x);
        return '"' + (x.replace(/"/g, '""')) + '"';
      }

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

    Dba.prototype._interpolation_pattern = /\$(?:(.+?)\b|\{([^}]+)\})/g;

    return Dba;

  }).call(this);

}).call(this);

//# sourceMappingURL=main.js.map