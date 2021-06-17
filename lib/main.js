(function() {
  'use strict';
  var CND, E, FS, HOLLERITH, Import_export_mixin, L, PATH, TMP, badge, debug, declare, echo, freeze, help, info, isa, lets, misfit, new_bsqlt3_connection, rpr, size_of, type_of, types, urge, validate, validate_optional, warn, whisper,
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
  types = require('./types');

  ({isa, validate, validate_optional, declare, size_of, type_of} = types);

  ({freeze, lets} = require('letsfreezethat'));

  L = this;

  ({misfit} = require('./common'));

  E = require('./errors');

  new_bsqlt3_connection = require('better-sqlite3');

  PATH = require('path');

  TMP = require('tempy');

  ({Import_export_mixin} = require('./import-export-mixin'));

  //===========================================================================================================

  //-----------------------------------------------------------------------------------------------------------
  this.Dba = class Dba extends Import_export_mixin() {
    //---------------------------------------------------------------------------------------------------------
    constructor(cfg) {
      var bsqlt3_cfg;
      super();
      this.types = types;
      this._statements = {};
      this._schemas = freeze({});
      this.sql = new (require('./sql')).Sql();
      this.cfg = freeze({...this.types.defaults.dba_constructor_cfg, ...cfg});
      validate.dba_constructor_cfg(this.cfg);
      this._dbg = {
        debug: this.cfg.debug,
        echo: this.cfg.echo
      };
      this._formats = freeze({...this.types.defaults.extensions_and_formats});
      if (this.cfg.sqlt != null) {
        // debug '^345^', @cfg
        throw new E.Dba_cfg_error('^dba@300^', "property `sqlt` not supported (yet)");
      }
      if (this.cfg.schema != null) {
        throw new E.Dba_cfg_error('^dba@301^', "property `schema` not supported (yet)");
      }
      if (this.cfg.path != null) {
        throw new E.Dba_cfg_error('^dba@302^', "property `path` not supported (yet)");
      }
      bsqlt3_cfg = {
        readonly: this.cfg.readonly,
        fileMustExist: !this.cfg.create,
        timeout: this.cfg.timeout
      };
      // verbose:        ### TAINT to be done ###
      //.......................................................................................................
      this.sqlt = new_bsqlt3_connection('', bsqlt3_cfg);
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    open(cfg) {
      var path, ram, saveas, schema;
      validate.dba_open_cfg((cfg = {...this.types.defaults.dba_open_cfg, ...cfg}));
      ({path, schema, ram} = cfg);
      if (schema === 'main' || schema === 'temp') {
        throw new E.Dba_schema_not_allowed('^dba@303^', schema);
      }
      if (this.has({schema})) {
        throw new E.Dba_schema_exists('^dba@304^', schema);
      }
      //.......................................................................................................
      /* TAINT troublesome logic with `path` and `saveas` */
      if (path != null) {
        saveas = path;
      } else {
        path = ''/* TAINT or ':memory:' depending on `cfg.disk` */
        saveas = null;
      }
      //.......................................................................................................
      if (ram) {
        this._open_file_db_in_ram({path, schema, saveas});
      } else {
        this._attach({path, schema, saveas});
      }
      //.......................................................................................................
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _open_file_db_in_ram(cfg) {
      /* Given a `path` and a `schema`, create a temporary schema to open the file DB in as well as an empty
         in-memory schema; then copy all DB objects and their contents from the temporary file schema to the RAM
         schema. Finally, detach the file schema. Ensure the `path` given is kept around as the `saveas`
         (implicit) path to be used for eventual persistency (`dba.save()`). */
      /* TAINT validate? */
      var path, saveas, schema, tmp_schema;
      ({path, schema, saveas} = cfg);
      //.......................................................................................................
      if (this.types.isa.dba_ram_path(path)) {
        this._attach({schema, path, saveas});
        return null;
      }
      //.......................................................................................................
      tmp_schema = this._get_free_temp_schema();
      this._attach({
        schema: tmp_schema,
        path
      });
      this._attach({
        schema,
        path: '',
        saveas
      });
      this._copy_schema({
        from_schema: tmp_schema,
        to_schema: schema
      });
      this._detach({
        schema: tmp_schema
      });
      //.......................................................................................................
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    save(cfg) {
      var path, ref1, ref2, schema;
      /* TAINT could implement prohibition of `path` in type `dba_save_cfg` */
      validate.dba_save_cfg((cfg = {...this.types.defaults.dba_export_cfg, ...cfg}));
      ({schema, path} = cfg);
      if (path != null) {
        throw new E.Dba_argument_not_allowed('^dba@305^', 'path', path);
      }
      path = (ref1 = (ref2 = this._schemas[schema]) != null ? ref2.path : void 0) != null ? ref1 : null;
      if (path == null) {
        throw new E.Dba_schema_unknown('^dba@306^', schema);
      }
      return this.export({
        schema,
        path,
        format: 'sqlite'
      });
    }

    //---------------------------------------------------------------------------------------------------------
    export(cfg) {
      var format, path, schema;
      /* TAINT add boolean `cfg.overwrite` */
      validate.dba_export_cfg((cfg = {...this.types.defaults.dba_export_cfg, ...cfg}));
      ({schema, path, format} = cfg);
      if (format == null) {
        format = this._format_from_path(path);
      }
      if (format == null) {
        throw new E.Dba_extension_unknown('^dba@333^', path);
      }
      switch (format) {
        case 'sqlite':
          this._vacuum_atomically({schema, path});
          break;
        default:
          /* TAINT when format derived from path, may be undefined, making the error message unintelligible */
          throw new E.Dba_format_unknown('^dba@307^', format);
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _vacuum_atomically(cfg) {
      var path, schema, schema_i, tmpdir_path, tmpfile_path;
      validate.dba_vacuum_atomically((cfg = {...this.types.defaults.dba_vacuum_atomically, ...cfg}));
      ({schema, path} = cfg);
      schema_i = this.sql.I(schema);
      try {
        tmpdir_path = TMP.directory({
          prefix: this.cfg._temp_prefix
        });
        tmpfile_path = PATH.join(tmpdir_path, PATH.basename(path));
        this.run(`vacuum ${schema_i} into ?;`, [tmpfile_path]);
        FS.renameSync(tmpfile_path, path);
      } finally {
        FS.rmdirSync(tmpdir_path);
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    is_ram_db(cfg) {
      var error, schema, sql;
      validate.dba_is_ram_db_cfg((cfg = {...this.types.defaults.dba_is_ram_db_cfg, ...cfg}));
      ({schema} = cfg);
      sql = "select file from pragma_database_list where name = ? limit 1;";
      try {
        return this.types.isa.dba_ram_path(this.single_value(this.query(sql, [schema])));
      } catch (error1) {
        error = error1;
        if (error instanceof E.Dba_expected_one_row) {
          throw new E.Dba_schema_unknown('^dba@308^', schema);
        }
        throw error;
      }
    }

    //---------------------------------------------------------------------------------------------------------
    _list_temp_schema_numbers() {
      var matcher, sql;
      matcher = this.cfg._temp_prefix + '%';
      sql = `select
    cast( substring( name, ? ) as integer ) as n
  from pragma_database_list
  where name like ?;`;
      return this.all_first_values(this.query(sql, [this.cfg._temp_prefix.length + 1, matcher]));
    }

    //---------------------------------------------------------------------------------------------------------
    _max_temp_schema_number() {
      var matcher, ref1, sql;
      matcher = this.cfg._temp_prefix + '%';
      sql = `select
    max( cast( substring( name, ? ) as integer ) ) as n
  from pragma_database_list
  where name like ?;`;
      return (ref1 = this.first_value(this.query(sql, [this.cfg._temp_prefix.length + 1, matcher]))) != null ? ref1 : 0;
    }

    //---------------------------------------------------------------------------------------------------------
    _get_free_temp_schema() {
      return this.cfg._temp_prefix + `${this._max_temp_schema_number() + 1}`;
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
        throw new E.Dba_expected_one_row('dba@763^', 0);
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
    _get_foreign_key_state() {
      return !!(this.pragma("foreign_keys;"))[0].foreign_keys;
    }

    //---------------------------------------------------------------------------------------------------------
    _set_foreign_key_state(onoff) {
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
      throw new E.Dba_not_implemented('^dba@311^', "method dba.catalog()");
      return this.query("select * from sqlite_schema order by type desc, name;");
    }

    //---------------------------------------------------------------------------------------------------------
    walk_objects(cfg) {
      var ordering, ordering_x, schema, schema_i, schema_s, seq;
      validate.dba_walk_objects_cfg((cfg = {...this.types.defaults.dba_walk_objects_cfg, ...cfg}));
      schema = cfg.schema;
      ordering = cfg._ordering;
      if (schema == null) {
        return this._walk_all_objects();
      }
      schema_i = this.sql.I(schema);
      schema_s = this.sql.L(schema);
      ordering_x = ordering === 'drop' ? 'desc' : 'asc';
      seq = this.first_value(this.query(this.sql.SQL`select seq from pragma_database_list where name = ${this.sql.L(schema)};`));
      //.......................................................................................................
      return this.query(this.sql.SQL`select
    ${seq}            as seq,
    ${this.sql.L(schema)}  as schema,
    name              as name,
    type              as type,
    sql               as sql
  from ${this.sql.I(schema)}.sqlite_schema
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
        schema_i = this.sql.I(schema);
        schema_s = this.sql.L(schema);
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
      var has_schema;
      validate.dba_is_empty_cfg((cfg = {...this.types.defaults.dba_is_empty_cfg, ...cfg}));
      if (typeof name === "undefined" || name === null) {
        return (has_schema = this._is_empty_schema(this.sql.I(schema)));
      }
      throw new E.Dba_not_implemented('^dba@312^', `dba.is_empty() for anything but schemas (got ${rpr(cfg)})`);
    }

    //---------------------------------------------------------------------------------------------------------
    _is_empty_schema(schema_i) {
      return (this.list(this.query(`select 1 from ${schema_i}.sqlite_schema limit 1;`))).length === 0;
    }

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
      var ref1;
      validate.dba_has_cfg((cfg = {...this.types.defaults.dba_has_cfg, ...cfg}));
      return ref1 = cfg.schema, indexOf.call(this.list_schema_names(), ref1) >= 0;
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
    _path_of_schema(schema, fallback = misfit) {
      var R;
      R = this.first_value(this.query("select file from pragma_database_list where name = ?;", [schema]));
      if (R != null) {
        return R;
      }
      if (fallback !== misfit) {
        return fallback;
      }
      throw new E.Dba_schema_unknown('^dba@313^', schema);
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
      return this.query(`pragma ${this.sql.I(schema)}.foreign_key_list( ${this.sql.I(table)} )`);
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
    // ### TAINT Error: index associated with UNIQUE or PRIMARY KEY constraint cannot be dropped ###
    // clear: ( cfg ) ->
    //   validate.ic_schema schema
    //   schema_i      = @sql.I schema
    //   R             = 0
    //   fk_state      = @_get_foreign_key_state()
    //   @_set_foreign_key_state off
    //   for { type, name, } in @list @walk_objects { schema, _ordering: 'drop', }
    //     statement = "drop #{type} if exists #{@sql.I name};"
    //     @execute statement
    //     R += +1
    //   @_set_foreign_key_state fk_state
    //   return R

      //---------------------------------------------------------------------------------------------------------
    _attach(cfg) {
      var error, path, saveas, schema;
      validate.dba_attach_cfg((cfg = {...this.types.defaults.dba_attach_cfg, ...cfg}));
      ({path, schema, saveas} = cfg);
      //.......................................................................................................
      if (this.has({schema})) {
        throw new E.Dba_schema_exists('^dba@314^', schema);
      }
      try {
        //.......................................................................................................
        this.run("attach ? as ?;", [path, schema]);
      } catch (error1) {
        error = error1;
        if (error.code !== 'SQLITE_ERROR') {
          throw error;
        }
        if (error.message.startsWith('too many attached databases')) {
          throw new E.Dba_sqlite_too_many_dbs('^dba@315^', schema);
        }
        throw new E.Dba_sqlite_error('^dba@316^', error);
      }
      this._schemas = lets(this._schemas, (d) => {
        return d[schema] = {
          path: saveas
        };
      });
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _detach(cfg) {
      validate.dba_detach_cfg((cfg = {...this.types.defaults.dba_detach_cfg, ...cfg}));
      this.execute(this.sql.SQL`detach ${this.sql.I(cfg.schema)};`);
      this._schemas = lets(this._schemas, (d) => {
        return delete d[cfg.schema];
      });
      return null;
    }

    //=========================================================================================================
    // IN-MEMORY PROCESSING
    //-----------------------------------------------------------------------------------------------------------
    _move_schema(cfg) {
      return this._copy_or_move_schema(cfg, true);
    }

    _copy_schema(cfg) {
      return this._copy_or_move_schema(cfg, false);
    }

    //-----------------------------------------------------------------------------------------------------------
    _copy_or_move_schema(cfg, detach_schema = false) {
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
      validate.copy_or_move_schema_cfg((cfg = {...this.types.defaults.copy_or_move_schema_cfg, ...cfg}));
      ({from_schema, to_schema} = cfg);
      //.......................................................................................................
      if (from_schema === to_schema) {
        throw new E.Dba_schema_repeated('^dba@317^', from_schema);
      }
      //.......................................................................................................
      known_schemas = this.list_schema_names();
      if (indexOf.call(known_schemas, from_schema) < 0) {
        throw new E.Dba_schema_unknown('^dba@318^', from_schema);
      }
      if (indexOf.call(known_schemas, to_schema) < 0) {
        throw new E.Dba_schema_unknown('^dba@319^', to_schema);
      }
      //.......................................................................................................
      to_schema_objects = this.list(this.walk_objects({
        schema: to_schema
      }));
      if (to_schema_objects.length > 0) {
        throw new E.Dba_schema_nonempty('^dba@320^', to_schema);
      }
      //.......................................................................................................
      from_schema_objects = this.list(this.walk_objects({
        schema: from_schema
      }));
      if (from_schema_objects.length === 0) {
        return detach_from_schema();
      }
      //.......................................................................................................
      to_schema_x = this.sql.I(to_schema);
      from_schema_x = this.sql.I(from_schema);
      inserts = [];
      fk_state = this._get_foreign_key_state();
      this._set_foreign_key_state(false);
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
          throw new E.Dba_unexpected_db_object_type('^dba@321^', d.type, d);
        }
        //.....................................................................................................
        /* TAINT using not-so reliable string replacement as substitute for proper parsing */
        name_x = this.sql.I(d.name);
        sql = d.sql.replace(/\s*CREATE\s*(TABLE|INDEX|VIEW)\s*/i, `create ${d.type} ${to_schema_x}.`);
        //.....................................................................................................
        if (sql === d.sql) {
          throw new E.Dba_unexpected_sql('^dba@322^', d.sql);
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
      this._set_foreign_key_state(fk_state);
      if (fk_state) {
        this.pragma(`${this.sql.I(to_schema)}.foreign_key_check;`);
      }
      return detach_from_schema();
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

}).call(this);

//# sourceMappingURL=main.js.map