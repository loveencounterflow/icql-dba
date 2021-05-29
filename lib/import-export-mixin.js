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
      import(cfg) {
        cfg = {...this.types.defaults.dba_import_cfg, ...cfg};
        if (cfg.format == null) {
          cfg.format = this._format_from_path(cfg.path);
        }
        this.types.validate.dba_import_cfg(cfg);
        switch (cfg.format) {
          case 'db':
            this._import_db(cfg);
            break;
          case 'sql':
            this._import_sql(cfg);
            break;
          case 'csv':
            this._import_csv(cfg);
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

      // switch cfg.method
      //   when 'single' then return @_import_sql_single cfg
      //   when 'batch'  then return @_import_sql_batch  cfg
      // return null

        // #---------------------------------------------------------------------------------------------------------
      // _import_csv1: ( cfg ) ->
      //   ### TAINT always requires `ram: true` ###
      //   ### TAINT no streaming, no batching ###
      //   ### TAINT no configurable CSV parsing ###
      //   parse       = require 'csv-parse/lib/sync'
      //   cfg         = {
      //     @types.defaults.dba_import_cfg...,
      //     @types.defaults.dba_import_cfg_csv...,
      //     cfg..., }
      //   @types.validate.dba_import_cfg_csv cfg
      //   { path
      //     schema
      //     transform
      //     _extra
      //     table }   = cfg
      //   csv_cfg     = { @types.defaults.dba_import_cfg_csv_extra..., _extra..., }
      //   @types.validate.dba_import_cfg_csv_extra csv_cfg
      //   source      = FS.readFileSync path, { encoding: 'utf-8', }
      //   rows        = parse source, csv_cfg
      //   stop        = Symbol.for 'stop'
      //   lnr         = 0
      //   line        = null
      //   #.......................................................................................................
      //   unless rows.length > 0
      //     throw new E.Dba_empty_csv '^dba@333^', path
      //   #.......................................................................................................
      //   columns = ( k for k of rows[ 0 ] )
      //   columns = transform { columns, } if transform?
      //   @_attach { schema, ram: true, }
      //   insert  = @_create_csv_table { schema, table, columns, }
      //   #.......................................................................................................
      //   for row in rows
      //     unless transform?
      //       insert.run ( row[ column ] for column in columns )
      //       continue
      //     subrows   = transform { row, lnr, line, stop, }
      //     break if subrows is stop
      //     continue unless subrows?
      //     if @types.isa.list subrows
      //       for subrow in subrows
      //         insert.run ( subrow[ column ] for column in columns )
      //       continue
      //     insert.run ( subrows[ column ] for column in columns )
      //   return null

        //---------------------------------------------------------------------------------------------------------
      _import_csv(cfg) {
        /* TAINT always requires `ram: true` */
        /* TAINT no streaming, no batching */
        /* TAINT no configurable CSV parsing */
        /* NOTE optimisation: instead of n-readlines, use (unpublished) `chunkreader` that reads n bytes,
             only looks for last newline, then parses chunk */
        /* NOTE optimisation: do not call `insert` for each line, but assemble big `insert .. values (...)`
             statement (as done before, should be fastest) */
        var _extra, batch_size, buffer, columns, csv_cfg, flush, insert, line, lnr, parse, path, readlines, schema, skip_blank, skip_empty, stop, table, transform;
        parse = require('csv-parse/lib/sync');
        cfg = {...this.types.defaults.dba_import_cfg, ...this.types.defaults.dba_import_cfg_csv, ...cfg};
        this.types.validate.dba_import_cfg_csv(cfg);
        ({path, schema, transform, columns, skip_empty, skip_blank, _extra, table} = cfg);
        csv_cfg = {...this.types.defaults.dba_import_cfg_csv_extra, ..._extra, columns};
        this.types.validate.dba_import_cfg_csv_extra(csv_cfg);
        readlines = new (require('n-readlines'))(path);
        stop = Symbol.for('stop');
        lnr = 0;
        buffer = null;
        batch_size = 10000;
        this._attach({
          schema,
          ram: true
        });
        insert = null;
        //.......................................................................................................
        flush = () => {
          var column, i, j, len, len1, line, lines, row, row_idx, rows, source, subrow, subrows;
          if (!((buffer != null) && buffer.length > 0)) {
            return;
          }
          lines = buffer;
          source = lines.join('\n');
          buffer = null;
          rows = parse(source, csv_cfg);
          // #.......................................................................................................
          // unless rows.length > 0
          //   throw new E.Dba_empty_csv '^dba@333^', path
          //.......................................................................................................
          // columns = ( k for k of rows[ 0 ] )
          // debug '^443^', { columns, }
          // columns = transform { columns, } if transform?
          /* NOTE keeping this here so we can potentially obtain columns from source */
          if (insert == null) {
            insert = this._create_csv_table({schema, table, columns});
          }
//.......................................................................................................
          for (row_idx = i = 0, len = rows.length; i < len; row_idx = ++i) {
            row = rows[row_idx];
            if (transform == null) {
              insert.run((function() {
                var j, len1, results;
                results = [];
                for (j = 0, len1 = columns.length; j < len1; j++) {
                  column = columns[j];
                  results.push(row[column]);
                }
                return results;
              })());
              continue;
            }
            line = lines[row_idx].toString('utf-8');
            lnr++;
            if (skip_empty && line === '') {
              continue;
            }
            if (skip_blank && /^\s*$/.test(line)) {
              continue;
            }
            subrows = transform({row, lnr, line, stop});
            if (subrows === stop) {
              break;
            }
            if (subrows == null) {
              continue;
            }
            if (this.types.isa.list(subrows)) {
              for (j = 0, len1 = subrows.length; j < len1; j++) {
                subrow = subrows[j];
                insert.run((function() {
                  var k, len2, results;
                  results = [];
                  for (k = 0, len2 = columns.length; k < len2; k++) {
                    column = columns[k];
                    results.push(subrow[column]);
                  }
                  return results;
                })());
              }
              continue;
            }
            insert.run((function() {
              var k, len2, results;
              results = [];
              for (k = 0, len2 = columns.length; k < len2; k++) {
                column = columns[k];
                results.push(subrows[column]);
              }
              return results;
            })());
          }
          return null;
        };
        //.......................................................................................................
        /* TAINT this use of n-readlines is inefficient as it splits the bytes into line-sized chunks which we
           then re-assembly into strings with lines. However, it only takes up a small part of the overall time
           it takes to parse and insert records. */
        while ((line = readlines.next()) !== false) {
          (buffer != null ? buffer : buffer = []).push(line);
          if (buffer.length >= batch_size) {
            flush();
          }
        }
        flush();
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _create_csv_table(cfg) {
        var ci, columns, columns_i, columns_sql, create_sql, d, placeholder_sql, schema, schema_i, table, table_i;
        ({schema, table, columns} = cfg);
        schema_i = this.as_identifier(schema);
        table_i = this.as_identifier(table);
        columns_i = (function() {
          var i, len, results;
          results = [];
          for (i = 0, len = columns.length; i < len; i++) {
            d = columns[i];
            results.push(this.as_identifier(d));
          }
          return results;
        }).call(this);
        columns_sql = ((function() {
          var i, len, results;
          results = [];
          for (i = 0, len = columns_i.length; i < len; i++) {
            ci = columns_i[i];
            results.push(`${ci} text`);
          }
          return results;
        })()).join(', ');
        placeholder_sql = ((function() {
          var i, len, results;
          results = [];
          for (i = 0, len = columns_i.length; i < len; i++) {
            ci = columns_i[i];
            results.push("?");
          }
          return results;
        })()).join(', ');
        create_sql = `create table ${schema_i}.${table_i} ( ${columns_sql} );`;
        this.execute(create_sql);
        //.......................................................................................................
        return this.prepare(`insert into ${schema_i}.${table_i} values ( ${placeholder_sql} );`);
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