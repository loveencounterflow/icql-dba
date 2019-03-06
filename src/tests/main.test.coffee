#-----------------------------------------------------------------------------------------------------------
@demo = ->
  settings  = @get_settings()
  db        = await ICQL.bind settings
  db.load join_path settings.sqlitemk_path, 'extensions/amatch.so'
  db.load join_path settings.sqlitemk_path, 'extensions/csv.so'
  # R.$.db.exec """select load_extension( 'fts5' );"""
  db.import_table_texnames()
  db.create_token_tables()
  db.populate_token_tables()
  # # whisper '-'.repeat 108
  # # info row for row from db.fetch_texnames()
  whisper '-'.repeat 108
  urge 'fetch_texnames';        info xrpr row for row from db.fetch_texnames { limit: 100, }
  # urge 'fetch_rows_of_txftsci'; info xrpr row for row from db.fetch_rows_of_txftsci { limit: 5, }
  # urge 'fetch_rows_of_txftscs'; info xrpr row for row from db.fetch_rows_of_txftscs { limit: 5, }
  urge 'fetch_stats'; info xrpr row for row from db.fetch_stats()
  whisper '-'.repeat 108
  urge 'fetch_token_matches'
  whisper '-'.repeat 108
  info ( xrpr row ) for row from db.fetch_token_matches { q: 'Iota', limit: 10, }
  whisper '-'.repeat 108
  info ( xrpr row ) for row from db.fetch_token_matches { q: 'acute', limit: 10, }
  whisper '-'.repeat 108
  info ( xrpr row ) for row from db.fetch_token_matches { q: 'u', limit: 10, }
  whisper '-'.repeat 108
  info ( xrpr row ) for row from limit 3, db.fetch_token_matches { q: 'mathbb', limit: 10, }
  # debug ( k for k of iterator )
  return null
