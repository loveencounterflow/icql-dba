<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [ICQL-DBA](#icql-dba)
  - [Special Powers](#special-powers)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Usage: In-Memory Processing](#usage-in-memory-processing)
    - [Usage: Gotchas](#usage-gotchas)
  - [API](#api)
    - [API: Debugging](#api-debugging)
    - [API: Query Result Adapters](#api-query-result-adapters)
    - [API: Querying](#api-querying)
    - [API: Other](#api-other)
    - [API: DB Introspection](#api-db-introspection)
    - [API: DB Structure Modification](#api-db-structure-modification)
    - [API: In-Memory Processing](#api-in-memory-processing)
    - [API: SQL Construction](#api-sql-construction)
    - [API: Sortable Lists](#api-sortable-lists)
    - [Properties](#properties)
  - [Alternative API (WIP; to be merged into API proper when implemented)](#alternative-api-wip-to-be-merged-into-api-proper-when-implemented)
    - [API: Instantiation, Opening / Creating Schemas](#api-instantiation-opening--creating-schemas)
  - [Glossary](#glossary)
  - [Todo](#todo)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


# ICQL-DBA

**Your Slogan Here**

## Special Powers

* makes it easy to attach temporary / memory DBs ('schemas') and do all the heavy lifting in RAM, resulting
  in [unexcelled performance](citation needed (forthcoming))
* provides a somewhat more streamlined interface to working with an RDBMS when compared to other tools in
  the field like [`better-sqlite3`](https://github.com/JoshuaWise/better-sqlite3) (which has good reasons to
  stick very close to SQLite3 to be sure)

## Installation

```bash
npm install icql-dba
```

## Usage

### Usage: In-Memory Processing

* much faster, less safe than file-based, WAL-logged processing
* always open DB with path `:memory:` (or empty string for 'temporary DB'), always use `attach()`ed DB to
  access file content (reason: cannot detach the default `main` schema)

Workflow:

* <ins>**#PREPARATION**</ins>—Open (empty, in-memory) 'temporary' DB ([the same as a in-memory DB but with
  file system support](https://www.sqlite.org/inmemorydb.html#temp_db)); the schema for this primary DB will
  always be `main`, and the names of tables, views and pragmas may be used with or without the schema
  prepended.
* Attach a (new or existing) file-based DB (from `fpath`) to the same connection; the schema for this
  secondary DB is configurable, the default being `file`.
* <ins>**#WORK**</ins>—Copy all DB objects (tables, views, and indexes) from `file` to `main`.
* Optionally, close (i.e. detach) `file`.
* Perform work in-memory on `main`.
* Depending on settings, either:
  * <ins>**#METHOD A**</ins>—Save DB in its altered state to a temporary file `tpath` (using `vacuum main to
    $tpath`),
  * remove (or rename) file at `fpath`, then move `tpath` to `fpath`
  or else
  * <ins>**#METHOD B**</ins>—Clear `file` schema
  * and copy all data from `main` to `file`.
* <ins>**#LOOP**</ins>—either close DB and finish, or continue to do <ins>**#WORK**</ins>, above.

**UNDER CONSTRUCTION**

```coffee
#------------------------------------------------------------------------------
{ Dba }               = require 'icql-dba'                  #PREPARATION
do_work               = ( dba ) -> ...
use_method            = 'A'
fpath                 = 'path/to/sqlite.db'
dba                   = new Dba { path: ':memory:', }
dba.attach      { path: fpath, schema: 'file', }
dba.copy_schema { from_schema: 'file', to_schema: 'main', }
dba.detach      { schema: 'file', }                         # (optional)
#------------------------------------------------------------------------------
loop
  continue = (await) do_work dba                            #WORK
  #----------------------------------------------------------------------------
  if use_method is 'A'                                      #METHOD A
    tpath                 = '/tmp/temp.db'
    fpath_old             = '/tmp/old-db-334a5c3fd89.db'
    dba.save_as { schema: 'main', path: tpath, }
    FS.renameSync fpath, fpath_old
    FS.renameSync tpath, fpath
  #----------------------------------------------------------------------------
  else if use_method is 'B'                                 #METHOD B
    dba.clear { schema: 'file', }
    dba.copy_schema { from_schema: 'main', to_schema: 'file', }
  #----------------------------------------------------------------------------
  break unless continue                                     #LOOP
```

```coffee
#------------------------------------------------------------------------------
{ Dba }               = require 'icql-dba'                  #PREPARATION
do_work               = ( dba ) -> ...
use_method            = 'A'
fpath                 = 'path/to/sqlite.db'
dba                   = Dba.open { path: fpath, schema: 'main', }
dba.move_schema { from_schema: 'main', to_schema: 'ram', }
# dba.attach { from_schema: 'main', to_schema: 'ram', }
# dba.move_db { from_path: fpath, from_schema: 'file', }
#------------------------------------------------------------------------------
loop
  continue = (await) do_work dba                            #WORK
  #----------------------------------------------------------------------------
  if use_method is 'A'                                      #METHOD A
    tpath                 = '/tmp/temp.db'
    fpath_old             = '/tmp/old-db-334a5c3fd89.db'
    dba.save_as { schema: 'main', path: tpath, }
    FS.renameSync fpath, fpath_old
    FS.renameSync tpath, fpath
  #----------------------------------------------------------------------------
  else if use_method is 'B'                                 #METHOD B
    dba.clear { schema: 'file', }
    dba.copy_schema { from_schema: 'main', to_schema: 'file', }
  #----------------------------------------------------------------------------
  break unless continue                                     #LOOP
```

### Usage: Gotchas

* When looping over the return value of a DB query like `dba.query sql, parameters`, remember that
  **`dba.query()` returns an iterator over result rows**, not a list (a JS `Array` instance) of values;
  consequently,
  * in CoffeeScript, write `for row` **`from`** `dba.query ...` instead of `for row in dba.query ...`
  * in JavaScript, write `for ( row` **`of`** `dba.query( ... ) )` instead of an indexed loop).
* As long as the iterator is not exhausted (i.e. hasn't finished walking over rows), the DB connection is
  considered busy and cannot write to the DB. Therefore, **one cannot alter data in the DB while iterating
  over rows**. Instead, first retrieve all result rows as a list, and loop over that list; this can be
  conveniently done with `for row` **`in`** **`dba.list`** `dba.query ...`.

## API

### API: Debugging

### API: Query Result Adapters

Query result adapters are convenience methods to transform the result set. Because they exhaust the iterator
that is returned from a `query`, only a single method may be used; if you have to iterate more than once
over a given result set, use `dba.all_rows db.my_query ...`.

* **`dba.limit: ( n, iterator )`** ⮕ Returns an iterator over the first `n` rows.
* **`dba.list: ( iterator )`** ⮕ Returns a list of all rows.
* **`dba.single_row: ( iterator )`** ⮕ Like `first_row`, but throws an exception unless `iterator` yields
  exactly one row.
* **`dba.first_row: ( iterator )`** ⮕ Returns first row, or `undefined`.
* **`dba.single_value: ( iterator )`** ⮕ Like `first_value`, but throws an exception unless `iterator`
  yields exactly one row.
* **`dba.first_value: ( iterator )`** ⮕ Returns first field of first row, or `undefined`.
* **`dba.first_values: ( iterator )`** ⮕ Returns an iterator over the first field of all rows.
* **`dba.all_first_values: ( iterator )`** ⮕ Returns a list with the values of the first field of each row.
  Useful to turn queries like `select product_id from products order by price desc limit 100` into a flat
  list of values.


### API: Querying

* **`dba.prepare: ( sql )`** ⮕ Prepare a statement. Returns a `better-sqlite3` `statement` instance.
* **`dba.execute: ( sql )`** ⮕ Execute any number of SQL statements.
* **`dba.query:   ( sql, P... )`** ⮕ Perform a single `select` statement. Returns an iterator over the
  resulting rows. When the `sql` text has placeholders, accepts additional values.
* **`run: ( sql, P... )`** ⮕


### API: Other

* **`dba.aggregate: ( P...  )`** ⮕
* **`dba.backup: ( P...  )`** ⮕
* **`dba.checkpoint: ( P...  )`** ⮕
* **`dba.close: ( P...  )`** ⮕
* **`dba.function: ( P...  )`** ⮕
* **`dba.load_extension: ( P...  )`** ⮕
* **`dba.pragma: ( P...  )`** ⮕
* **`dba.transaction: ( P...  )`** ⮕
* **`dba.get_foreign_key_state:`** ⮕
* **`dba.set_foreign_key_state: ( onoff )`** ⮕
* **`dba.read: ( path )`** ⮕ Execute SQL statements from a file.
* **`dba.close: ()`** ⮕ Close DB.

### API: DB Introspection

* **`dba.walk_objects: ()`** ⮕ Return an iterator over all entries in `sqlite_master`; allows to inspect the
  database for all tables, views, and indexes.</strike>
* **`dba.catalog: ()`** ⮕ **deprecated** <strike>return an iterator over all entries in `sqlite_master`; allows
  to inspect the database for all tables, views, and indexes.</strike>
* **`dba.list_schemas: ()`** ⮕
* **`dba.list_schema_names: ()`** ⮕
* **`dba.type_of: ( name, schema = 'main' )`** ⮕
* **`dba.column_types: ( table )`** ⮕
* **`dba._dependencies_of: ( table, schema = 'main' )`** ⮕
* **`dba.dependencies_of:  ( table, schema = 'main' )`** ⮕
* **`is_empty: ( cfg )`** ⮕ Check whether object is empty, ex.: `dba.is_empty { schema: 'foo', }` (in the
  future also: `dba.is_empty { schema: 'foo', name: 'bar' }`, `dba.is_empty { schema: 'foo', table: 'bar'
  }`).
* **`has: ( cfg )`** ⮕ Check whether object exists, ex.: `dba.has { schema: 'foo', }` (in the future also:
  `dba.has { schema: 'foo', name: 'bar' }`, `dba.has { schema: 'foo', table: 'bar' }`).

### API: DB Structure Modification

* **`dba.clear: ( { schema: 'main', })`** ⮕ Drop all tables, views and indexes from the schema.
* **`dba.attach: ( { schema, path: '' } )`** ⮕ Attach a given path to a given schema(name); this allows to
  manage several databases with a single connection. The default value for the `path` member is the empty
  string, which symbolizes an in-memory temporary schema.

### API: In-Memory Processing

* **`dba.copy_schema: ( from_schema, to_schema )`** ⮕ Xxxxxxxxxxxx xxxxxxxxxxxx xxxxxxxxxxxx xxxxxxxxxxxx
  xxxxxxxxxxxx xxxxxxxxxxxx xxxxxxxxxxxx xxxxxxxxxxxx xxxxxxxxxxxx xxxxxxxxxxxx

### API: SQL Construction

**NOTE** these methods are likely to change in the near future.

* **`dba.as_identifier: ( x )`** ⮕ Escape text `x` for use as an SQL identifier.
* **`dba.escape_text: ( x )`** ⮕ Escape text `x` for use as an SQL string literal.
* **`dba.list_as_json: ( x )`** ⮕ Render `x` as a JSON array literal.
* **`dba.as_sql: ( x )`** ⮕ Express value `x` as SQL literal.
* **`dba.interpolate: ( sql, Q )`** ⮕ Interpolate values found in object `Q` into template string `sql`
  such that the result is valid SQL.

### API: Sortable Lists

Encoding lists of values with the [Hollerith-Codec](https://github.com/loveencounterflow/hollerith-codec)
(also see [Hollerith](https://github.com/loveencounterflow/hollerith)) gives you a byte array (`bytea`) with
a total ordering that preserves numerical order, in contradistinction to sorting over SQLite JSON arrays,
which sorts according to the string representation of the array.

* **`dba.as_hollerith: ( x )`** ⮕ Encode a value with Hollerith-Codec
* **`dba.from_hollerith: ( x )`** ⮕ Decode a Hollerith-encoded value

### Properties

* **`dba.sqlt`** ⮕ The underlying `better-sqlite3` object which mediates communication to SQLite3.
* **`dba.cfg`** ⮕ The configuration object where per-instance settings are kept.

## Alternative API (WIP; to be merged into API proper when implemented)

* When `path` is a **string**, it must denote a file system path to an existant or non-existant file in a
  writeable directory. If the file exists, it must be a valid SQLite binary DB file (in the future, a
  `format` option might be added to allow openening SQL dumps, SQLite archives and possibly other file
  types). If the file does not exists, it will be created.
* When `path` is not given (or `undefined` or `null`), it will be interpreted like `true`, below.
* When `path` is a **boolean**, a RAM DB will be created. When `path` is `true` (the default if `path` is
  not given), this indicates the user wishes to have a RAM DB with file system support (which will be used
  by SQLite in case RAM is getting scarce); in SQLite parlance, this is called a ['temporary'
  database](https://www.sqlite.org/inmemorydb.html#temp_db). When `path` is `false`, then what the SQLite
  documentation calls an ['in-memory database' (without file
  support)](https://www.sqlite.org/inmemorydb.html) will be created.
* When `schema` is not given, it is assumed to be the string `main`, which is SQLite's name for the default
  schema. When `dba.open()` (the instance method) is called with `schema` set implicitly or explicitly to
  `main`, it will always fail except when the `main` DB is an empty (placeholder) DB. In this case, the
  placeholder DB will be silently dropped and replaced with a new DB. Therefore, one could do the following:

  ```coffee
  dba = Dba.open { schema: 'foo', }       # creates RAM DB 'foo' and also empty placeholder DB 'main'
  dba.open { path: 'path/to/some.db', }   # opens file DB `some.db` as 'main'
  ```

### API: Instantiation, Opening / Creating Schemas

* **`new Dba: ( cfg )`** ⮕ Create a new ICQL-DBA instance. Optionally, an object with the following
  members, all of which are, in turn, optional, may be passed in:
  * **`sqlt`** (`null`) ⮕ An [`better-sqlite3`](https://github.com/JoshuaWise/better-sqlite3/)
    instance (or any object that behaves in a compatible way).
  * **`echo`** (`false`) ⮕ Whether to echo statements to the terminal (under revision).
  * **`debug`** (`false`) ⮕ Whether to print additional debugging info (under revision).
  * **`path`** (`''`) ⮕ Path to an SQLite DB file; leave unspecified or set to the empty string or
    the special string `':memory:`' to create a RAM-based schema.
  * **`schema`** (`'main'`) ⮕ The name of the schema to attach the new DB to. In case this is not
    `main`, ICQL-DBA will still create an empty, RAM-based schema `main`.
  * **`create`** (`true`) ⮕ Whether to create a file at the location given by `path` in case it
    doesn't exists; has no effect in case of RAM DBs.
  * **`timeout`** (`5000`) ⮕ The number of milliseconds to wait when executing queries on a locked
    database, before throwing an `SQLITE_BUSY` error.
  * **`readonly`** (`false`) ⮕ Whether to open the DB for reading only.

* **`dba.open: ( { path, schema, } )`** ⮕ Open a new `schema` at location `path`. Both `path` and `schema`
  must always be given and valid. It is not possible to `open()` the privileged schemas `main` and `temp`.
  The `schema` must not yet exist in the connection; to `open()` an existing schema you must first `close()`
  it.

* **`dba.save: ( { path, schema, overwrite, } )`** ⮕
  * `schema` must be a [known schema](#gls_known_schema);
  * `path` must be a [file system path](#gls_fs_path);
  * `overwrite` (default `false`) must be a boolean;
  * an error will be raised if `path` already exists and `overwrite` is `false` (the default), *even if the
    new path is identical to the schema's current path*.
  * a schema associated with a given path `a` will *remain* to be associated with `a` even after being
    `dba.save()`d to another path `b`, that is, `dba.save()` always produces a new (independent) copy
    and does not modify the live DB; however, one can

## Glossary

* <a name='gls_schema'>**schema**</a> ◆ A `schema` (a DB name) is a non-empty string that identifies a DB
  that is attached to a given ICQL-DBA instance (a.k.a. a DB connection). Names of tables and views (as well
  as some pragmas) may be prefixed with a schema to specify a DB other than the principal one.

  The default schema is `main`, which is invariably associated with the principal DB—the one that was opened
  or created when the ICQL-DBA instance was created. This DB cannot be detached; only secondary DBs can be
  attached and detached.

  In less strict terms, a 'schema' can also mean a live database that has been attached to an ICQL-DBA
  instance (to an SQLite connection), especially XXXXXXXXXXXXXXXXXXXXX XXXXXXXXXXXXXXXXXXXXX
  XXXXXXXXXXXXXXXXXXXXX XXXXXXXXXXXXXXXXXXXXX XXXXXXXXXXXXXXXXXXXXX XXXXXXXXXXXXXXXXXXXXX
  XXXXXXXXXXXXXXXXXXXXX

  Observe that the schemas `main` and `temp` are special: "The schema-names 'main' and 'temp' refer to the
  main database and the database used for temporary tables. The main and temp databases cannot be attached
  or detached."—[*SQLite Documentation*](https://www.sqlite.org/lang_attach.html)

* <a name='gls_symbolic_path'>**symbolic path**</a> ◆ SQLite uses the special values `':memory:'` and `''`
  (the emtpy string) for paths as escape mechanisms so users can specify [in-memory DBs]() and [temporary
  DBs](). These special values are not valid **file system** paths.

* <a name='gls_fs_path'>**file system path**</a> ◆ A non-empty string that points to a file (not a
  directory) in the file system. Observe that generally, the *file* (the portion that the last path segment
  refers to) does not have to exist and will be either created when missing (with `dba.open()` and
  `dba.save()`) or cause an error (with `dba.save()`) to prevent accidental overwrite (where not permitted
  by `overwrite: true`). However, the parent directory of the referred file *must always already exist*; no
  directories (except for temporary ones) will be created implicitly.

* <a name='gls_db'>**database (DB)**</a> ◆ Somewhat not unlike insects that live through the stages of
  larva, puppa, and imago, SQLite databases have three life cycle stages:

  1) as <a name='gls_db'>**SQL dump**</a>, i.e. an SQL text file (which is how database structures are
     commonly authored: as text, and also how they are often archived to VCSs);

  1) as (binary) <a name='gls_db'>**DB file**</a> (not unlike a binary video or offcie document); and as

  1) as <a name='gls_db'>**live DB**</a> (that is partly or wholly represented in RAM). Only this form is
     amenable to changes in structure and content without resorting to crude textual search-and-replace.

  <!-- In addition to these, a so-called 'empty placeholder DB' is what ICQL-DBA creates  -->

  The unqualified term 'database' may refer to any one of these.

* <a name='gls_binary_db'>**(binary) DB file**</a> ◆ xxxxxxxx xxxxxxxx xxxxxxxx xxxxxxxx xxxxxxxx xxxxxxxx
* <a name='gls_dump'>**SQL dump (file)**</a> ◆ xxxxxxxx xxxxxxxx xxxxxxxx xxxxxxxx xxxxxxxx xxxxxxxx
* <a name='gls_in_memory_schema'>**in-memory schema** (also: **in-memory DB**)</a> ◆ xxxxxxxx
* <a name='gls_temporary_schema'>**temporary schema** (also: **temporary DB**)</a> ◆ xxxxxxxx
* <a name='gls_known_schema'>**known schema**</a> ◆ the name of **live DB** that can be accessed from the
  same connection ⟺ a schema name that is listed by `dba.list_schemas()`.

## Todo

* [ ] provide a way to use JS arrays for SQL values tuples, as in `select * from t where x in ( 2, 3, 5 );`
* [ ] provide a way to notate formats, use raw SQL strings with placeholders, ex. `select * from t where x
  in $tuple:mylist;`, `select * from $name:mytable;`. This could also be used to provide special behavior
  e.g. for the `limit` clause: in PostgreSQL, when `$x` in `select + from t limit $x` is `null`, no limit is
  enforced; however, in SQLite, one has to provide `-1` (or another negative integer) to achieve the same.
  Likewise, `true` and `false` have to be converted to `1` and `0` in SQLite, names in dynamic queries have
  to be quoted and escaped, &c. See https://www.npmjs.com/package/puresql for some ideas for formats; we'll
  probably favor English names over symbols since so many SQLish dialects already use so many conflicting
  sigils like `@` and so on. Named formats could also be provided by user.
* [ ] user defined functions?
* [ ] services like the not-entirely obvious way to get table names with columns out of SQLite (which
  relies on `join`ing rows from `sqlite_master` with rows from `pragma_table_info(...)`)?
* [ ] provide a path to build dynamic SQL; see https://github.com/ianstormtaylor/pg-sql-helpers for some
  ideas.
* [ ] unify usage of the terms 'schema' and 'database' (DB)
* [ ] rename `list_schemas()`, `list_schema_names()`
* [ ] unify `dba.limit()` with `dba.list()` such that `dba.list()` may be called either as `dba.list
  iterator` or as `dba.list n, iterator`
<!-- * [ ] allow to associate a RAM DB with a file and allow `dba.save()` without a path -->
* [ ] consider to add API (`dba.bind_to()`) to derive an instance with methods bound to a given schema:

  ```coffee
  dba   = new Dba()
  dba_1 = dba.bind_to { schema: 'dba_1', }
  dba_2 = dba.bind_to { schema: 'dba_2', }
  dba_1 = DBA.open { path: 'path/to/dba_1.db', }
  dba_2 = DBA.open { path: 'path/to/dba_2.db', }
  ```

  Now `dba_1`, `dba_2` exist in the same connection; there is an empty placeholder schema `main`.
* [ ] consider to disallow using the `main` and `temp` schemas altogether as they are annoyingly unlike
  other, user-defined schemas and require a lot of special-casing. On a related note, disallow / discourage
  using a default setting for `schema` setting of `main`, and encourage to always use fully qualified table
  names (to be sure, since SQLite name resolution works in the order of schemas attached, in principle one
  can have an empty `main` schema and do all the work in an `attach()`ed `second` schema without having to
  prefix all table names with the schema, *but* this does not work e.g. for the `sqlite_schema` table which
  is implicitly present in each schema). *In the interest of the principle of least surprise, always use
  fully qualified names as in `select * from schema.table`*.
* [ ] document two distinct ways of using ICQL-DBA:
  * single DB, no in-memory processing: *can* use `dba = new Dba { path, }`, *can* use schema `main` &
    unqualified table names;
  * multiple DB and/or RAM processing (for new DB or copied from file): use `dba = new Dba()` without
    `path`, then one or more `dba.open { path, schema, }` calls to attach DBs to schemas; do not use schema
    `main` at all.
* [X] map `better-sqlite3`'s instantiation options:
  * `readonly`: open the database connection in readonly mode (default: `false`). <ins>(Leave as-is)</ins>
  * `fileMustExist`: if the database does not exist, an Error will be thrown instead of creating a new file.
    This option does not affect in-memory or `readonly` database connections (default: `false`). <ins>(use
    `create := not fileMustExist`)</ins>
  * `timeout`: the number of milliseconds to wait when executing queries on a locked database, before
    throwing a `SQLITE_BUSY` error (default: 5000). <ins>(Leave as-is)</ins>
  * `verbose`: provide a function that gets called with every SQL string executed by the database connection
    (default: `null`). <ins>(consider merging with options `echo`, `debug`)</ins>
* [ ] simplify `_copy_schema()`, do not special-case schema `main`
* [ ] consider to forego the unnecessary and confusing distinction between 'in-memory' and 'temporary'
  databases (schemas) that has little to no utility; replace both 'in-memory' and 'temporary' by 'RAM'. To
  this end,
  * [ ] do not use paths `''`, `':memory:'` to indicate a 'tempory' or an 'in-memory' DB; rather, stipulate
    two new parameters:
    * **`ram`** (`false`) ⮕ When `true`, indicates that all processing will be done in RAM, not on disk. RAM
      DBs that were `open()`ed with a `path` argument will be copied to RAM implicitly; they can be
      `save()`d without passing `path` to `save()`. Ex.:

      ```coffee
      dba = new Dba()
      dba.open { path: 'path/to/my.db', schema: 'my', ram: true, }  # schema 'my' will be processed in RAM
      dba.execute "create table my.foo ( id integer primary key );" # table only in RAM, not on disk
      dba.save { schema: 'my', }                                    # table written to 'path/to/my.db', DB stays in RAM
      ```

      Observe that as a matter of course, users have to choose between speed and safety: a RAM DB can
      operate much faster than a disk-based one, but in the unlikely event of an unexpected software fault
      (`/s`), all unsaved data in a RAM DB is inevitably lost.

    * **`disk`** (`true`) ⮕ Whether ["parts of a [RAM DB] might be flushed to disk [...] if SQLite comes
      under memory pressure"](https://www.sqlite.org/inmemorydb.html#temp_db). Has no effect if `ram` is
      `false`.

<!-- * [ ] consider to return from `open()` an instance of Dba that is bound to schema, but has disadvantage
  of still having to use properly qualified object names in SQL, so maybe not a good idea -->

* [ ] introduce a method to save asynchronously:
  * **`save_async: { schema, [ path ], progress, }`** ⮕ Like `save()`, but works asynchronously and has the
    option to call back for progress reports. This method uses [the `better-sqlite3` API `backup()` method
    with `{ attached: schema,
    }`](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#backupdestination-options---promise).
    When given, the `progress` property should be a function; this function will be called with an object `{
    totalPages, remainingPages, }` containing the total number of pages in the DB and the number of pages
    that remain to be written.

    * original API: return number of [pages](https://www.sqlite.org/fileformat.html#pages) (or `undefined`,
      `null` not allowed) to be written in one batch (cycle of the event loop); should make this more
      explicit e.g. by calling `dba.set_backup_pages_per_cycle()`. Default is `100`.


