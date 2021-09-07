(function() {
  'use strict';
  var CND, badge, debug, echo, help, info, rpr, urge, warn, whisper;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'ICQL-DBA/STD';

  debug = CND.get_logger('debug', badge);

  warn = CND.get_logger('warn', badge);

  info = CND.get_logger('info', badge);

  urge = CND.get_logger('urge', badge);

  help = CND.get_logger('help', badge);

  whisper = CND.get_logger('whisper', badge);

  echo = CND.echo.bind(CND);

  //-----------------------------------------------------------------------------------------------------------
  this.Stdlib_mixin = (clasz = Object) => {
    return class extends clasz {
      /* TAINT use `cfg` */
      create_stdlib(cfg) {
        this.types.validate.dba_create_stdlib_cfg((cfg = {...this.types.defaults.dba_create_stdlib_cfg, ...cfg}));
        //-------------------------------------------------------------------------------------------------------
        this.create_function({
          name: cfg.prefix + 'str_reverse',
          deterministic: true,
          varargs: false,
          call: function(s) {
            return (Array.from(s)).reverse().join('');
          }
        });
        //-------------------------------------------------------------------------------------------------------
        this.create_function({
          name: cfg.prefix + 'str_join',
          deterministic: true,
          varargs: true,
          call: function(joiner, ...P) {
            return P.join(joiner);
          }
        });
        //-------------------------------------------------------------------------------------------------------
        this.create_table_function({
          name: cfg.prefix + 'str_split_first',
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
          name: cfg.prefix + 'generate_series',
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
        return null;
      }

    };
  };

}).call(this);

//# sourceMappingURL=stdlib.js.map