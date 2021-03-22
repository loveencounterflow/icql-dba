<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [ICQL-DBA](#icql-dba)
  - [Installation](#installation)
  - [Usage](#usage)
  - [API](#api)
    - [API: Debugging](#api-debugging)
    - [API: Interna](#api-interna)
    - [API: Query Result Adapters](#api-query-result-adapters)
    - [API: Querying](#api-querying)
    - [API: Other](#api-other)
    - [API: Db Structure Reporting](#api-db-structure-reporting)
    - [API: Db Structure Modification](#api-db-structure-modification)
    - [API: In-Memory Processing](#api-in-memory-processing)
    - [API: Sql Construction](#api-sql-construction)
    - [API: Sortable Lists](#api-sortable-lists)
  - [Todo](#todo)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


# ICQL-DBA

**Your Slogan Here**


## Installation

```bash
npm install icql-dba
```

## Usage


## API

### API: Debugging

### API: Interna

### API: Query Result Adapters

Query result adapters are convenience methods to transform the result set. Because they exhaust the iterator
that is returned from a `query`, only a single method may be used; if you have to iterate more than once
over a given result set, use `dba.all_rows db.my_query ...`.

* **`dba.limit             n, iterator`**—returns an iterator over the first `n` rows;
* **`dba.all_rows          iterator`**—returns a list of all rows;
* **`dba.single_row        iterator`**—like `first_row`, but throws on `undefined`;
* **`dba.first_row         iterator`**—returns first row, or `undefined`;
* **`dba.single_value      iterator`**—like `first_value`, but throws on `undefined`;
* **`dba.first_value       iterator`**—returns first field of first row, or `undefined`.
* **`dba.first_values      iterator`**—returns an iterator over the first field of all rows.
* **`dba.all_first_values  iterator`**—returns a list with the values of the first field of each row.
  Useful to turn queries like `select product_id from products order by price desc limit 100` into a flat
  list of values.

### API: Querying

### API: Other

### API: Db Structure Reporting

### API: Db Structure Modification

### API: In-Memory Processing

### API: Sql Construction

* **`dba.escape_text   x`**—turn text `x` into an SQL string literal.
* **`dba.list_as_json  x`**—turn list `x` into a JSON array literal.
* **`dba.as_sql        x`**—express value `x` as SQL literal.
* **`dba.interpolate   sql, Q`**—interpolate values found in object `Q` into string `sql`.

### API: Sortable Lists

* **`as_hollerith:   ( x ) -> HOLLERITH.encode x`**—encode a value with
  [Hollerith-Codec](https://github.com/loveencounterflow/hollerith-codec) (also see
  [Hollerith](https://github.com/loveencounterflow/hollerith))
* **`from_hollerith: ( x ) -> HOLLERITH.decode x`**—decode a Hollerith-encoded value

---------------------------

* **`dba.sql`**—an object with metadata that describes the result of parsing the definition source file.

* **`dba.load    path`**—load an extension.
* **`dba.read    path`**—execute SQL statements in a file.

* **`dba.prepare sql`**—prepare a statement. Returns a `better-sqlite3` `statement` instance.
* **`dba.execute sql`**—execute any number of SQL statements.
* **`dba.query   sql, P...`**—perform a single `select` statement. Returns an iterator over the result set's
  rows. When the `sql` text has placeholders, accepts additional values.
* **`dba.settings`**—the settings that the `db` object was instantiated with.
* **`dba.as_identifier  text`**—format a string so that it can be used as an identifier in an SQL statement
  (even when it contains spaces or quotes).
* **`dba.catalog()`**—return an iterator over all entries in `sqlite_master`; allows to inspect the
  database for all tables, views, and indexes.
* **`dba.clear()`**—drop all tables, views and indexes from the database.

* **`dba.close()`**—close DB.



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
* [ ] pragmas?
* [ ] services like the not-entirely obvious way to get table names with columns out of SQLite (which
  relies on `join`ing rows from `sqlite_master` with rows from `pragma_table_info(...)`)?
* [ ] provide a path to build dynamic SQL; see https://github.com/ianstormtaylor/pg-sql-helpers for some
  ideas.
* [ ] ??? introduce single-level namespaces for constructs ???
* [ ] allow default values for parameters so we can avoid to always having to define 1 method for a query
  *with* a `$limit` and another 1 method for another query that looks exactly the same except for the
  missing `$limit`.—How does that work with method overloading as implemented, if at all? Any precedences in
  existing languages?
* [ ] reduce boilerplate for `insert` procedures and fragments, etc.
* [ ] implement inheritance for ICQL declarations
* [ ] remove `better-sqlite3` dependency, consumers will have to pass in a DB instance
* [ ] introduce syntax to distinguish between compile-time and run-time interpolated parameters, ex.:
  `select * from $META:schema.$META:table where length > $min_length;`
* [ ] refactor returned object, `_local_methods` with MultiMix



