

# ICQL-DBA Plugins


<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [Notes](#notes)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


# Notes

* all objects created with `prefix`, ex. table `variables` of `icql-dba-vars` created as `v_variables`
  by default (i.e. `v_` is the default prefix)
* when instantiating, *must* provide existing `Dba` instance and an option prefix (a string that will be
  prepended to the names of all DB objects that the plugin creates)
  * This API detail may be conceptually compared to the way one instantiates typed arrays in JavaScript:

    ```js
    const sab = new SharedArrayBuffer(1024);
    const ta = new Uint8Array(sab);
    ```

    Here, `sab` provides the underlying storage for data, while the `ta` (`TypedArray`) object defines the
    particular formatting of the raw bytes. Similarly, `dba` provides the underlying infrastructure while
    `foo = new Foo_plugin { dba, }` provides a specific structuring in terms of tables, views, UDFs, and API
    calls.

* When using ICQL/DBA plugins in one's own ICQL/DBA-consuming classes, it is probably a good idea to chain
  prefixes such that in addition to the prefix adopted by one's own class, each plugin gets its separate
  corner in the global namespace that is an SQLite database. Doling out separate prefixes minimizes the
  chances of name collisions and makes it possible to use several instances of the same plugin class in the
  same project:

  ```coffee
  { Dbx } = require 'icql-dba-exiting' ### An ICQL/DBA plugin ###
  { Dby } = require 'icql-dba-yadda'   ### Another ICQL/DBA plugin ###

  class Foo_user
    constructor: ( cfg ) ->
      @cfg          = cfg
      @cfg.prefix  ?= 'foo'
      @dba          = new Dba cfg
      @dbx          = new Dbx { dba: @dba, prefix: ( @cfg.prefix + 'x_'  ), }
      @dby1         = new Dby { dba: @dba, prefix: ( @cfg.prefix + 'y1_' ), }
      @dby2         = new Dby { dba: @dba, prefix: ( @cfg.prefix + 'y2_' ), }
      return undefined
  ```

* plugins must never never depend on `icql-dba`, consumers must always 'bring their own'
* plugins *may* extend class `Dba_plugins`







