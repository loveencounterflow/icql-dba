


# ICQL

**YeSQL meets SQLite: A SQLite Adapter built with InterCourse and BetterSQLite**

ICQL is a module written in the spirit of [YeSQL](https://duckduckgo.com/?q=YeSQL&t=lm&ia=software). For
those readers who are unaware of YeSQL, there is a short [Intro to YeSQL](#a-short-intro-to-yesql); others
may want to dive right into the sections on [ICQL Installation](#icql-installation) and [ICQL
Usage](#icql-usage).

## A Short Intro to YeSQL

YeSQL originated, I believe, at some point in time in the 2010s as a reaction on the then-viral
[NoSQL](https://duckduckgo.com/?q=NoSQL&t=lm&ia=software) fad. The claims of the NoSQL people basically was
(and is) that classical (read 'mainframe', 'dinosaur', 'dusty') Relational Database Management Systems
(RDBMSs) (and the premises they were built on) is outmoded in a day and age where horizontal scaling of data
sources and agility is everything (I'm shortcutting this a lot, but this is not a primer on the Relational
Model or NoSQL).

Where NoSQL was right is where they claimed that **(1)** key/value stores are not necessarily best
implemented on top of a relational DB, and **(2)** one popular responses to the [Object-Relational Impedance
Mismatch](http://wiki.c2.com/?ObjectRelationalImpedanceMismatch), namely [Object/Relational Mappers
(ORMs)](https://en.wikipedia.org/wiki/Object-relational_mapping), are often a pain to work with, especially
when queries grow beyond the level of complexity of `select * from products order by price limit 10;`.
Anyone who has tried an ORM before knows that **an ORM will not save you from having to know and to write
SQL; instead, you will have to learn a new dialect of SQL that comes with significantly more punctuation to
write, more edge cases to be aware of, and more complexities in setting up, configuring and using it** when
compared to the traditional sending-strings-of-SQL-to-the-DB approach.



nodes that live somewhere in the network

https://github.com/krisajenkins/yesql

## ICQL Installation

## ICQL Usage
