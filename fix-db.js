const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./src/db/customers.db');
db.run('ALTER TABLE customers ADD COLUMN profile TEXT DEFAULT "Padrao"', (err) => {
  if (err && !err.message.includes('duplicate column name')) {
    console.error(err);
  } else {
    console.log('Column added or already exists.');
  }
});
