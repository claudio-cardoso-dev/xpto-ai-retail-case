const db = require('../db/database');

class DashboardDataRepository {
  getAll() {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM dashboard_data ORDER BY id DESC`;
      db.all(query, [], (err, rows) => {
        if (err) {
          console.error('Erro ao listar dashboard_data:', err);
          return reject(err);
        }
        resolve(rows || []);
      });
    });
  }

  getKPIs(period) {
    return new Promise((resolve, reject) => {
      let dateFilter = '';
      if (period === 'dia') {
        dateFilter = `WHERE created_at >= datetime('now', '-1 day')`;
      } else if (period === 'semana') {
        dateFilter = `WHERE created_at >= datetime('now', '-7 days')`;
      } else if (period === 'mes') {
        dateFilter = `WHERE created_at >= datetime('now', '-30 days')`;
      } else if (period === 'ano') {
        dateFilter = `WHERE created_at >= datetime('now', '-365 days')`;
      }
      
      const query = `
        SELECT 
          COUNT(*) as total_chats,
          SUM(CASE WHEN conversion = 1 THEN 1 ELSE 0 END) as total_conversions,
          SUM(CASE WHEN handoff = 0 THEN 1 ELSE 0 END) as total_retained,
          AVG(chat_time_seconds) as avg_time_seconds,
          AVG(evaluation) as avg_csat
        FROM dashboard_data
        ${dateFilter}
      `;
      db.get(query, [], (err, row) => {
        if (err) {
          console.error('Erro ao calcular KPIs:', err);
          return reject(err);
        }
        resolve(row || { total_chats: 0, total_conversions: 0, total_retained: 0, avg_time_seconds: 0, avg_csat: 0 });
      });
    });
  }

  create(data) {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO dashboard_data (protocol, chat_time_seconds, evaluation, handoff, conversion) VALUES (?, ?, ?, ?, ?)`;
      db.run(query, [
        data.protocol, 
        data.chat_time_seconds, 
        data.evaluation, 
        data.handoff ? 1 : 0, 
        data.conversion ? 1 : 0
      ], function(err) {
        if (err) {
          console.error('Erro ao criar dashboard_data:', err);
          return reject(err);
        }
        resolve(this.lastID);
      });
    });
  }

  update(id, data) {
    return new Promise((resolve, reject) => {
      const query = `UPDATE dashboard_data SET protocol = ?, chat_time_seconds = ?, evaluation = ?, handoff = ?, conversion = ? WHERE id = ?`;
      db.run(query, [
        data.protocol, 
        data.chat_time_seconds, 
        data.evaluation, 
        data.handoff ? 1 : 0, 
        data.conversion ? 1 : 0, 
        id
      ], function(err) {
        if (err) {
          console.error('Erro ao atualizar dashboard_data:', err);
          return reject(err);
        }
        resolve(this.changes);
      });
    });
  }

  delete(id) {
    return new Promise((resolve, reject) => {
      const query = `DELETE FROM dashboard_data WHERE id = ?`;
      db.run(query, [id], function(err) {
        if (err) {
          console.error('Erro ao deletar dashboard_data:', err);
          return reject(err);
        }
        resolve(this.changes);
      });
    });
  }
}

module.exports = new DashboardDataRepository();
