


# ICQL

**YeSQL meets SQLite: A SQLite Adapter built with InterCourse and BetterSQLite**

ICQL is a module written in the spirit of [YeSQL](https://duckduckgo.com/?q=YeSQL&t=lm&ia=software). For
those readers who are unaware of YeSQL, there is a short [Intro to YeSQL](#a-short-intro-to-yesql); others
may want to dive right into the sections on [ICQL Installation](#icql-installation) and [ICQL
Usage](#icql-usage).

ICQL is implemented on top of [InterCourse](https://github.com/loveencounterflow/intercourse) which is an
SQL-agnostic library that does the parsing and cataloguing of 'functionality hunks' (i.e. named blocks of
code that define how to accomplish tasks).

ICQL takes **three pieces**: **(1) a database adapter** (which currently must be
[`better-sqlite3`](https://github.com/JoshuaWise/better-sqlite3) or something with a compatible API), **(2)
a path to an SQLite DB file**, and **(2) a path to an ICQL source file** with statement definitions; it then
binds together these three pieces to produce an object where the statement definitions have been turned into
methods that perform queries against the DB.


## ICQL Installation

```bash
npm install icql
```

## ICQL Usage

### Instantiation

ICQL is specifically geared towards using **(1)** [the SQLite Relational DB](http://sqlite.org/) by way of
**(2)** [the `better-sqlite3`](https://github.com/JoshuaWise/better-sqlite3) library for NodeJS. While it
should be not too difficult to (fork and) adapt ICQL to work with other DB engines such as PostgreSQL, no
concrete plans exist at the time of this writing. Understand that ICQL is still in its inceptive stage and,
as such, may lack important features, contain bugs and experience breaking changes in the future.

> FTTB all code examples below will be given in CoffeeScript. JavaScript users will have to mentally supply
> some parentheses and semicolons.

To use ICQL in your code, import the library and instantiate a `db` object:

```coffee
ICQL          = require 'icql'
Better_sqlite = require 'better-sqlite3'

settings = {
  connector:    Better_sqlite             # optional, see below
  db_path:      'path/to/my.sqlitedb'     # must indicate where your database file is / will be created
  icql_path:    'path/to/my.icql' }       # must indicate where your SQL statements file is

# create an object with methods to query against your SQLite DB:
db = await ICQL.bind settings             # NB that the `ICQL.bind()` function is currently asynchronous
```

### Qerying

After doing `db = await ICQL.bind settings` the new `db` object contains all the methods you defined in your
`*icql` file. Each method will be either a `procedure` or a `query`, the difference being that

* **procedures consists of any number of SQL statements that do not produce any output**; these may be used
  to create, modify and drop tables and views, insert and delete data and so on; on the other hand,

* **queries consist of a single SQL `select` statement with any number of resulting records**.

Here are two simple ICQL definitions:

```sql
procedure drop_tables:
  drop table if exists foo;
  drop table if exists bar;

query fetch_products( price_max ):
  select * from products where price <= $price_max;

query fetch_products( price_min, price_max ):
  select * from products where price between price_min and $price_max;
```

Owing to the [synchronous nature of
BetterSQLite](https://github.com/JoshuaWise/better-sqlite3#why-should-i-use-this-instead-of-node-sqlite3),
**all procedures and queries are synchronous**; that means you can simply write stuff like

```coffee
db = ...
db.drop_tables()
db.create_table_bar()
db.populate_table_bar()
```

without promises / callbacks / whatever async. That's great (and works out fine because SQLite is a
single-thread, in-process DB engine, so asynchronicity doesn't buy you anything within a single-threaded
event-based VM like NodeJS).

Queries return an iterator, so you can use a `for`/`of` loop in JavaScript or a `for`/`from` loop in
CoffeeScript to iterate over all results:

```js
// JS
for ( row of db.fetch_products { price_max: 400, } ) {
  do_something_with( row ); }
```

```coffee
# CS
for row from db.fetch_products { price_max: 400, }
  do_something_with row
```

### `db.$`, the 'Special' Attribute

The `db` object as constructed above will have a an attribute, `db.$`, called 'special', which in turn
contains a number of members that are used internally and may be occasionally be useful for the user:

* `db.$.query()` allows to perform ad-hoc queries against the database.

* `db.$.limit()`, `db.$.single_row()`, `db.$.first_row()`, `db.$.all_rows()`, `db.$.first_value()` are
  discussed in [Query Modifiers](#query-modifiers), below.


### Writing ICQL Statements

TBW; see [the demo]() and the [InterCourse docs](https://github.com/loveencounterflow/intercourse).


#### Definition Types

* **`procedure`**—does not return anything and may contain any number of SQL statements.

* **`query`**—returns a [JS
  iterator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators) (to be
  used in a JS `for`/`of` or CS `for`/`from` loop). These can be used with any kind of `select` statement
  (trivially including those statements that return no rows at all).

* **`single_row`**—returns a single row (not wrapped in an array). Currently, single-row queries *must*
  return exactly one row (not zero rows and not more than one row); in the future, we may implement default
  values and/or implement a `first_row` directive.

* **`single_value`**—returns a single value (not wrapped in an array). Currently, single-value queries
  *must* return exactly one row (not zero rows and not more than one row) with a single field; in the
  future, we may implement default values and/or implement a `first_value` directive.

#### Query Modifiers

Query modifiers are convenience methods

## A Short Intro to YeSQL

YeSQL originated, I believe, at some point in time in the 2010s as a reaction on the then-viral
[NoSQL](https://duckduckgo.com/?q=NoSQL&t=lm&ia=software) fad (see [the `yesql` library for Clojure from
2013 which may or may not have started the 'YeSQL' meme](https://github.com/krisajenkins/yesql)). The claims
of the NoSQL people basically was (and is) that classical (read 'mainframe', 'dinosaur', 'dusty') Relational
Database Management Systems (RDBMSs) (and the premises they were built on) is outmoded in a day and age
where horizontal scaling of data sources and agility is everything (I'm shortcutting this a lot, but this is
not a primer on the Relational Model or NoSQL).

Where NoSQL was right is where they claimed that **(1)** key/value stores are not necessarily best
implemented on top of a relational DB, and **(2)** one popular responses to the [Object-Relational Impedance
Mismatch](http://wiki.c2.com/?ObjectRelationalImpedanceMismatch), namely [Object/Relational Mappers
(ORMs)](https://en.wikipedia.org/wiki/Object-relational_mapping), are often a pain to work with, especially
when queries grow beyond the level of complexity of `select * from products order by price limit 10;`.


### Aside: Why You Don't Want to Use an ORM

Anyone who has tried an ORM before knows that **an ORM will not save you from having to know and to write
SQL; instead, you will have to learn a new dialect of SQL that comes with significantly more punctuation to
write, more edge cases to be aware of, and more complexities in setting up, configuring and using it** when
compared to the traditional sending-strings-of-SQL-to-the-DB approach. For those who insist that 'but I want
to write my queries in my day-to-day programming language' I say that sure, you can totally do that, but
then you'll have to use the syntax of that language as a matter of course, too. Turns out it's hard to come
up with a way to express SQL-ish statements in C-like syntaxes in a way that does not look like willfully
obfuscated code. Below is one (I find: typical) example from [a leading ORM project for
Python](https://www.sqlalchemy.org). If you insist on using an ORM, you will have to turn this simple SQL
statement ...

```sql
select
  users.fullname || ', ' || addresses.email_address as title
from
  users,
  addresses
  where true
    and ( users.id = addresses.user_id )
    and ( users.name between 'm' and 'z' )
    and ( addresses.email_address like '%@aol.com' or addresses.email_address like '%@msn.com' );
```

... into this contraption:

```py
select([(users.c.fullname + ", " + addresses.c.email_address).
    label('title')]).\
  where(
    and_(
      users.c.id == addresses.c.user_id,
      users.c.name.between('m', 'z'),
      or_(
        addresses.c.email_address.like('%@aol.com'),
        addresses.c.email_address.like('%@msn.com')
        )
      )
    )
```

Observe how all those `A and B` terms have to be re-written as `and_( A, B )`, how the SQL keywords
`between` and `like` get suddenly turned into method calls on columns (wat?). In this particular framework,
you will have to dot-chain every term to the preceding one, producing one long spaghetti of code. Frankly,
no gains to be seen, and it only gets worse and worse from down here. For this particular query, the SQL
`from` clause is proudly auto-supplied by the ORM; in case you have to make that it explicit, though, you
have to tack on something like

```py
(...).select_from(table('users')).select_from(table('addresses'))
```

How this is any better than `from users, addresses` totally escapes me.




