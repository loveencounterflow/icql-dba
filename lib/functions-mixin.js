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

    };
  };

  //=========================================================================================================
// CONTEXT HANDLERS
//---------------------------------------------------------------------------------------------------------

}).call(this);

//# sourceMappingURL=functions-mixin.js.map