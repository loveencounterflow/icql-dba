(function() {
  'use strict';
  var CND, E, badge, debug, declare, echo, help, info, isa, rpr, size_of, type_of, types, urge, validate, validate_optional, warn, whisper;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'ICQL-DBA/SQL';

  debug = CND.get_logger('debug', badge);

  warn = CND.get_logger('warn', badge);

  info = CND.get_logger('info', badge);

  urge = CND.get_logger('urge', badge);

  help = CND.get_logger('help', badge);

  whisper = CND.get_logger('whisper', badge);

  echo = CND.echo.bind(CND);

  types = require('./types');

  ({isa, validate, validate_optional, declare, size_of, type_of} = types);

  E = require('./errors');

  //===========================================================================================================
  this.Sql = (function() {
    class Sql {
      constructor() {
        //---------------------------------------------------------------------------------------------------------
        this.I = this.I.bind(this);
        //---------------------------------------------------------------------------------------------------------
        this.L = this.L.bind(this);
        //---------------------------------------------------------------------------------------------------------
        this.X = this.X.bind(this);
      }

      I(name) {
        return '"' + (name.replace(/"/g, '""')) + '"';
      }

      L(x) {
        var type;
        if (x == null) {
          return 'null';
        }
        switch (type = type_of(x)) {
          case 'text':
            return "'" + (x.replace(/'/g, "''")) + "'";
          // when 'list'       then return "'#{@list_as_json x}'"
          case 'float':
            return x.toString();
          case 'boolean':
            return (x ? '1' : '0');
        }
        // when 'list'       then throw new Error "^dba@23^ use `X()` for lists"
        throw new E.Dba_sql_value_error('^dba@404^', type, x);
      }

      X(x) {
        var e, type;
        if ((type = type_of(x)) !== 'list') {
          throw new E.Dba_sql_not_a_list_error('^dba@405^', type, x);
        }
        return '( ' + (((function() {
          var i, len, results;
          results = [];
          for (i = 0, len = x.length; i < len; i++) {
            e = x[i];
            results.push(this.L(e));
          }
          return results;
        }).call(this)).join(', ')) + ' )';
      }

      //---------------------------------------------------------------------------------------------------------
      interpolate(sql, Q) {
        return sql.replace(this._interpolation_pattern, ($0, $1) => {
          return this.as_sql(Q[$1]);
        });
      }

    };

    // #---------------------------------------------------------------------------------------------------------
    // constructor: ( dba ) ->
    //   # super()
    //   @cfg    = cfg ### TAINT freeze ###
    //   return undefined

    //---------------------------------------------------------------------------------------------------------
    Sql.prototype.SQL = String.raw;

    // try
    //   return @as_sql Q[ $1 ]
    // catch error
    //   throw new E.Dba_error \
    //     "µ773 when trying to express placeholder #{rpr $1} as SQL literal, an error occurred: #{rpr error.message}"
    Sql.prototype._interpolation_pattern = /\$(?:(.+?)\b|\{([^}]+)\})/g;

    return Sql;

  }).call(this);

}).call(this);

//# sourceMappingURL=sql.js.map