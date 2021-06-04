(function() {
  'use strict';
  var CND, E, badge, debug, echo, help, info, rpr, urge, warn, whisper;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'ICQL-DBA/SQL-MIXIN';

  debug = CND.get_logger('debug', badge);

  warn = CND.get_logger('warn', badge);

  info = CND.get_logger('info', badge);

  urge = CND.get_logger('urge', badge);

  help = CND.get_logger('help', badge);

  whisper = CND.get_logger('whisper', badge);

  echo = CND.echo.bind(CND);

  //...........................................................................................................
  E = require('./errors');

  //-----------------------------------------------------------------------------------------------------------
  this.Sql_mixin = (clasz = Object) => {
    return (function() {
      var _Class;

      _Class = class extends clasz {
        //=========================================================================================================
        // SQL CONSTRUCTION
        //---------------------------------------------------------------------------------------------------------
        as_identifier(x) {
          this.types.validate.text(x);
          return '"' + (x.replace(/"/g, '""')) + '"';
        }

        //---------------------------------------------------------------------------------------------------------
        escape_text(x) {
          this.types.validate.text(x);
          return x.replace(/'/g, "''");
        }

        //---------------------------------------------------------------------------------------------------------
        list_as_json(x) {
          this.types.validate.list(x);
          return JSON.stringify(x);
        }

        //---------------------------------------------------------------------------------------------------------
        as_sql(x) {
          var type;
          switch (type = this.types.type_of(x)) {
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
          }
          throw new E.Dba_sql_value_error('^dba@323^', type, x);
        }

        //---------------------------------------------------------------------------------------------------------
        interpolate(sql, Q) {
          return sql.replace(this._interpolation_pattern, ($0, $1) => {
            return this.as_sql(Q[$1]);
          });
        }

      };

      // try
      //   return @as_sql Q[ $1 ]
      // catch error
      //   throw new E.Dba_error \
      //     "µ773 when trying to express placeholder #{rpr $1} as SQL literal, an error occurred: #{rpr error.message}"
      _Class.prototype._interpolation_pattern = /\$(?:(.+?)\b|\{([^}]+)\})/g;

      return _Class;

    }).call(this);
  };

}).call(this);

//# sourceMappingURL=sql-mixin.js.map