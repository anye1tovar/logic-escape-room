const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const config = require("../config");

const dbFile =
  config.databaseFile ||
  path.join(__dirname, "..", "data", "logic-escape-room.db");
const dbDir = path.dirname(dbFile);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error("Error opening database", err);
    return;
  }
  console.log("SQLite DB ready at", dbFile);
});

// Initialize schema if missing
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      theme TEXT,
      min_players INTEGER,
      max_players INTEGER,
      min_age INTEGER,
      duration_minutes INTEGER,
      difficulty INTEGER,
      active INTEGER DEFAULT 1
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS opening_hours (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_of_week INTEGER NOT NULL,
      open_time TEXT,
      close_time TEXT,
      is_open INTEGER NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS colombian_holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      holiday_date TEXT NOT NULL UNIQUE,
      name TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      players INTEGER NOT NULL,
      status TEXT DEFAULT 'CONFIRMED'
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_type TEXT NOT NULL,
      day_label TEXT,
      day_range TEXT,
      players INTEGER NOT NULL,
      price_per_person INTEGER NOT NULL,
      currency TEXT DEFAULT 'COP'
    )
  `);
});

module.exports = db;
