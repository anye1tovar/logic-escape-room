const { Pool } = require("pg");
const config = require("../config");

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
});

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rooms (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      theme TEXT,
      min_players INTEGER,
      max_players INTEGER,
      min_age INTEGER,
      duration_minutes INTEGER,
      difficulty INTEGER,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      cover_image TEXT
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS opening_hours (
      id SERIAL PRIMARY KEY,
      day_of_week INTEGER NOT NULL UNIQUE,
      open_time TEXT,
      close_time TEXT,
      is_open BOOLEAN NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS colombian_holidays (
      id SERIAL PRIMARY KEY,
      holiday_date TEXT NOT NULL UNIQUE,
      name TEXT
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reservations (
      id SERIAL PRIMARY KEY,
      room_id INTEGER,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      actual_duration_ms INTEGER,
      consult_code TEXT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT,
      players INTEGER NOT NULL,
      notes TEXT,
      total INTEGER,
      status TEXT DEFAULT 'PENDING',
      is_first_time BOOLEAN NOT NULL DEFAULT FALSE,
      reservation_source TEXT NOT NULL DEFAULT 'web',
      reprogrammed BOOLEAN NOT NULL DEFAULT FALSE
    );
  `);

  await pool.query(`
    ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS actual_duration_ms INTEGER;
  `);

  await pool.query(`
    ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS reservation_source TEXT NOT NULL DEFAULT 'web';
  `);

  await pool.query(`
    ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS reprogrammed BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reservation_changes (
      id SERIAL PRIMARY KEY,
      reservation_id INTEGER NOT NULL,
      before_date TEXT,
      before_start_time TEXT,
      before_end_time TEXT,
      before_room_id INTEGER,
      after_date TEXT,
      after_start_time TEXT,
      after_end_time TEXT,
      after_room_id INTEGER,
      changed_by INTEGER,
      changed_by_role TEXT,
      change_reason TEXT,
      created_at BIGINT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      name TEXT,
      role TEXT NOT NULL DEFAULT 'admin',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at BIGINT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS rates (
      id SERIAL PRIMARY KEY,
      day_type TEXT NOT NULL,
      day_label TEXT,
      day_range TEXT,
      players INTEGER NOT NULL,
      price_per_person INTEGER NOT NULL,
      currency TEXT DEFAULT 'COP'
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cafeteria_products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      description TEXT,
      available BOOLEAN NOT NULL DEFAULT TRUE,
      category TEXT,
      image TEXT
    );
  `);
}

const ready = initSchema().catch((err) => {
  console.error("Failed to initialize Postgres schema", err);
  throw err;
});

async function query(text, params) {
  await ready;
  return pool.query(text, params);
}

module.exports = { query, pool, ready };
