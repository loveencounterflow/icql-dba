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
    - [Create DB with `open()`](#create-db-with-open)
      - [New or Existing File-Based DB with Continuous Persistency](#new-or-existing-file-based-db-with-continuous-persistency)
      - [RAM DB with Eventual Persistency](#ram-db-with-eventual-persistency)
      - [New RAM DB without Eventual Persistency](#new-ram-db-without-eventual-persistency)
    - [Import a DB](#import-a-db)
      - [Notes on `import { format: 'sql', }`](#notes-on-import--format-sql-)
    - [Transfer DB](#transfer-db)
      - [Transfer File-Based DB to RAM](#transfer-file-based-db-to-ram)
      - [Transfer RAM DB to file](#transfer-ram-db-to-file)
    - [Save DB](#save-db)
      - [Use `save()` to Save to Linked File](#use-save-to-save-to-linked-file)
      - [Exporting to Binary and Textual Formats](#exporting-to-binary-and-textual-formats)
- [Notes on Import Formats](#notes-on-import-formats)
  - [CSV](#csv)
- [To Do](#to-do)

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

### Create DB with `open()`

#### New or Existing File-Based DB with Continuous Persistency

* `path` must be a string that is a valid file system path (up to the parent directory); its final component
  must either point to an existing SQLite DB file or be non-existant. (Write permissions are required in
  case modifications are intended.)
* In case the location indicated by `path` does not exist, a new SQLite DB file will be created. To prevent
  autocreation, specify `create: false`, which will cause an error to be thrown.

```coffee
dba.open { path: 'path/to/my.db', schema: 'myschema', }
```

#### RAM DB with Eventual Persistency

* It is possible to open a file DB and transfer it to RAM by `open()`ing an SQLite file with `ram: true`.
  This will copy the DB's structure and its data to RAM.
* Observe that when a path is given, `ram` defaults to `false`; when no path is given ([see
  below](#ram-db-without-eventual-persistency)), `ram` defaults to `true`.
* Use `disk: false` to keep SQLite from using temporary files to be used in case of RAM shortage (but why
  should you).
* The path given will be used when `save()` is called later.
* It is *not* allowed to call `save()` *with* `path` when DB was opened with `path`.

```coffee
dba.open { path: 'path/to/my.db', schema: 'myschema', ram: true, }
```

#### New RAM DB without Eventual Persistency

* To `open()` a RAM DB that has no inherent link to a file, omit the `path` setting (or set it to `null`).
* To obtain a RAM DB from an existing file DB but *without* writing changes back to that file, use
  [`import()`](#import-a-db).
* Observe that when `path` is missing, `ram` defaults to `true`, so in this case it may be omitted or set to
  `null`.

```coffee
dba.open { schema: 'myschema', }
```


### Import a DB

* Supported formats include
  * `sqlite` for the SQLite binary file format and
  * <del>`sql` for SQL dumps.</del>
* <del>Unlike `open()`, `import()` accepts SQL dumps (and, in the future, possibly other formats).</del>
* Use `format: 'sqlite'` or `format: 'sql'` to explicitly specify the intended file format in case the
  file extension does not match:
  * <del>`.dump`, `.sql` are recognized as `format: 'sql'`</del> (**Not yet implemented**)
  * `.db`, `.sqlite` are recognized as `format: 'sqlite'`
* In the future, `import()` may accept additional arguments:
  * `save_as` to specify a path for Continuous or Eventual Persistency
  * `ram` will default to `false` when `save_as` is not given and to `true` otherwise
  * `overwrite` to specify whether an existing file at the position indicated by `save_as` should be
    overwritten.

```coffee
dba     = new Dba()
schema  = 'myschema'
dba.open { schema, }
dba.import { path: 'path/to/some.db', schema, }
```

#### Notes on `import { format: 'sql', }`

* A valid SQL script may contain arbitrary SQL statements other than such statements as are output into an
  SQL dump and are strictly requisite to re-creating a given DB instance's state.
* A valid SQLite SQL script may also contain dot-commands that would be interpreted by the SQLite shell and
  are not part of SQL proper
* Even if all dot-commands are discarded or declared errors, there's still `attach 'path/to/my.db' as
  myschema`, so an SQL script may define structures and data in multiple schemas that may also reference
  each other.
* One way to deal with this is to make not only all dot-commands illegal (they don't work with
  `dba.execute()` anyhow so no change is required), but also demand that valid SQL scripts either
  * do not reference any schema except `main`, explicitly or implicitly, or
  * where a schema other than `main` is intended, an explicit configuration setting like `from_schema` must
    be included, and only that schema will be imported.
* In any event, `imüport()`ing SQL scripts/dumps will include:
  * setting up a temporary `dba` (or B3) instance,
  * in case batch mode is used (for big files), crude lexing of the SQL is needed so we can delineate and
    group statments (already implemented),
  * `vacuum`ing of the temporary DB to an SQLite binary DB file, and
  * `open()`ing that file from the original DBA instance.

### Transfer DB

#### Transfer File-Based DB to RAM

* `transfer_to_ram()` allows to convert a file DB to a RAM DB.
* Setting `schema` is a required setting that is the name of the file-based DB which will become the name of
  the RAM DB.
* It will throw an error if the schema given is already a RAM DB.
* for the duration of RAM-based operation, the connection to the file is terminated; therefore, Continuous
  Persistency is not available
* user is responsible for either calling `save()` at appropriate points in time or else call
  `transfer_to_file()` once RAM-based operation should be terminated and results saved.

```coffee
dba.transfer_to_ram { schema: 'myschema', }
```

#### Transfer RAM DB to file

* `transfer_to_file()` allows to convert a RAM DB to a file DB.
* will (1) either copy the old DB file to a new location or else delete it, depending on configuration
  (`### TAINT` which configuration?), then (2) call `save_as()` with the original path
* When called without a `path` setting then the schema's associated path will be used.
* When the schema points to a file DB and the path is not given or resolves to the associated path,
  `transfer_to_file()` is a no-op.
* The path given becomes the associated path of the DB; this works for both file and RAM DBs. Also see
  [`export()`](#exporting-to-binary-and-textual-formats).

```coffee
dba.transfer_to_file { schema: 'myschema', path, }
```

### Save DB

#### Use `save()` to Save to Linked File

* File-based DBs have Continuous Persistency, no need to call `save()` (but no harm done, either).
* RAM DBs must be `save()`d manually in order to persist changes in structure or data.
* `save()` throws an error if `path` setting is given.
* `save()` throws an error if `schema` setting isn't given or `schema` is unknown.
* Use `transfer_to_file { path, }` (and `save()` after subsequent changes) to add or change the file path
  linked to a RAM DB.
* Can also use `export { path, overwrite: true, format: 'sqlite', }` to repeatedly save a RAM DB as an
  SQLite binary file DB.

```coffee
dba.save { schema: 'myschema', }
```

* The above call is roughly equivalent to calling `dba.export()` with a few additional parameters:

```coffee
schema  = 'myschema'
path    = dba._schemas[ schema ].path
dba.export { schema, path, format: 'sqlite', overwrite: true, }
```

* Although calling `save()` takes fewer parameters than `export()`, the choice between the two is not so
  much extensional (material) as it is intentional: one calls `save()` to 'persist the state of this RAM DB
  to its associated DB file' whereas one calls `export()` to 'make a durable copy of this RAM DB'.

#### Exporting to Binary and Textual Formats

* The path given will *not* become the associated path of the DB; this is different from
  `transfer_to_file()`.

```coffee
dba.export { schema: 'myschema', path, format, overwrite, }
```

# Notes on Import Formats

## CSV

* Configuration:
  * `transform`:  optional `function`, default: `null`
  * `_extra`:     optional `object`, default: `null`
  * `skip_first`: optional `boolean`, default: `false`; whether to skip the first input line.
  * `skip_empty`: optional `boolean`, default: `true`
  * `skip_blank`: optional `boolean`, default: `true`
  * `input_columns`:
    * optional `boolean` or nonempty `list of nonempty texts`, default: `null`
    * `true`: first non-skipped row of source contains column names; rows are objects
    * `false`: rows are lists
    * list of `n` names: only the first `n` columns will be kept; rows are objects
  <!-- * schema: defaults to `csv` -->
  * `table_name`: optional `nonempty_text`, defaults to `main`
  * `table_columns`:
    * `null`: columns are created as `text`s depending on the first row encountered; if it is a list,
      columns will be named `c1`, `c2`, `c3`, ..., `c${n}`
    * `{ name: type, name: type, ..., }`: columns are created with the `name`s and `type`s given
    * `[ name, name, ..., ]`: all columns are created as `text`


# To Do

* [ ] CSV import
  * [ ] implement importing to an existing schema; this will simplify import options (no need to make `ram:
    true` etc. configurable)
  * [ ] implement (async) streaming with SteamPipes transforms
  * [ ] implement batching (?)
  * [X] implement passing options to CSV parser
  * [ ] allow to specify column names, types for targetted table
  * [ ] clarify wheter `skip_first` means to skip the (physical) first line of imported file or the *first
    line that is not skipped because it was blank or empty*
* [ ] TSV import (differs only in configuration (`delimiter`, `quotes`) from CSV)



