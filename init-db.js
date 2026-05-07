// init-db.js — Initialize SQLite database
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'student_task_manager.db');
const schemaPath = path.join(__dirname, 'database', 'schema.sql');

// Check if database already exists
if (fs.existsSync(dbPath)) {
  console.log('Database already exists');
  process.exit(0);
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Read and execute schema
const schema = fs.readFileSync(schemaPath, 'utf8');
const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);

let completed = 0;
const total = statements.length;

statements.forEach((statement, index) => {
  const stmt = statement.trim();
  if (stmt.length === 0) return;

  db.run(stmt, (err) => {
    if (err) {
      console.error(`Error executing statement ${index + 1}:`, err.message);
      console.error('Statement:', stmt);
    } else {
      completed++;
      console.log(`Executed ${completed}/${total} statements`);
      if (completed === total) {
        console.log('Database initialized successfully');
        db.close();
      }
    }
  });
});