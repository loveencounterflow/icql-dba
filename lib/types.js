(function() {
  'use strict';
  var CND, Dba, Intertype, alert, badge, debug, help, info, intertype, jr, rpr, urge, warn, whisper;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'MKTS-PARSER/TYPES';

  debug = CND.get_logger('debug', badge);

  alert = CND.get_logger('alert', badge);

  whisper = CND.get_logger('whisper', badge);

  warn = CND.get_logger('warn', badge);

  help = CND.get_logger('help', badge);

  urge = CND.get_logger('urge', badge);

  info = CND.get_logger('info', badge);

  jr = JSON.stringify;

  Intertype = (require('intertype')).Intertype;

  intertype = new Intertype(module.exports);

  Dba = null;

  //-----------------------------------------------------------------------------------------------------------
  this.declare('icql_settings', {
    tests: {
      "x is a object": function(x) {
        return this.isa.object(x);
      },
      // "x has key 'db_path'":                    ( x ) -> @has_key             x, 'db_path'
      // "x has key 'icql_path'":                  ( x ) -> @has_key             x, 'icql_path'
      "x.db_path is a nonempty text": function(x) {
        return this.isa.nonempty_text(x.db_path);
      },
      "x.icql_path is a nonempty text": function(x) {
        return this.isa.nonempty_text(x.icql_path);
      },
      "x.echo? is a boolean": function(x) {
        return this.isa_optional.boolean(x.echo);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('ic_entry_type', {
    tests: {
      "x is a text": function(x) {
        return this.isa.text(x);
      },
      "x is in 'procedure', 'query', 'fragment'": function(x) {
        return x === 'procedure' || x === 'query' || x === 'fragment';
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('ic_schema', function(x) {
    if (!this.isa.text(x)) {
      /* NOTE to keep things simple, only allow lower case ASCII letters, digits, underscores in schemas */
      return false;
    }
    return /^[a-z_][a-z0-9_]*$/.test(x);
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('ic_not_temp_schema', function(x) {
    return (this.isa.ic_schema(x)) && (x !== 'temp');
  });

  this.declare('ic_path', function(x) {
    return this.isa.text(x);
  });

  this.declare('ic_name', function(x) {
    return this.isa.nonempty_text(x);
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba_ram_path', function(x) {
    return x === null || x === '' || x === ':memory:';
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba_list_objects_ordering', function(x) {
    return (x == null) || (x === 'drop');
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba_format', function(x) {
    return x === 'sql' || x === 'db';
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba_constructor_cfg', {
    tests: {
      "x is an object": function(x) {
        return this.isa.object(x);
      },
      "x._temp_prefix is a ic_schema": function(x) {
        return this.isa.ic_schema(x._temp_prefix);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba_open_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.ic_not_temp_schema x.schema": function(x) {
        return this.isa.ic_not_temp_schema(x.schema);
      },
      "@isa_optional.ic_path x.path": function(x) {
        return this.isa_optional.ic_path(x.path);
      },
      "@isa.boolean x.ram": function(x) {
        return this.isa.boolean(x.ram);
      }
    }
  });

  // "@isa.boolean x.overwrite":             ( x ) -> @isa.boolean x.overwrite
  // "@isa.boolean x.create":                ( x ) -> @isa.boolean x.create

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba_import_cfg', {
    tests: {
      "x is an object": function(x) {
        return this.isa.object(x);
      },
      "x.schema is a schema but not temp": function(x) {
        return this.isa.ic_not_temp_schema(x.schema);
      },
      "x.path is an ic_path": function(x) {
        return this.isa.ic_path(x.path);
      },
      "x.format? is an optional dba_format": function(x) {
        return this.isa_optional.dba_format(x.format);
      },
      "x.method is 'single' or 'batch'": function(x) {
        var ref;
        return (ref = x.method) === 'single' || ref === 'batch';
      },
      "x.batch_size? is a positive_integer": function(x) {
        return this.isa_optional.positive_integer(x.batch_size);
      }
    }
  });

  // "x.overwrite is a boolean":             ( x ) -> @isa.boolean x.overwrite

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba_attach_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.ic_not_temp_schema x.schema": function(x) {
        return this.isa.ic_not_temp_schema(x.schema);
      },
      "@isa.ic_path x.path": function(x) {
        return this.isa.ic_path(x.path);
      },
      "( x.saveas is null ) or @isa.ic_path x.saveas": function(x) {
        return (x.saveas === null) || this.isa.ic_path(x.saveas);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('copy_or_move_schema_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.ic_not_temp_schema x.from_schema": function(x) {
        return this.isa.ic_not_temp_schema(x.from_schema);
      },
      "@isa.ic_not_temp_schema x.to_schema": function(x) {
        return this.isa.ic_not_temp_schema(x.to_schema);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.declare('dba', {
    tests: {
      "x instanceof Dba": function(x) {
        return x instanceof (Dba != null ? Dba : Dba = (require('./main')).Dba);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  this.defaults = {
    //.........................................................................................................
    dba_constructor_cfg: {
      _temp_prefix: '_dba_temp_',
      readonly: false,
      create: true,
      overwrite: false,
      timeout: 5000
    },
    //.........................................................................................................
    dba_attach_cfg: {
      schema: null,
      path: '',
      saveas: null
    },
    //.........................................................................................................
    dba_open_cfg: {
      schema: null,
      path: null,
      ram: false
    },
    // overwrite:  false
    // create:     true
    //.........................................................................................................
    dba_import_cfg: {
      schema: null,
      path: null,
      format: null,
      method: 'single',
      batch_size: 1000
    },
    // overwrite:  false
    //.........................................................................................................
    copy_or_move_schema_cfg: {
      from_schema: null,
      to_schema: null
    }
  };

}).call(this);

//# sourceMappingURL=types.js.map