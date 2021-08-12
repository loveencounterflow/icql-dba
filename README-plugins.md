

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
* typical usage:

  ```coffee
  { Dbx } = require 'icql-dba-exiting'

  class Foo_user
    constructor: ( cfg ) ->
      @cfg          = cfg
      @cfg.prefix  ?= 'foo'
      @dba          = new Dba cfg
      @dbx          = new Dbx { dba: @dba, prefix, }
      return undefined
  ```

* plugins (should) never depend on `icql-dba`, consumers must always 'bring their own'
* plugins *may* extend class `Dba_plugins`







