(function() {
  'use strict';
  var CND, E, FS, PATH, SQL, badge, debug, echo, help, info, misfit, rpr, urge, warn, whisper,
    splice = [].splice;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'ICQL-DBA/FUNCTIONS-MIXIN';

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

  //-----------------------------------------------------------------------------------------------------------
  this.Functions_mixin = (clasz = Object) => {
    return class extends clasz {
      //=========================================================================================================
      // USER-DEFINED FUNCTIONS
      //---------------------------------------------------------------------------------------------------------
      create_function(cfg) {
        var call, deterministic, directOnly, name, varargs;
        this.types.validate.dba_create_function_cfg((cfg = {...this.types.defaults.dba_create_function_cfg, ...cfg}));
        ({name, call, directOnly, deterministic, varargs} = cfg);
        return this.sqlt.function(name, {deterministic, varargs, directOnly}, call);
      }

      //---------------------------------------------------------------------------------------------------------
      create_aggregate_function(cfg) {
        var deterministic, directOnly, name, start, step, varargs;
        this.types.validate.dba_create_aggregate_function_cfg((cfg = {...this.types.defaults.dba_create_aggregate_function_cfg, ...cfg}));
        ({name, start, step, directOnly, deterministic, varargs} = cfg);
        return this.sqlt.aggregate(name, {start, step, deterministic, varargs, directOnly});
      }

      //---------------------------------------------------------------------------------------------------------
      create_window_function(cfg) {
        var deterministic, directOnly, inverse, name, result, start, step, varargs;
        this.types.validate.dba_create_window_function_cfg((cfg = {...this.types.defaults.dba_create_window_function_cfg, ...cfg}));
        ({name, start, step, inverse, result, directOnly, deterministic, varargs} = cfg);
        return this.sqlt.aggregate(name, {start, step, inverse, result, deterministic, varargs, directOnly});
      }

      //---------------------------------------------------------------------------------------------------------
      create_table_function(cfg) {
        var columns, deterministic, directOnly, name, parameters, rows, varargs;
        this.types.validate.dba_create_table_function_cfg((cfg = {...this.types.defaults.dba_create_table_function_cfg, ...cfg}));
        ({name, parameters, columns, rows, directOnly, deterministic, varargs} = cfg);
        return this.sqlt.table(name, {parameters, columns, rows, deterministic, varargs, directOnly});
      }

      //---------------------------------------------------------------------------------------------------------
      create_virtual_table(cfg) {
        var create, name;
        this.types.validate.dba_create_virtual_table_cfg((cfg = {...this.types.defaults.dba_create_virtual_table_cfg, ...cfg}));
        ({name, create} = cfg);
        return this.sqlt.table(name, create);
      }

      //=========================================================================================================
      // CONTEXT HANDLERS
      //---------------------------------------------------------------------------------------------------------
      with_transaction(...P) {
        var R, error, f, ref;
        ref = P, [...P] = ref, [f] = splice.call(P, -1);
        this.types.validate.function(f);
        if (this.sqlt.inTransaction) {
          // return ( @sqlt.transaction f ) P...
          throw new E.Dba_no_nested_transactions('^dba-functions@901^');
        }
        this.execute(SQL`begin transaction;`);
        error = null;
        try {
          R = f(...P);
        } catch (error1) {
          error = error1;
          // debug '^35458-catch^', CND.reverse 'rollback'
          this.execute(SQL`rollback;`);
          throw error;
        }
        try {
          // finally
          //   debug '^35458-finally^', CND.reverse 'rollback', error
          this.execute(SQL`commit;`);
        } catch (error1) {
          error = error1;
          this.execute(SQL`rollback;`);
        }
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      with_unsafe_mode(...P) {
        var R, f, prv_in_unsafe_mode, ref;
        ref = P, [...P] = ref, [f] = splice.call(P, -1);
        this.types.validate.function(f);
        prv_in_unsafe_mode = this.get_unsafe_mode();
        this.set_unsafe_mode(true);
        try {
          R = f(...P);
        } finally {
          this.set_unsafe_mode(prv_in_unsafe_mode);
        }
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      with_foreign_keys_off(...P) {
        var R, f, prv_in_foreign_keys_state, ref;
        ref = P, [...P] = ref, [f] = splice.call(P, -1);
        this.types.validate.function(f);
        prv_in_foreign_keys_state = this.get_foreign_keys_state();
        this.set_foreign_keys_state(false);
        try {
          R = f(...P);
        } finally {
          this.set_foreign_keys_state(prv_in_foreign_keys_state);
        }
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      with_foreign_keys_deferred(...P) {
        var R, f, ref;
        ref = P, [...P] = ref, [f] = splice.call(P, -1);
        this.types.validate.function(f);
        R = null;
        if (this.sqlt.inTransaction) {
          throw new E.Dba_no_deferred_fks_in_tx('^dba-functions@901^');
        }
        this.with_transaction(() => {
          this.sqlt.pragma(SQL`defer_foreign_keys=true`);
          return R = f(...P);
        });
        return R;
      }

    };
  };

}).call(this);

//# sourceMappingURL=functions-mixin.js.map