# ICQL DBA


<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [Introduction](#introduction)
- [OIMDB Functionality](#oimdb-functionality)
- [Switching between File- and RAM-Based Modes (Mode Transfer)](#switching-between-file--and-ram-based-modes-mode-transfer)
- [Continuous Persistency](#continuous-persistency)
- [Eventual Persistency](#eventual-persistency)
- [Ad Hoc Persistency](#ad-hoc-persistency)
- [Regular Acquisition](#regular-acquisition)
- [Ad Hoc Acquisition](#ad-hoc-acquisition)
- [Privileged / Special Schemas: Main and Temp](#privileged--special-schemas-main-and-temp)
- [Usage](#usage)
  - [Create DBA Object](#create-dba-object)
  - [Open File-Based DB](#open-file-based-db)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


## Introduction

* **ICQL DBA is an [SQLite](https://sqlite.org/index.html) Database Adapter with Optional In-Memory DB
  (OIMDB) functionality.**
* Implemented using **[`better-sqlite3`](https://github.com/JoshuaWise/better-sqlite3)** (B3 in the below)
  to provide the interface between NodeJS (JavaScript) and SQLite.
* Because [B3 is almost fully synchronous](https://github.com/JoshuaWise/better-sqlite3/issues/262),
  **ICQL operates almost completely synchronously**, too.
* SQLite/B3 already provides In-Memory (IMDB) functionality. However, **ICQL DBA makes it easier to
  switch between In-Memory (RAM) and On-Disk operational modes**, hence the O for Optional in OIMDB.
* Using ICQL DBA, you could open a DB file, add some data which will readily be written to disk, then
  switch to RAM mode to perform some tedious data mangling, and then save the new DB state to the same
  file you opened the DB originally from.

## OIMDB Functionality

* To process a DB file in RAM, ICQL DB first opens the file using a ad-hoc schema name and then copies all
  DB objects (table, view and index definitions as well as data) from that ad-hoc schema into a RAM-based
  schema using the name supplied in the `open()` call.
  * **Note**—SQLite 'temporary schemas' are *mostly* based in RAM but may use disk space in case available
    memory becomes insufficient. Schemas *without* disk-based backup also exists; ICQL DBA users can elect
    to use either model (with the `disk: true|false` configuration) although IMO there's little reason to
    not use optional HD support.
  * **Note**—Confusingly, to get a RAM-based DB with the original SQLite/B3 API, you either use the empty
    string `''` to get disk support (in ase of RAM shortage) or the pseudo-path `':memory:'` to get one
    without disk support. In ICQL DBA, you use the boolean settings `ram` and `disk` instead which is much
    clearer. This frees the `path` argument from doing double duty, so one can use it to specify a default
    file path to be used implicitly for the `save()` command.

## Switching between File- and RAM-Based Modes (Mode Transfer)

* the `transfer()` API method may be used
  * to switch between Regular and Eventual Persistency, and to
  * associate/dissociate a DB with/from a new file path.

* `transfer { schema, ram: true, [ path: 'path/to/file.db' ], }` switches from file-based Continuous
  Persistency to memory-based Eventual Persistency. This is a no-op in case the DB is already memory-based.
* Likewise, `transfer { schema, ram: false, [ path: 'path/to/file.db' ], }` switches
  * a memory-based DB to Continuous Persistency. If the DB was originally opened from a file, the `path`
    setting is optional. If `path` is given, the DB will now be associated with that (possibly new) on-disk
    location


## Continuous Persistency

* When a DB is `open()`ed (from a file) with setting `ram: false`, every change to its structure or its
  business data will be immediately reflected to disk; this, of course, is the regular mode of operation
  for SQLite and most all RDBMSes and is, hence, known as Continuous Persistency (RP).
  * If the referenced file is non-existant, it will be auto-created unless `create: false` has been
    specified.
* Continuous Persistency always uses the [SQLite binary file format](https://sqlite.org/fileformat.html).

## Eventual Persistency

* While file-based SQLite DBs are permanently persistent (i.e. each change is written to disk as soon and as
  safely as possible to make the DB resistant against unexpected interruptions), ICQL DBA's OIMDB mode is
  'eventually persistent' for all states of the DB arrived at right after a `save()` command has completed
  and before any new changes have been executed.
* Eventual Persistency to disk is implemented with synchronous calls to `vacuum $schema into $path` (no
  schema-copying is involved in this step). The API method to do so is `save()`, a method that does nothing
  in case a given schema is disk-based (and therefore writes all changes to disk, continuously); therefore,
  one can make it so that the same code with strategically placed `save()` statements works for both
  RAM-based and disk-based DBs without any further changes.
  * The RAM DB will be much faster than the disk-based one, but of course the disk-based one will be better
    safeguarded against data loss from unexpected interruptions.
* Eventual Persistency always uses the [SQLite binary file format](https://sqlite.org/fileformat.html).

## Ad Hoc Persistency

* There's also a way to do 'Ad Hoc' Persistency using the `export()` API. The `export()` method will allow
  to write, for example, an SQL dump or the SQLite binary format to a given file.

## Regular Acquisition

* 'Regular Acquisition' is a fancy way to describe what the `open()` method does

## Ad Hoc Acquisition

* The counterpart to `export()` (Ad Hoc Persistency) is `import()` (Ad Hoc Acquisition).
* Some file formats (such as `sql`) may be valid when empty and result in an empty DB.



|                          | Acquisition | Persistency |
|:-------------------------|:-----------:|:-----------:|
| **Regular and Eventual** |  `open()`   |  `save()`¹  |
| **Ad Hoc**               | `import()`  | `export()`  |

¹ *`save()` calls are optional no-ops for Continuous Persistency*



## Privileged / Special Schemas: Main and Temp

* SQLite has two special schemas, `main` and `temp`.
* "The schema-names 'main' and 'temp' refer to the
  main database and the database used for temporary tables. The main and temp databases cannot be attached
  or detached."—[*SQLite Documentation*](https://www.sqlite.org/lang_attach.html)
* When you [create a `better-sqlite3`
  object](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#new-databasepath-options),
  that data will be put into the `main` schema.
* It is possible to circumvent the `main` schema in SQLite/B3; to do so, call either `new Database
  ':memory:'` which will create an empty `main` schema; then, you can execute an [SQL `attach`
  statement](https://www.sqlite.org/lang_attach.html) like `attach $path as $schema;` to open a file- or
  RAM-based DB under another schema of your choosing.
* This procedure is not very straightforward; compare this to how you would use `open()` in ICQL DBA.
* When you create a temporary table as in `create temp table t;` or `create temporary table t;`, then `t`
  will be available as `temp.t` (but *not* `temporary.t`).

## Usage


### Create DBA Object

```coffee
DBA = require 'icl-dba'
dba = new DBA.Dba()
```

* `dba` is constructed with an empty `path` argument to B3, i.e. `require('better-sqlite3')('')`.
* This means the underlying B3 instance is connected to an empty temporary database under the `main` schema.
* `dba` is not yet connected to any file-based DB; the only meaningful next operation is `open()`.
* In the future, may add configuration to create `dba` and open an existing DB in a single step.

### Open File-Based DB

* File-Based DB with Continuous Persistency:
  * use `create: false` to throw error in case file does not exit

```coffee
dba.open { path: 'path/to/my.db', schema: 'myschema', }
```

* RAM-Based DB with Eventual Persistency:
  * use `disk: false` to avoid SQLite using temporary files

```coffee
dba.open { path: 'path/to/my.db', schema: 'myschema', ram: true, }
```

### Transfer DB

* Transfer open file-based DB to RAM:
  * `schema` is the name of the file-based DB which will become the name of the RAM DB
  * for the duration of RAM-based operation, the connection to the file is terminated; therefore, Continuous
    Persistency is not available
  * user is responsible for either calling `save()` at appropriate points in time or else call
    `transfer_to_file()` once RAM-based operation should be terminated and results saved.

```coffee
dba.transfer_to_ram { schema: 'myschema', }
```

* Transfer open RAM DB to file:
  * will (1) either copy the old DB file to a new location or else delete it, depending on configuration
    (`### TAINT` which configuration?), then (2) call `save_as()` with the original path
  * in the future, we may allow a `path` argument to allow switching to a new destination and save the DB
    in a single step

```coffee
dba.transfer_to_file { schema: 'myschema', }
```






