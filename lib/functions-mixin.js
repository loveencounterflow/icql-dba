(function() {
  'use strict';
  var CND, E, FS, PATH, SQL, badge, debug, echo, help, info, misfit, rpr, urge, warn, whisper;

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
      with_transaction(f) {
        var R, error;
        this.types.validate.function(f);
        if (this.sqlt.inTransaction) {
          throw new E.Dba_no_nested_transactions('^dba-functions@901^');
        }
        this.execute(SQL`begin transaction;`);
        error = null;
        try {
          R = f();
        } catch (error1) {
          error = error1;
          this.execute(SQL`rollback;`);
          throw error;
        }
        try {
          this.execute(SQL`commit;`);
        } catch (error1) {
          error = error1;
          this.execute(SQL`rollback;`);
        }
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      with_unsafe_mode(f) {
        var R, unsafe_mode_state;
        this.types.validate.function(f);
        unsafe_mode_state = this.get_unsafe_mode();
        this.set_unsafe_mode(true);
        try {
          R = f();
        } finally {
          this.set_unsafe_mode(unsafe_mode_state);
        }
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      with_foreign_keys_deferred(f) {
        var R;
        this.types.validate.function(f);
        R = null;
        if (this.sqlt.inTransaction) {
          throw new E.Dba_no_deferred_fks_in_tx('^dba-functions@901^');
        }
        this.with_transaction(() => {
          this.sqlt.pragma(SQL`defer_foreign_keys=true`);
          return R = f();
        });
        return R;
      }

    };
  };

}).call(this);

//# sourceMappingURL=functions-mixin.js.map