<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [ICQL DBA](#icql-dba)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->





# ICQL DBA

* **ICQL DBA is an [SQLite](https://sqlite.org/index.html) Database Adapter with Optional In-Memory DB
  (OIMDB) functionality.**
* Implemented using **[`better-sqlite3` (BSQLT3)](https://github.com/JoshuaWise/better-sqlite3)** to provide
  the interface between NodeJS (JavaScript) and SQLite.
* Because [BSQLT3 is almost fully synchronous](https://github.com/JoshuaWise/better-sqlite3/issues/262),
  **ICQL operates almost completely synchronously**, too.
* SQLite and BSQLT3 already provide In-Memory IMDB functionality. However, **ICQL DBA makes it easier to
  switch between In-Memory (RAM) and On-Disk operational modes**, hence the O in OIMDB.



