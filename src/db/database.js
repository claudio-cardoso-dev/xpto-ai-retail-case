const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Caminho absoluto para o banco de dados
const dbPath = path.resolve(__dirname, 'customers.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados SQLite:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite.');
    initDb();
  }
});

function initDb() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        telefone TEXT UNIQUE,
        address TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        total REAL NOT NULL,
        status TEXT NOT NULL,
        address TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        customer_id INTEGER,
        value TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Inserir dados de teste (Mock)
    const checkQuery = `SELECT COUNT(*) AS count FROM customers`;
    db.get(checkQuery, (err, row) => {
      if (!err && row.count === 0) {
        console.log('Populando banco com clientes mockados...');
        const insert = db.prepare(`INSERT INTO customers (name, email, telefone, address) VALUES (?, ?, ?, ?)`);
        insert.run('João Silva', 'joao@email.com', '11999999999', 'Rua das Flores, 123 - Centro');
        insert.run('Maria Souza', 'maria@email.com', '11888888888', 'Av. Paulista, 1000 - Bela Vista');
        insert.finalize();
      }
    });
  });
}

module.exports = db;
