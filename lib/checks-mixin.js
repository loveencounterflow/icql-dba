(function() {
  'use strict';
  var CND, E, FS, PATH, SQL, badge, debug, echo, freeze, help, info, lets, misfit, rpr, urge, warn, whisper;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'ICQL-DBA/CHECKS-MIXIN';

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

  SQL = String.raw;

  ({lets, freeze} = require('letsfreezethat'));

  //===========================================================================================================
  // CHECK, GETS, SETS
  //-----------------------------------------------------------------------------------------------------------
  this.Checks_mixin = (clasz = Object) => {
    return class extends clasz {
      //=========================================================================================================
      // FOREIGN KEYS MODE, DEFERRED
      //---------------------------------------------------------------------------------------------------------
      /* get_foreign_keys_state */
      get_foreign_keys_state() {
        return !!(this.pragma("foreign_keys;"))[0].foreign_keys;
      }

      //---------------------------------------------------------------------------------------------------------
      set_foreign_keys_state(onoff) {
        this.types.validate.boolean(onoff);
        this.pragma(`foreign_keys = ${onoff};`);
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      /* TAINT add schema, table_name; currently only works for main(?) */
      check_foreign_keys() {
        return this.pragma(SQL`foreign_key_check;`);
      }

      //---------------------------------------------------------------------------------------------------------
      set_foreign_keys_deferred(onoff) {
        this.types.validate.boolean(onoff);
        return this.pragma(SQL`defer_foreign_keys=${onoff};`);
      }

      get_foreign_keys_deferred() {
        var ref, ref1;
        return !!((ref = this.pragma(SQL`defer_foreign_keys;`)) != null ? (ref1 = ref[0]) != null ? ref1.defer_foreign_keys : void 0 : void 0);
      }

      //=========================================================================================================
      // UNSAFE MODE
      //---------------------------------------------------------------------------------------------------------
      get_unsafe_mode() {
        return this._state.in_unsafe_mode;
      }

      //---------------------------------------------------------------------------------------------------------
      set_unsafe_mode(onoff) {
        this.types.validate.boolean(onoff);
        this.sqlt.unsafeMode(onoff);
        this._state = lets(this._state, function(d) {
          return d.in_unsafe_mode = onoff;
        });
        return null;
      }

      //=========================================================================================================
      // TRANSACTIONS
      //---------------------------------------------------------------------------------------------------------
      within_transaction() {
        return this.sqlt.inTransaction;
      }

      begin_transaction() {
        throw new this.Dba_not_implemented('^dba/checks@1^', "tx_begin");
      }

      commit_transaction() {
        throw new this.Dba_not_implemented('^dba/checks@1^', "tx_commit");
      }

      rollback_transaction() {
        throw new this.Dba_not_implemented('^dba/checks@1^', "tx_rollback");
      }

      //=========================================================================================================
      // INTEGRITY
      //---------------------------------------------------------------------------------------------------------
      check_integrity() {
        return this.pragma(SQL`integrity_check;`);
      }

      check_quick() {
        return this.pragma(SQL`quick_check;`);
      }

    };
  };

}).call(this);

//# sourceMappingURL=checks-mixin.js.map