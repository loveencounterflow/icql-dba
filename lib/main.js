(function() {
  'use strict';
  var CND, Checks_mixin, E, FS, Functions_mixin, HOLLERITH, Import_export_mixin, L, PATH, SQL, TMP, badge, debug, echo, freeze, guy, help, info, lets, misfit, new_bsqlt3_connection, rpr, types, urge, warn, whisper,
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

  ({freeze, lets} = require('letsfreezethat'));

  L = this;

  ({misfit} = require('./common'));

  E = require('./errors');

  new_bsqlt3_connection = require('better-sqlite3');

  PATH = require('path');

  TMP = require('tempy');

  ({Import_export_mixin} = require('./import-export-mixin'));

  ({Functions_mixin} = require('./functions-mixin'));

  ({Checks_mixin} = require('./checks-mixin'));

  guy = require('guy');

  SQL = String.raw;

  //===========================================================================================================

  //-----------------------------------------------------------------------------------------------------------
  this.Dba = class Dba extends Checks_mixin(Functions_mixin(Import_export_mixin())) {
    //---------------------------------------------------------------------------------------------------------
    constructor(cfg) {
      super();
      guy.props.def(this, 'types', {
        enumerable: false,
        value: types
      });
      guy.props.def(this, '_statements', {
        enumerable: false,
        value: {}
      });
      guy.props.def(this, 'sql', {
        enumerable: false,
        value: new (require('./sql')).Sql()
      });
      this._schemas = freeze({});
      this.cfg = freeze({...this.types.defaults.dba_constructor_cfg, ...cfg});
      this.types.validate.dba_constructor_cfg(this.cfg);
      this._dbg = {
        debug: this.cfg.debug,
        echo: this.cfg.echo
      };
      this._formats = freeze({...this.types.defaults.extensions_and_formats});
      if (this.cfg.sqlt != null) {
        throw new E.Dba_cfg_error('^dba@300^', "property `sqlt` not supported");
      }
      if (this.cfg.schema != null) {
        throw new E.Dba_cfg_error('^dba@301^', "property `schema` not supported");
      }
      if (this.cfg.path != null) {
        throw new E.Dba_cfg_error('^dba@302^', "property `path` not supported");
      }
      this._bsqlt3_cfg = freeze({
        readonly: this.cfg.readonly,
        fileMustExist: !this.cfg.create,
        timeout: this.cfg.timeout
      });
      // verbose:        ### TAINT to be done ###
      this._state = freeze({
        in_unsafe_mode: false,
        initialized: false
      });
      //.......................................................................................................
      guy.props.def_oneoff(this, 'sqlt', {}, () => {
        var connection;
        connection = new_bsqlt3_connection('', this._bsqlt3_cfg);
        this.initialize_sqlt(connection);
        this._state = lets(this._state, function(d) {
          return d.initialized = true;
        });
        return connection;
      });
      //.......................................................................................................
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    initialize_sqlt(sqlt) {
      sqlt.pragma("foreign_keys = true;");
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    open(cfg) {
      var path, ram, saveas, schema;
      this.types.validate.dba_open_cfg((cfg = {...this.types.defaults.dba_open_cfg, ...cfg}));
      ({path, schema, ram} = cfg);
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
    save(cfg) {
      var path, ref1, ref2, schema;
      /* TAINT could implement prohibition of `path` in type `dba_save_cfg` */
      this.types.validate.dba_save_cfg((cfg = {...this.types.defaults.dba_export_cfg, ...cfg}));
      ({schema, path} = cfg);
      if (path != null) {
        throw new E.Dba_argument_not_allowed('^dba@303^', 'path', path);
      }
      path = (ref1 = (ref2 = this._schemas[schema]) != null ? ref2.path : void 0) != null ? ref1 : null;
      if (path == null) {
        throw new E.Dba_schema_unknown('^dba@304^', schema);
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
      this.types.validate.dba_export_cfg((cfg = {...this.types.defaults.dba_export_cfg, ...cfg}));
      ({schema, path, format} = cfg);
      if (format == null) {
        format = this._format_from_path(path);
      }
      if (format == null) {
        throw new E.Dba_extension_unknown('^dba@305^', path);
      }
      switch (format) {
        case 'sqlite':
          this._vacuum_atomically({schema, path});
          break;
        default:
          /* TAINT when format derived from path, may be undefined, making the error message unintelligible */
          throw new E.Dba_format_unknown('^dba@306^', format);
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _vacuum_atomically(cfg) {
      var path, schema, schema_i, tmpdir_path, tmpfile_path;
      this.types.validate.dba_vacuum_atomically((cfg = {...this.types.defaults.dba_vacuum_atomically, ...cfg}));
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
      this.types.validate.dba_is_ram_db_cfg((cfg = {...this.types.defaults.dba_is_ram_db_cfg, ...cfg}));
      ({schema} = cfg);
      sql = "select file from pragma_database_list where name = ? limit 1;";
      try {
        return this.types.isa.dba_ram_path(this.single_value(this.query(sql, [schema])));
      } catch (error1) {
        error = error1;
        if (error instanceof E.Dba_expected_one_row) {
          throw new E.Dba_schema_unknown('^dba@307^', schema);
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
      var x;
      if ((x = arguments[1]) != null) {
        throw new E.Dba_argument_not_allowed('^dba@308^', "extra", rpr(x));
      }
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

    load_extension(...P) {
      return this.sqlt.loadExtension(...P);
    }

    pragma(...P) {
      return this.sqlt.pragma(...P);
    }

    //=========================================================================================================
    // DB STRUCTURE REPORTING
    //---------------------------------------------------------------------------------------------------------
    catalog() {
      /* TAINT kludge: we sort by descending types so views, tables come before indexes (b/c you can't drop a
         primary key index in SQLite) */
      throw new E.Dba_not_implemented('^dba@309^', "method dba.catalog()");
      return this.query("select * from sqlite_schema order by type desc, name;");
    }

    //---------------------------------------------------------------------------------------------------------
    walk_objects(cfg) {
      var ordering, ordering_x, schema, schema_i, seq;
      this.types.validate.dba_walk_objects_cfg((cfg = {...this.types.defaults.dba_walk_objects_cfg, ...cfg}));
      schema = cfg.schema;
      ordering = cfg._ordering;
      if (schema == null) {
        return this._walk_all_objects();
      }
      schema_i = this.sql.I(schema);
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
      var d, parts, ref1, row, schema, schema_i, schema_l, schemas, sql;
      schemas = {};
      parts = [];
      ref1 = this.query(SQL`select seq, name, file as path from pragma_database_list order by seq;`);
      //.......................................................................................................
      /* TAINT use API */
      for (row of ref1) {
        schemas[row.name] = row;
      }
//.......................................................................................................
      for (schema in schemas) {
        d = schemas[schema];
        schema_i = this.sql.I(schema);
        schema_l = this.sql.L(schema);
        parts.push(SQL`select
  ${d.seq} as seq,
  ${schema_l} as schema,
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
      this.types.validate.dba_is_empty_cfg((cfg = {...this.types.defaults.dba_is_empty_cfg, ...cfg}));
      if (typeof name === "undefined" || name === null) {
        return (has_schema = this._is_empty_schema(this.sql.I(cfg.schema)));
      }
      throw new E.Dba_not_implemented('^dba@310^', `dba.is_empty() for anything but schemas (got ${rpr(cfg)})`);
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
      this.types.validate.dba_has_cfg((cfg = {...this.types.defaults.dba_has_cfg, ...cfg}));
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
      throw new E.Dba_schema_unknown('^dba@311^', schema);
    }

    //---------------------------------------------------------------------------------------------------------
    type_of(cfg) {
      var name, row, schema;
      this.types.validate.dba_type_of_cfg((cfg = {...this.types.defaults.dba_type_of_cfg, ...cfg}));
      ({name, schema} = cfg);
      if (name === 'sqlite_schema' || name === 'sqlite_master') {
        return 'table';
      }
      row = this.first_row(this.query(SQL`select type from ${this.sql.I(schema)}.sqlite_schema
where name = $name
limit 1;`, {name}));
      if (row == null) {
        throw new E.Dba_object_unknown('^dba@311^', schema, name);
      }
      return row.type;
    }

    //---------------------------------------------------------------------------------------------------------
    fields_of(cfg) {
      var R, d, name, ref1, schema, schema_i, type;
      this.types.validate.dba_fields_of_cfg((cfg = {...this.types.defaults.dba_fields_of_cfg, ...cfg}));
      ({name, schema} = cfg);
      schema_i = this.sql.I(schema);
      R = {};
      ref1 = this.query(SQL`select * from ${schema_i}.pragma_table_info( $name );`, {name});
      for (d of ref1) {
        // { cid: 0, name: 'id', type: 'integer', notnull: 1, dflt_value: null, pk: 1 }
        type = d.type === '' ? null : d.type;
        R[d.name] = {
          idx: d.cid,
          type: type,
          optional: !d.notnull,
          default: d.dflt_value,
          is_pk: !!d.pk
        };
      }
      return R;
    }

    //---------------------------------------------------------------------------------------------------------
    field_names_of(cfg) {
      var d, name, schema, schema_i;
      // try
      this.types.validate.dba_field_names_of_cfg((cfg = {...this.types.defaults.dba_field_names_of_cfg, ...cfg}));
      ({name, schema} = cfg);
      schema_i = this.sql.I(schema);
      return (function() {
        var ref1, results;
        ref1 = this.query(SQL`select name from ${schema_i}.pragma_table_info( $name );`, {name});
        results = [];
        for (d of ref1) {
          results.push(d.name);
        }
        return results;
      }).call(this);
    }

    // catch error
    //   throw new E.Dba_sqlite_error '^dba@111^', error

      //---------------------------------------------------------------------------------------------------------
    dump_relation(cfg) {
      var limit, name, order_by, qname_i, schema, schema_i;
      this.types.validate.dba_dump_relation_cfg((cfg = {...this.types.defaults.dba_dump_relation_cfg, ...cfg}));
      ({schema, name, order_by, limit} = cfg);
      schema_i = this.sql.I(schema);
      qname_i = schema_i + '.' + this.sql.I(name);
      limit = cfg.limit === null ? 1e9 : cfg.limit;
      if (order_by == null) {
        order_by = 'random()';
      }
      return this.query(SQL`select * from ${qname_i} order by ${order_by} limit ${limit};`);
    }

    //---------------------------------------------------------------------------------------------------------
    _dependencies_of(table, schema = 'main') {
      return this.query(`pragma ${this.sql.I(schema)}.foreign_key_list( ${this.sql.I(table)} )`);
    }

    //---------------------------------------------------------------------------------------------------------
    dependencies_of(table, schema = 'main') {
      var row;
      this.types.validate.ic_schema(schema);
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
      this.types.validate.dba_clear_cfg((cfg = {...this.types.defaults.dba_clear_cfg, ...cfg}));
      ({schema} = cfg);
      schema_i = this.sql.I(schema);
      R = 0;
      fk_state = this.get_foreign_keys_state();
      this.set_foreign_keys_state(false);
      ref1 = this.list(this.walk_objects({
        schema,
        _ordering: 'drop'
      }));
      for (i = 0, len = ref1.length; i < len; i++) {
        ({type, name} = ref1[i]);
        statement = `drop ${type} if exists ${this.sql.I(name)};`;
        this.execute(statement);
        R += +1;
      }
      this.set_foreign_keys_state(fk_state);
      return R;
    }

    //---------------------------------------------------------------------------------------------------------
    _open_file_db_in_ram(cfg) {
      /* Given a `path` and a `schema`, create a temporary schema to open the file DB in as well as an empty
         in-memory schema; then copy all DB objects and their contents from the temporary file schema to the RAM
         schema. Finally, detach the file schema. Ensure the `path` given is kept around as the `saveas`
         (implicit) path to be used for eventual persistency (`dba.save()`). */
      /* TAINT validate? */
      var path, saveas, schema, schema_main_allowed, tmp_schema;
      schema_main_allowed = !this._state.initialized;
      ({path, schema, saveas} = cfg);
      if (this.types.isa.dba_ram_path(path)) {
        return this._attach({schema, path, saveas});
      }
      //.......................................................................................................
      tmp_schema = this._get_free_temp_schema();
      this._attach({
        schema: tmp_schema,
        path
      });
      if (!((schema === 'main') && schema_main_allowed)) {
        this._attach({
          schema,
          path: '',
          saveas
        });
      }
      this._copy_schema({
        from_schema: tmp_schema,
        to_schema: schema
      });
      this._detach({
        schema: tmp_schema
      });
      //.......................................................................................................
      this._schemas = lets(this._schemas, (d) => {
        return d[schema] = {
          path: saveas
        };
      });
/* TAINT use API call */      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _attach(cfg) {
      var connection, error, ignore, path, saveas, schema;
      /* Given a `path` and a `schema`, execute SQL"attach $path as $schema".

      `_attach()` will fail
        * if `schema` already exists, or
        * if the maximum number of schemas (10 by default) has already been attached, or
        * if the schema name is `main` and the DBA is `@_state.initialized`.

      If `@_state.initialized` is `false`, then a new `better-sqlite3` instance with a `main` schema will be
      created;
        * if the `schema` passed in is `main`, it will be opened from the `path` given.
        * If `schema` is not `main`, `main` will be opened as an empty RAM DB, and `schema` will be attached
          from the file given.
       */
      this.types.validate.dba_attach_cfg((cfg = {...this.types.defaults.dba_attach_cfg, ...cfg}));
      ({path, schema, saveas} = cfg);
      //.......................................................................................................
      if (!this._state.initialized) {
        if (schema === 'main') {
          connection = new_bsqlt3_connection(path, this._bsqlt3_cfg);
          this.initialize_sqlt(connection);
          guy.props.def(this, 'sqlt', {
            enumerable: false,
            configurable: false,
            value: connection
          });
          this._schemas = lets(this._schemas, (d) => {
            return d[schema] = {
              path: saveas
            };
          });
/* TAINT use API call */          return null;
        }
        ignore = this.sqlt/* NOTE retrieve dynamic attribute for side effect, ignore its value */
      }
      //.......................................................................................................
      if (this.has({schema})) {
        throw new E.Dba_schema_exists('^dba@312^', schema);
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
          throw new E.Dba_sqlite_too_many_dbs('^dba@313^', schema);
        }
        throw new E.Dba_sqlite_error('^dba@314^', error);
      }
      this._schemas = lets(this._schemas, (d) => {
        return d[schema] = {
          path: saveas
        };
      });
/* TAINT use API call */      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _detach(cfg) {
      this.types.validate.dba_detach_cfg((cfg = {...this.types.defaults.dba_detach_cfg, ...cfg}));
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
      this.types.validate.copy_or_move_schema_cfg((cfg = {...this.types.defaults.copy_or_move_schema_cfg, ...cfg}));
      ({from_schema, to_schema} = cfg);
      //.......................................................................................................
      if (from_schema === to_schema) {
        throw new E.Dba_schema_repeated('^dba@315^', from_schema);
      }
      //.......................................................................................................
      known_schemas = this.list_schema_names();
      if (indexOf.call(known_schemas, from_schema) < 0) {
        throw new E.Dba_schema_unknown('^dba@316^', from_schema);
      }
      if (indexOf.call(known_schemas, to_schema) < 0) {
        throw new E.Dba_schema_unknown('^dba@317^', to_schema);
      }
      //.......................................................................................................
      to_schema_objects = this.list(this.walk_objects({
        schema: to_schema
      }));
      if (to_schema_objects.length > 0) {
        throw new E.Dba_schema_nonempty('^dba@318^', to_schema);
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
      fk_state = this.get_foreign_keys_state();
      this.set_foreign_keys_state(false);
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
          throw new E.Dba_unexpected_db_object_type('^dba@319^', d.type, d);
        }
        //.....................................................................................................
        /* TAINT using not-so reliable string replacement as substitute for proper parsing */
        name_x = this.sql.I(d.name);
        sql = d.sql.replace(/\s*CREATE\s*(TABLE|INDEX|VIEW)\s*/i, `create ${d.type} ${to_schema_x}.`);
        //.....................................................................................................
        if (sql === d.sql) {
          throw new E.Dba_unexpected_sql('^dba@320^', d.sql);
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
      this.set_foreign_keys_state(fk_state);
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