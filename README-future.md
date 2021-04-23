# ICQL DBA


<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [Introduction](#introduction)
  - [OIMDB Functionality](#oimdb-functionality)

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

### OIMDB Functionality

* To process a DB file in RAM, ICQL DB first opens the file using a temporary schema name and then copies
  all DB objects into a temporary schema
  * **Note** SQLite 'temporary schemas' (which use an empty string instead of a valid file system path) are
    *mostly* based in RAM but may use disk space in case available memory becomes insufficient. Schemas
    *without* disk-based backup (which use the pseudo-path `:memory:`) also exists; ICQL DBA users can elect
    to use either model (with the `disk: true|false` configuration) although IMO there's little reason to
    choose the latter over the former.
* Persistence to HD is implemented with synchronous calls to `vacuum $schema into $tpath`. The API method to
  do so is `save()`, a method that does nothing in case a given schema is disk-based (and therefore writes
  all changes to disk, continuously); therefore, it's possible to make it so that the same code with
  strategically placed `save()` statements can run using a RAM-based ort a disk-based DB without any further
  changes. In this casse, the RAM DB will be much faster than the disk-based one, but of course the
  disk-based one will be better safeguarded against unexpected interruptions.


