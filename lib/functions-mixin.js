(function() {
  'use strict';
  var CND, E, FS, PATH, badge, debug, echo, help, info, misfit, rpr, urge, warn, whisper;

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
      create_with_transaction(cfg) {
        var async, call;
        this.types.validate.dba_create_with_transaction_cfg((cfg = {...this.types.defaults.dba_create_with_transaction_cfg, ...cfg}));
        ({call, async} = cfg);
        if (async) {
          throw new E.Dba_not_implemented('^dbaf@313^', "calling `create_with_transaction { async: true, }`");
        }
        return this.sqlt.transaction(call);
      }

      //---------------------------------------------------------------------------------------------------------
      with_transaction(cfg) {
        var async, call;
        this.types.validate.dba_with_transaction_cfg((cfg = {...this.types.defaults.dba_with_transaction_cfg, ...cfg}));
        ({call, async} = cfg);
        if (async) {
          throw new E.Dba_not_implemented('^dbaf@314^', "calling `with_transaction { async: true, }`");
        }
        return (this.sqlt.transaction(call))();
      }

      //---------------------------------------------------------------------------------------------------------
      create_with_unsafe_mode(cfg) {
        var async, call;
        // create_with_unsafe_mode: ( cfg, call = null ) ->
        // debug '^4435-1^', cfg
        // switch arity = arguments.length
        //   when 1 then cfg = { call: cfg, } if @types.isa.callable cfg
        //   when 2 then ( cfg ?= {} ).call ?= call
        //   else throw new E.Dba_wrong_arity '^dbaf@313^', 'create_with_unsafe_mode', 1, 2, arity
        // debug '^4435-1^', cfg
        this.types.validate.dba_create_with_unsafe_mode_cfg((cfg = {...this.types.defaults.dba_create_with_unsafe_mode_cfg, ...cfg}));
        ({call, async} = cfg);
        if (async) {
          throw new E.Dba_not_implemented('^dbaf@313^', "calling `create_with_unsafe_mode { async: true, }`");
        }
        return (...P) => {
          var R, prv_in_unsafe_mode;
          prv_in_unsafe_mode = this._get_unsafe_mode();
          this._set_unsafe_mode(true);
          try {
            R = call(...P);
          } finally {
            this._set_unsafe_mode(prv_in_unsafe_mode);
          }
          return R;
        };
      }

      //---------------------------------------------------------------------------------------------------------
      with_unsafe_mode(...P) {
        return (this.create_with_unsafe_mode(...P))();
      }

      //---------------------------------------------------------------------------------------------------------
      create_with_foreign_keys_off(cfg) {
        var async, call;
        this.types.validate.dba_create_with_foreign_keys_off_cfg((cfg = {...this.types.defaults.dba_create_with_foreign_keys_off_cfg, ...cfg}));
        ({call, async} = cfg);
        if (async) {
          throw new E.Dba_not_implemented('^dbaf@313^', "calling `create_with_foreign_keys_off { async: true, }`");
        }
        return (...P) => {
          var R, prv_in_foreign_keys_state;
          prv_in_foreign_keys_state = this._get_foreign_keys_state();
          this._set_foreign_keys_state(false);
          try {
            R = call(...P);
          } finally {
            this._set_foreign_keys_state(prv_in_foreign_keys_state);
          }
          return R;
        };
      }

      //---------------------------------------------------------------------------------------------------------
      with_foreign_keys_off(...P) {
        return (this.create_with_foreign_keys_off(...P))();
      }

    };
  };

}).call(this);

//# sourceMappingURL=functions-mixin.js.map