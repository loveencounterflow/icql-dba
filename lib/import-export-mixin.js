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
            await this._import_csv(cfg);
            break;
          default:
            throw new E.Dba_format_unknown('^dba@309^', format);
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
      _import_csv(cfg) {
        return new Promise((resolve, reject) => {
          /* TAINT always requires `ram: true` */
          /* TAINT no streaming, no batching */
          /* TAINT no configurable CSV parsing */
          /* NOTE optimisation: instead of n-readlines, use (unpublished) `chunkreader` that reads n bytes,
               only looks for last newline, then parses chunk */
          /* NOTE optimisation: do not call `insert` for each line, but assemble big `insert .. values (...)`
               statement (as done before, should be fastest) */
          var _extra, batch_size, buffer, csv_cfg, flush, input_columns, insert, is_first, lnr, parse_csv, path, row_count, schema, skip_blank, skip_empty, skip_first, stop, table_columns, table_name, transform;
          parse_csv = require('csv-parser');
          cfg = {...this.types.defaults.dba_import_cfg, ...this.types.defaults.dba_import_cfg_csv, ...cfg};
          this.types.validate.dba_import_cfg_csv(cfg);
          ({path, schema, transform, input_columns, table_columns, skip_first, skip_empty, skip_blank, table_name, _extra} = cfg);
          csv_cfg = {
            ...this.types.defaults.dba_import_cfg_csv_extra,
            ..._extra,
            columns: input_columns
          };
          //.......................................................................................................
          if (input_columns === false) {
            csv_cfg.headers = false;
          } else if (input_columns === true) {
            delete csv_cfg.headers;
          } else {
            csv_cfg.headers = input_columns;
          }
          //.......................................................................................................
          debug('^675675^', cfg);
          urge('^675675^', csv_cfg);
          // if transform? then csv_cfg.relax_column_count = true
          this.types.validate.dba_import_cfg_csv_extra(csv_cfg);
          stop = Symbol.for('stop');
          lnr = 0;
          buffer = null;
          batch_size = 10000;
          this._attach({
            schema,
            ram: true
          });
          insert = null;
          is_first = true;
          row_count = 0;
          //.......................................................................................................
          flush = () => {
            var column, i, j, len, len1, row, subrow, subrows;
            if (is_first) {
              is_first = false;
              ({insert, table_columns} = this._create_csv_table({schema, table_name, input_columns, table_columns}));
            }
            // debug '^324^', input_columns
            // debug '^324^', table_columns
            if (!((buffer != null) && buffer.length > 0)) {
              return;
            }
//.....................................................................................................
            for (i = 0, len = buffer.length; i < len; i++) {
              row = buffer[i];
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
              subrows = transform({row, stop});
              if (subrows === stop) {
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
          //.......................................................................................................
          //.....................................................................................................
          FS.createReadStream(path).pipe(parse_csv(csv_cfg)).on('data', (row) => {
            (buffer != null ? buffer : buffer = []).push(row);
            if (buffer.length >= batch_size) {
              flush();
            }
            return null;
          //.....................................................................................................
          }).on('headers', (headers) => {
            return input_columns = headers;
          }).on('end', () => {
            flush();
            return resolve({row_count});
          });
          //.......................................................................................................
          return null;
        });
      }

      //---------------------------------------------------------------------------------------------------------
      _create_csv_table(cfg) {
        var _, columns_sql, create_sql, input_columns, insert, n, placeholder_sql, schema, schema_i, t, table_columns, table_name, table_name_i;
        ({schema, input_columns, table_columns, table_name} = cfg);
        //.......................................................................................................
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
        //.......................................................................................................
        schema_i = this.as_identifier(schema);
        table_name_i = this.as_identifier(table_name);
        columns_sql = ((function() {
          var results;
          results = [];
          for (n in table_columns) {
            t = table_columns[n];
            results.push(`${this.as_identifier(n)} ${this.as_identifier(t)}`);
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
        this.execute(create_sql);
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