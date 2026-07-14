const db = require('../db/database');

class FailedIntentRepository {
  async save(protocol, userMessage, contextState) {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`INSERT INTO failed_intents (protocol, user_message, context_state) VALUES (?, ?, ?)`);
      stmt.run(protocol, userMessage, contextState, function(err) {
        if (err) {
          return reject(err);
        }
        resolve(this.lastID);
      });
      stmt.finalize();
    });
  }

  async getAll() {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM failed_intents ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) {
          return reject(err);
        }
        resolve(rows);
      });
    });
  }
}

module.exports = new FailedIntentRepository();
