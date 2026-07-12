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
        address TEXT NOT NULL,
        profile TEXT DEFAULT 'BTC'
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
        const insert = db.prepare(`INSERT INTO customers (name, email, telefone, address, profile) VALUES (?, ?, ?, ?, ?)`);
        insert.run('João Silva', 'joao@example.com', '11999999999', 'Rua A, 123', 'BTC');
        insert.run('Maria Souza', 'maria@empresa.com', '11988888888', 'Av B, 456', 'BTB');
        insert.run('Claudio Cardoso', 'claudio@cardoso.dev', '11977777777', 'Rua C, 789', 'BTX');
        insert.finalize();
        
        // Mock order for testing getOrderStatus
        const insertOrder = db.prepare(`INSERT INTO orders (customer_id, total, status, address) VALUES (?, ?, ?, ?)`);
        insertOrder.run(3, 150.00, 'Em preparo', 'Rua C, 789');
        insertOrder.finalize();
      }
    });
  });
}

module.exports = db;
