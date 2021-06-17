(function() {
  'use strict';
  var CND, E, FS, PATH, badge, debug, echo, help, info, misfit, rpr, urge, warn, whisper;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'ICQL-DBA/IMPORT-EXPORT-MIXIN';

  debug = CND.get_logger('debug', badge);

  warn = CND.get_logger('warn', badge);

  info = CND.get_logger('info', badge);

  urge = CND.get_logger('urge', badge);

  help = CND.get_logger('help', badge);

  whisper = CND.get_logger('whisper', badge);

  echo = CND.echo.bind(CND);

  //...........................................................................................................
  PATH = require('path');

  FS = require('fs');

  E = require('./errors');

  ({misfit} = require('./common'));

  // #-----------------------------------------------------------------------------------------------------------
  // any_value_null = ( input_columns, object ) ->
  //   for k in input_columns
  //     return true unless object[ k ]?
  //   return false

  // #-----------------------------------------------------------------------------------------------------------
  // all_values_null = ( input_columns, object ) ->
  //   for k in input_columns
  //     return false if object[ k ]?
  //   return true

  //-----------------------------------------------------------------------------------------------------------
  this.Import_export_mixin = (clasz = Object) => {
    return class extends clasz {
      //---------------------------------------------------------------------------------------------------------
      async import(cfg) {
        cfg = {...this.types.defaults.dba_import_cfg, ...cfg};
        if (cfg.format == null) {
          cfg.format = this._format_from_path(cfg.path);
        }
        this.types.validate.dba_import_cfg(cfg);
        switch (cfg.format) {
          // when 'db'   then await @_import_db  cfg
          // when 'sql'  then await @_import_sql cfg
          case 'csv':
          case 'tsv':
            await this._import_csv_tsv(cfg);
            break;
          default:
            if (this.types._import_formats.has(cfg.format)) {
              throw new E.Dba_not_implemented('^dba@309^', `import format ${rpr(cfg.format)}`);
            }
            throw new E.Dba_import_format_unknown('^dba@309^', cfg.format);
        }
        return null;
      }

      //=========================================================================================================
      // FORMAT GUESSING
      //---------------------------------------------------------------------------------------------------------
      _extension_from_path(path) {
        var R;
        if ((R = PATH.extname(path)) === '') {
          return null;
        } else {
          return R.slice(1);
        }
      }

      _format_from_path(path) {
        var ref;
        return (ref = this._formats[this._extension_from_path(path)]) != null ? ref : null;
      }

      //---------------------------------------------------------------------------------------------------------
      _import_db(cfg) {
        var tmp_schema;
        tmp_schema = this._get_free_temp_schema();
        this._attach({
          schema: tmp_schema,
          path: cfg.path
        });
        // debug '^469465^', @list_schemas()
        this._attach({
          schema: cfg.schema,
          path: ''
        });
        // debug '^469465^', @list_schemas()
        this.copy_schema({
          from_schema: tmp_schema,
          to_schema: cfg.schema
        });
        this._detach({
          schema: tmp_schema
        });
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _import_sql(cfg) {
        throw new E.Dba_format_unknown('^dba@310^', 'sql');
      }

      //---------------------------------------------------------------------------------------------------------
      _import_csv_tsv(cfg) {
        return new Promise((resolve, reject) => {
          /* TAINT always requires `ram: true` */
          /* TAINT no streaming, no batching */
          /* TAINT no configurable CSV parsing */
          /* NOTE optimisation: instead of n-readlines, use (unpublished) `chunkreader` that reads n bytes,
               only looks for last newline, then parses chunk */
          /* NOTE optimisation: do not call `insert` for each line, but assemble big `insert .. values (...)`
               statement (as done before, should be fastest) */
          var _extra, batch_size, buffer, flush, has_stopped, input_columns, insert, is_first, lnr, parse_csv, parser_cfg, parser_cfg_defaults, path, row_count, schema, skip_all_null, skip_any_null, source, stop, stream, table_columns, table_name, transform;
          parse_csv = require('csv-parser');
          cfg = {...this.types.defaults.dba_import_cfg, ...this.types.defaults.dba_import_cfg_csv, ...cfg};
          this.types.validate.dba_import_cfg_csv(cfg);
          ({path, schema, transform, input_columns, table_columns, skip_any_null, skip_all_null, table_name, _extra} = cfg);
          if (cfg.format === 'tsv') {
            parser_cfg_defaults = this.types.defaults.dba_import_cfg_tsv_extra;
          } else {
            parser_cfg_defaults = this.types.defaults.dba_import_cfg_csv_extra;
          }
          parser_cfg = {
            ...parser_cfg_defaults,
            ..._extra,
            columns: input_columns
          };
          //.......................................................................................................
          if (input_columns === false) {
            parser_cfg.headers = false;
          } else if (input_columns === true) {
            delete parser_cfg.headers;
          } else {
            parser_cfg.headers = input_columns;
          }
          parser_cfg.skipComments = cfg.skip_comments;
          this.types.validate.dba_import_cfg_csv_extra(parser_cfg);
          //.......................................................................................................
          stop = Symbol.for('stop');
          lnr = 0;
          buffer = null;
          batch_size = 1_000;
          this._attach({
            schema,
            ram: true
          });
          insert = null;
          is_first = true;
          row_count = 0;
          has_stopped = false;
          source = null;
          stream = null;
          //.......................................................................................................
          flush = async() => {
            var column, i, j, len, len1, row, rows, subrow, subrows;
            if (has_stopped) {
              return null;
            }
            if (is_first) {
              is_first = false;
              ({insert, table_columns} = this._create_csv_table({schema, table_name, input_columns, table_columns}));
            }
            // debug '^324^', input_columns
            // debug '^324^', table_columns
            if (buffer == null) {
              return;
            }
            rows = buffer;
            buffer = null;
//.....................................................................................................
            for (i = 0, len = rows.length; i < len; i++) {
              row = rows[i];
              row_count++;
              if (transform == null) {
                insert.run((function() {
                  var ref, results;
                  results = [];
                  for (column in table_columns) {
                    results.push((ref = row[column]) != null ? ref : null);
                  }
                  return results;
                })());
                continue;
              }
              //...................................................................................................
              subrows = (await transform({row, stop}));
              if (subrows === stop) {
                has_stopped = true;
                source.destroy();
                stream.destroy();
                stream.emit('end');
                return null;
              }
              if (subrows == null) {
                continue;
              }
              if (this.types.isa.list(subrows)) {
                for (j = 0, len1 = subrows.length; j < len1; j++) {
                  subrow = subrows[j];
                  insert.run((function() {
                    var results;
                    results = [];
                    for (column in table_columns) {
                      results.push(subrow[column]);
                    }
                    return results;
                  })());
                }
                continue;
              }
              insert.run((function() {
                var results;
                results = [];
                for (column in table_columns) {
                  results.push(subrows[column]);
                }
                return results;
              })());
            }
            return null;
          };
          // #.......................................................................................................
          // echo '^3423^'
          // ### !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! ###
          // t2 = require '../../hengist/node_modules/through2'
          // ### !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! ###
          // xxx = true
          // xxx = false
          // if xxx
          //   source  = FS.createReadStream path, { highWaterMark: 10, }
          //   stream  = source.pipe t2 ( chunk, encoding, callback ) ->
          //     # debug '^333442^', chunk.length
          //     @push chunk
          //     callback()
          //   stream  = stream.pipe parse_csv parser_cfg
          // else
          source = FS.createReadStream(path);
          stream = source.pipe(parse_csv(parser_cfg));
          //.......................................................................................................
          stream.on('data', async(row) => {
            var all_columns_null, column, i, len, new_row, ref, v;
            if (has_stopped) {
              return null;
            }
            all_columns_null = true;
            new_row = {};
//.....................................................................................................
            for (i = 0, len = input_columns.length; i < len; i++) {
              column = input_columns[i];
              v = (ref = row[column]) != null ? ref : null;
              if ((v != null) && cfg.trim) {
                v = v.trim();
              }
              if (v === '') {
                v = null;
              }
              if (v === null) {
                if (skip_any_null) {
                  return null;
                }
                new_row[column] = cfg.default_value;
              } else {
                all_columns_null = false;
                new_row[column] = v;
              }
            }
            if (skip_all_null && all_columns_null) {
              //.....................................................................................................
              return null;
            }
            (buffer != null ? buffer : buffer = []).push(new_row);
            if (buffer.length >= batch_size) {
              await flush();
            }
            return null;
          });
          //.......................................................................................................
          stream.on('headers', (headers) => {
            return input_columns = headers;
          });
          stream.on('end', async() => {
            await flush();
            return resolve({row_count});
          });
          //.......................................................................................................
          return null;
        });
      }

      //---------------------------------------------------------------------------------------------------------
      _create_csv_table(cfg) {
        var _, columns_sql, create_sql, error, input_columns, insert, n, placeholder_sql, schema, schema_i, t, table_columns, table_name, table_name_i;
        ({schema, input_columns, table_columns, table_name} = cfg);
        //.......................................................................................................
        // debug '^3534^', { table_columns, input_columns, }
        if (table_columns == null) {
          table_columns = input_columns;
        }
        if (this.types.isa.list(table_columns)) {
          (() => {
            var _tc, i, k, len, results;
            _tc = table_columns;
            table_columns = {};
            results = [];
            for (i = 0, len = _tc.length; i < len; i++) {
              k = _tc[i];
              results.push(table_columns[k] = 'text');
            }
            return results;
          })();
        }
        // debug '^3534^', { table_columns, input_columns, }
        //.......................................................................................................
        schema_i = this.sql.I(schema);
        table_name_i = this.sql.I(table_name);
        columns_sql = ((function() {
          var results;
          results = [];
          for (n in table_columns) {
            t = table_columns[n];
            results.push(`${this.sql.I(n)} ${this.sql.I(t)}`);
          }
          return results;
        }).call(this)).join(', ');
        placeholder_sql = ((function() {
          var results;
          results = [];
          for (_ in table_columns) {
            results.push("?");
          }
          return results;
        })()).join(', ');
        create_sql = `create table ${schema_i}.${table_name_i} ( ${columns_sql} );`;
        try {
          this.execute(create_sql);
        } catch (error1) {
          error = error1;
          warn(CND.reverse(`when trying to execute SQL:

${create_sql}

an error was encountered: ${error.message}`));
          throw error;
        }
        //.......................................................................................................
        insert = this.prepare(`insert into ${schema_i}.${table_name_i} values ( ${placeholder_sql} );`);
        return {insert, table_columns};
      }

      //---------------------------------------------------------------------------------------------------------
      _import_sql_single(cfg) {
        this.execute(FS.readFileSync(cfg.path, {
          encoding: 'utf-8'
        }));
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _import_sql_batch(cfg) {
        var compound_statement, ref, statements;
        ref = this._walk_batches(this._walk_statements_from_path(cfg.path), cfg.batch_size);
        for (statements of ref) {
          compound_statement = statements.join('');
          count += compound_statement.length;
          this.execute(compound_statement);
        }
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      * _walk_statements_from_path(sql_path) {
        /* Given a path, iterate over SQL statements which are signalled by semicolons (`;`) that appear outside
           of literals and comments (and the end of input). */
        /* thx to https://stackabuse.com/reading-a-file-line-by-line-in-node-js/ */
        /* thx to https://github.com/nacholibre/node-readlines */
        var cfg, collector, cur_idx, flush, i, len, line, readlines, ref, token, tokenize;
        readlines = new (require('n-readlines'))(sql_path);
        //.......................................................................................................
        cfg = {
          regExp: require('mysql-tokenizer/lib/regexp-sql92')
        };
        tokenize = (require('mysql-tokenizer'))(cfg);
        collector = null;
        // stream        = FS.createReadStream sql_path
        //.......................................................................................................
        flush = function() {
          var R;
          R = collector.join('');
          collector = null;
          return R;
        };
        //.......................................................................................................
        while ((line = readlines.next()) !== false) {
          ref = tokenize(line + '\n');
          for (cur_idx = i = 0, len = ref.length; i < len; cur_idx = ++i) {
            token = ref[cur_idx];
            if (token === ';') {
              (collector != null ? collector : collector = []).push(token);
              yield flush();
              continue;
            }
            // if token.startsWith '--'
            //   continue
            (collector != null ? collector : collector = []).push(token);
          }
        }
        if (collector != null) {
          //.......................................................................................................
          yield flush();
        }
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      * _walk_batches(iterator, batch_size = 1) {
        /* Given an iterator and a batch size, iterate over lists of values yielded by the iterator. */
        var batch, d;
        batch = null;
        for (d of iterator) {
          (batch != null ? batch : batch = []).push(d);
          if (batch.length >= batch_size) {
            yield batch;
            batch = null;
          }
        }
        if (batch != null) {
          yield batch;
        }
        return null;
      }

    };
  };

}).call(this);

//# sourceMappingURL=import-export-mixin.js.map