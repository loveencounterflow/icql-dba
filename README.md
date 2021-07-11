# ICQL-DBA


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
- [API](#api)
  - [User-Defined Functions](#user-defined-functions)
- [SQL Submodule](#sql-submodule)
- [Rave Reviews (albeit for the concept, not this software)](#rave-reviews-albeit-for-the-concept-not-this-software)
- [Similar Projects](#similar-projects)
- [To Do](#to-do)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


## Introduction

* **ICQL-DBA is an [SQLite](https://sqlite.org/index.html) Database Adapter with Optional In-Memory DB
  (OIMDB) functionality.**
* Implemented using **[`better-sqlite3`](https://github.com/JoshuaWise/better-sqlite3)** (B3 in the below)
  to provide the interface between NodeJS (JavaScript) and SQLite.
* Because [B3 is almost fully synchronous](https://github.com/JoshuaWise/better-sqlite3/issues/262),
  **ICQL operates almost completely synchronously**, too.
* SQLite/B3 already provides In-Memory (IMDB) functionality. However, **ICQL-DBA makes it easier to
  switch between In-Memory (RAM) and On-Disk operational modes**, hence the O for Optional in OIMDB.
* Using ICQL-DBA, you could open a DB file, add some data which will readily be written to disk, then
  switch to RAM mode to perform some tedious data mangling, and then save the new DB state to the same
  file you opened the DB originally from.

## OIMDB Functionality

* To process a DB file in RAM, ICQL DB first opens the file using a ad-hoc schema name and then copies all
  DB objects (table, view and index definitions as well as data) from that ad-hoc schema into a RAM-based
  schema using the name supplied in the `open()` call.
  * **Note**—SQLite 'temporary schemas' are *mostly* based in RAM but may use disk space in case available
    memory becomes insufficient. Schemas *without* disk-based backup also exists; ICQL-DBA users can elect
    to use either model (with the `disk: true|false` configuration) although IMO there's little reason to
    not use optional HD support.
  * **Note**—Confusingly, to get a RAM-based DB with the original SQLite/B3 API, you either use the empty
    string `''` to get disk support (in ase of RAM shortage) or the pseudo-path `':memory:'` to get one
    without disk support. In ICQL-DBA, you use the boolean settings `ram` and `disk` instead which is much
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
  for SQLite and most all RDBMSes and is, hence, known as Continuous Persistency.
  * If the referenced file is non-existant, it will be auto-created unless `create: false` has been
    specified.
* Continuous Persistency always uses the [SQLite binary file format](https://sqlite.org/fileformat.html).

## Eventual Persistency

* While file-based SQLite DBs are permanently persistent (i.e. each change is written to disk as soon and as
  safely as possible to make the DB resistant against unexpected interruptions), ICQL-DBA's OIMDB mode is
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
* This procedure is not very straightforward; compare this to how you would use `open()` in ICQL-DBA.
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

* Observe that unlike most of the ICQL-DBA API, **`dba.import()` is asynchronous**. This is mostly due to
  the relative scarcity of synchronous parsing (and, generally, file-handling) packages for the NodeJS
  ecosystem.
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
await dba.import { path: 'path/to/some.db', schema, }
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

* The choice between `save()` and `export()` is rather intentional (conceptual) than extensional (material):
  * one calls `save { schema, }` to 'persist the state of a schema to its associated DB file', whereas
  * one calls `export { schema, path, }` to 'make a durable copy of this RAM DB'.

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
  * `_extra`:     optional `object`, default: `null`. This value will be passed to
    [`csv-parser`](https://github.com/mafintosh/csv-parser) which does the hard part of parsing CSV so you
    can use `await dba.import { ..., format: 'csv', _extra: { ... }, ...}` to directly talk to `csv-parser`.
    Notice however that some settings may be overridden without notice by `dba.import()`. For a description
    of options see [`csv-parser`](https://github.com/mafintosh/csv-parser#options).
  * You can skip incomplete lines when they have empty fields, which are expressed as `null` values, either
    when *all* fields are `null` or when *any* field is `null`. Observe that this is only tested against the
    columns that were selected with `input_columns` (where set explicitly):
    * `skip_any_null` optional `boolean`, default: `false`
    * `skip_all_null` optional `boolean`, default: `false`
  * `trim` optional `boolean`, default: `true`. Whether to remove leading and trailing whitespace from
    field values.
  * `default_value` optional; van be any value, default: `null`. This value will be applied to all fields
    that are found to be (the) empty (string) (after optional trimming). Observe that quoting a field value
    will not prevent trimming.
  * `quote` optional
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

# API

**TBD**

* **`dba.do_unsafe: ( f ) ->`**—given a synchronous function `f`, set `unsafeMode` to `true`, call `f()`,
  then set `unsafeMode` to `false`. Used judiciously, this allows e.g. to update rows in a table while
  iterating over a result set. To ensure proper functioning with predictable results and avoiding endless
  loops (caused by new rows being added to the result set), it is suggested to add a field `lck boolean not
  null default false` (for 'locked') to tables for which concurrent updates are planned. Set `lck` of all or
  a subset of rows to `true` and add `where lck` to your `select` statement; any inserted rows will then
  have the default `lck = false` value and be cleanly separated from the result set.
* **`dba.do_unsafe_async: ( f ) ->`**—Same as `dba.do_unsafe()` but for async functions.

## User-Defined Functions

User-Defined Functions (UDFs) is one feature that sets SQLite apart from other RDBMSes because unlike other
databases, SQLite allows users to define functions in *user code*, *on the connection*. Therefore, NodeJS
users can define and use UDFs that are written in JavaScript or WASM and that can access the current
machine's environment (e.g. the file system). On the one hand, this is probably somewhat slower than e.g.
using a compiled PostgreSQL extension written in C, but on the other hand, userspace functions are orders of
magnitude easier to write than a Posgres C extension; also, such functions can take advantage of the
existing NodeJS ecosystem which is a huge plus and any speed penalty incurred by using JavaScript for 'hot'
UDFs might be offset by an re-implementation in, say, Rust.

One downside—or, shall we say, "characteristic aspect"—of defining UDFs on the client side (as opposed to
writing them embedded in SQL) is that your DB or at least some aspects of it may become unusable without
suitable initialization of the connection. It is to be expected, though, that in a complex application some
parts are not bound to function properly without other parts being in place—the application code as such
won't work when the database of a DB-based app is missing, and the DB may not fully work without the
application code. (This, by the way, is exactly true for [Fossil SCM-based
repositories](https://fossil-scm.org), which might be regarded as the poster child of an application built
around an SQLite database.)

* **`dba.create_function: ( cfg ) ->`** single-valued functions
* **`dba.create_aggregate_function: ( cfg ) ->`** aggregate functions
* **`dba.create_window_function: ( cfg ) ->`** window functions
* **`dba.create_table_function: ( cfg ) ->`** table-valued functions
* **`dba.create_virtual_table: ( cfg ) ->`** virtual tables

# SQL Submodule

```coffee
dba = new Dba()
{ SQL, I, L, X, } = dba.sql
table   = 'mytable'
value   = 'something'
sql     = SQL"select * from #{I table} where x == #{L value};"
# == select * from "mytable" where x == 'something';
```

* `SQL`: currently a no-op, but can be used (e.g. with
  [coffeeplus](https://github.com/loveencounterflow/coffeeplus)) to signal text highlighting the language
  used in the string literal.
* `I`: format a text as an SQL identifier (using double quotes)
* `L`: format a value as an SQL literal
* `X`: format a flat list as an [SQL row value](https://www.sqlite.org/rowvalue.html) (a.k.a. a vector)


# Rave Reviews (albeit for the concept, not this software)

For the *concept* of using in-memory SQLite DBs (*not* specifically ICQL-DBA, which probably nobody uses):

> We use SQLite in-memory databases for executing 100% of our business logic these days. Letting the
> business write all the rules in SQL is the biggest win of my career so far.
>
> Also, if you think SQLite might be too constrained for your business case, you can expose any arbitrary
> application function to it. E.g.:
>
> https://docs.microsoft.com/en-us/dotnet/standard/data/sqlite/user-defined-functions
>
> The very first thing we did was pipe DateTime into SQLite as a UDF. Imagine instantly having the full
> power of .NET6 available from inside SQLite.
>
> Note that these functions do NOT necessarily have to avoid side effects either. You can use a procedural
> DSL via SELECT statements that invokes any arbitrary business method with whatever parameters from the
> domain data.
>
> The process is so simple I am actually disappointed that we didn't think of it sooner. You just put a
> template database in memory w/ the schema pre-loaded, then make a copy of this each time you want to map
> domain state for SQL execution.
>
> You can do conditionals, strings, arrays of strings, arrays of CSVs, etc. Any shape of thing you need to
> figure out a conditional or dynamic presentation of business facts.
>
> Oh and you can also use views to build arbitrary layers of abstraction so the business can focus on their
> relevant pieces.—https://news.ycombinator.com/item?id=27568537


# Similar Projects

* Datasette

# To Do

* [ ] CSV import
  * [ ] implement importing to an existing schema; this will simplify import options (no need to make `ram:
    true` etc. configurable)
  * [ ] implement (async) streaming with SteamPipes transforms
  * [ ] implement batching (?)
  * [X] implement passing options to CSV parser
  * [ ] allow to specify column names, types for targetted table
  * [ ] clarify whether `skip_first` means to skip the (physical) first line of imported file or the *first
    line that is not skipped because it was blank or empty*
  * [ ] ensure that all unquoted fields are trimmed
  * [X] ensure that all empty fields contain `null` instead of an empty string
  * [X] implement skipping comments
* [ ] TSV import (differs only in configuration (`delimiter`, `quotes`) from CSV)
* [ ] Consider to use B3 `serialize()` for `export { format: 'sqlite', }`
* [ ] Allow to `open()` RAM DB without path
* [ ] Re-implement Hollerith codec for `int32` only, making it faster and smaller; add documentation along
  the lines of `"DBA: VNRs"` (in hengist dev) how to efficiently sort VNRs
* [ ] we (temporarily?) accept a `path` argument in `new Dba { path, }`; this is used to attach the `main`
  schema. Alternatively, and to keep the API mosre consistent(?), we could remove that argument and
  stipulate that the first `dba.open()` call implicitly creates the `dba.sqlt` object; if the `schema` given
  in that call is not `main`, then `main` will be a RAM DB.
* [ ] discuss project focus and non-goals
  * [ ] while ICQL-DBA may gain some support for generated SQL, building kind-of-an-ORM is not one of its
    goals. Cf. [Datasette](https://sqlite-utils.datasette.io/en/stable/python-api.html#listing-rows) allows
    constructs à la `for row in db["dogs"].rows_where(select='name, age'): ...` which already shows one of
    the general disadvantages of ORMs, namely, that one has to suddenly re-create parts of SQL in a more
    awkward way. Instead of

    ```sql
    select name, age from dogs where age > 1 order by age desc;
    ```

    now you have to write

    ```py
    db[ 'dogs' ].rows_where( 'age > 1', select = 'name, age', order_by = 'age desc' )
    ```

    which is considerably longer, more convoluted, and has an appreciably larger API surface than
    `dba.query()`.

    Observe that all of the arguments are really SQL fragments so in reality you still have to write SQL.

    Worse, now the equivalent to that one SQL string `"select name, age from dogs where age > 1 order by age
    desc;"` has been diluted into four micro strings: `'dogs'`, `'age > 1'`, `'name, age'`, and `'age
    desc'`, plus three Python identifiers: `rows_where`, `select`, and `order_by`.

    Worse again, you still *don't get column and table name parametrization* (you *can* replace `'name,
    age'` with an interpolated string and variables, but you'll have to provide proper escaping (quotes,
    spaces, capitalization) and concatenation (commas) yourself).

* [X] re/define APIs for
  * [X] single-valued functions: `dba.create_function()` (<del>`dba.function()`</del>)
  * [X] aggregate functions: `dba.create_aggregate_function()` (<del>`dba.aggregate()`</del>)
  * [X] window functions: `dba.create_window_function()`
  * [X] table-valued functions: `dba.create_table_function()`
  * [X] virtual tables: `dba.create_virtual_table()`

* [ ] add simple facilities to construct basic SQL clauses and statements such as inserts, `values` clauses
  &c. Syntax could use dollar, format, colon, name (`$X:name`) for named insertions and question mark,
  format, colon (`?X:`) `""` for positional inseertions. These would have to be processed before
  `dba.prepare sql` is called. The format parameter is optional and defaults to `I` for 'identifier', as
  constructing statements with parametrized table and column names is the expected primary use case for
  interpolation. Other values for format are `L` (for 'literal') and `V` (for 'values', i.e. round brackets
  around a comma-delimited list of literals).

  Examples:

  ```coffee
  dba.query "select $:col_a, $:col_b where $:col_b in $V:choices", \
    { col_a: 'foo', col_b: 'bar', choices: [ 1, 2, 3, ], }
  dba.query "select ?:, ?: where ?: in ?V:", \
    [ 'foo', 'bar', 'bar', [ 1, 2, 3, ], ]
  ```



