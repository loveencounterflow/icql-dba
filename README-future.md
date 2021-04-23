# ICQL DBA


<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [Introduction](#introduction)
- [OIMDB Functionality](#oimdb-functionality)
- [Regular Persistency](#regular-persistency)
- [Eventual Persistency](#eventual-persistency)
- [Ad Hoc Persistency](#ad-hoc-persistency)
- [Regular Acquisition](#regular-acquisition)
- [Ad Hoc Acquisition](#ad-hoc-acquisition)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


## Introduction

* **ICQL DBA is an [SQLite](https://sqlite.org/index.html) Database Adapter with Optional In-Memory DB
  (OIMDB) functionality.**
* Implemented using **[`better-sqlite3` (BSQLT3)](https://github.com/JoshuaWise/better-sqlite3)** to provide
  the interface between NodeJS (JavaScript) and SQLite.
* Because [BSQLT3 is almost fully synchronous](https://github.com/JoshuaWise/better-sqlite3/issues/262),
  **ICQL operates almost completely synchronously**, too.
* SQLite and BSQLT3 already provide In-Memory IMDB functionality. However, **ICQL DBA makes it easier to
  switch between In-Memory (RAM) and On-Disk operational modes**, hence the O in OIMDB.

## OIMDB Functionality

* To process a DB file in RAM, ICQL DB first opens the file using a ad-hoc schema name and then copies all
  DB objects (table, view and index definitions as well as data) from that ad-hoc schema into a RAM-based
  schema using the name supplied in the `open()` call.
  * **Note**—SQLite 'temporary schemas' are *mostly* based in RAM but may use disk space in case available
    memory becomes insufficient. Schemas *without* disk-based backup also exists; ICQL DBA users can elect
    to use either model (with the `disk: true|false` configuration) although IMO there's little reason to
    not use optional HD support.
  * **Note**—Confusingly, to get a RAM-based DB with the original SQLite and BSQLT3 API, you either use the
    empty string to get disk support (in ase of RAM shortage) or the pseudo-path `:memory:` to get one
    without disk support. In ICQL DBA, you use the `ram: true|false, disk: true|false` settings instead
    which is much clearer. In addition, you can *still* optionally use the `path` setting to specify the
    default path to be used as default for the `save()` command.

## Regular Persistency

* When a DB is `open()`ed (from a file) with setting `ram: false`, every change to its structure or its
  business data will be immediately reflected to disk; this, of course, is the regular mode of operation
  for SQLite and most all RDBMSes and is, hence, known as Regular Persistency (RP).
  * If the referenced file is non-existant, it will be auto-created unless `create: false` has been
    specified.
* Regular Persistency always uses the [SQLite binary file format](https://sqlite.org/fileformat.html).

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

¹ *`save()` calls are optional no-ops for Regular Persistency*








