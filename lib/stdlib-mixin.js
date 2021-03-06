(function() {
  'use strict';
  var CND, badge, debug, echo, freeze, help, info, lets, rpr, urge, warn, whisper;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'ICQL-DBA/STDLIB';

  debug = CND.get_logger('debug', badge);

  warn = CND.get_logger('warn', badge);

  info = CND.get_logger('info', badge);

  urge = CND.get_logger('urge', badge);

  help = CND.get_logger('help', badge);

  whisper = CND.get_logger('whisper', badge);

  echo = CND.echo.bind(CND);

  ({freeze, lets} = require('letsfreezethat'));

  //-----------------------------------------------------------------------------------------------------------
  this.Stdlib_mixin = (clasz = Object) => {
    return class extends clasz {
      /* TAINT use `cfg` */
      create_stdlib() {
        var prefix;
        if (this._state.stdlib_created) {
          return null;
        }
        this._state.stdlib_created = true;
        prefix = 'std_';
        //-------------------------------------------------------------------------------------------------------
        this.create_function({
          name: prefix + 'str_reverse',
          deterministic: true,
          varargs: false,
          call: function(s) {
            return (Array.from(s)).reverse().join('');
          }
        });
        //-------------------------------------------------------------------------------------------------------
        this.create_function({
          name: prefix + 'str_join',
          deterministic: true,
          varargs: true,
          call: function(joiner, ...P) {
            return P.join(joiner);
          }
        });
        //-------------------------------------------------------------------------------------------------------
        this.create_table_function({
          name: prefix + 'str_split_first',
          columns: ['prefix', 'suffix'],
          parameters: ['text', 'splitter'],
          deterministic: true,
          varargs: false,
          rows: function*(text, splitter) {
            var idx;
            if ((text === null) || (splitter === null)) {
              return null;
            }
            if ((idx = text.indexOf(splitter)) < 0) {
              yield [text, null];
            } else {
              yield [text.slice(0, idx), text.slice(idx + 1)];
            }
            return null;
          }
        });
        //-------------------------------------------------------------------------------------------------------
        this.create_table_function({
          name: prefix + 'generate_series',
          columns: ['value'],
          parameters: ['start', 'stop', 'step'],
          varargs: true,
          deterministic: true,
          rows: function*(start, stop = 2e308, step = 1) {
            /* NOTE: `stop` differs from SQLite3, which has 9223372036854775807 */
            var value;
            value = start;
            while (true) {
              if (value > stop) {
                break;
              }
              yield [value];
              value += step;
            }
            return null;
          }
        });
        //-------------------------------------------------------------------------------------------------------
        this.create_table_function({
          name: prefix + 're_matches',
          columns: ['match', 'capture'],
          parameters: ['text', 'pattern'],
          rows: function*(text, pattern) {
            var match, ref, regex;
            regex = new RegExp(pattern, 'g');
            while ((match = regex.exec(text)) != null) {
              yield [match[0], (ref = match[1]) != null ? ref : null];
            }
            return null;
          }
        });
        //-------------------------------------------------------------------------------------------------------
        return null;
      }

    };
  };

}).call(this);

//# sourceMappingURL=stdlib-mixin.js.map