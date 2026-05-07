// config/db.js — SQLite connection with MySQL2-like interface
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../database/student_task_manager.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('DB connection failed:', err.message);
  } else {
    console.log('SQLite connected');
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Wrapper to mimic MySQL2 pool.query() interface
// Returns [rows, fields] for SELECT, [result] for INSERT/UPDATE/DELETE
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    // Check if it's a SELECT query
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve([rows, undefined]); // Mimic [rows, fields]
        }
      });
    } else {
      // For INSERT, UPDATE, DELETE
      db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          // Mimic MySQL2 result object
          const result = {
            insertId: this.lastID,
            affectedRows: this.changes,
            changedRows: this.changes
          };
          resolve([result]);
        }
      });
    }
  });
};

// Add query method to db object
db.query = query;

module.exports = db;
