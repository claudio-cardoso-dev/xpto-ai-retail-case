const db = require('../db/database');

class MetricsController {
  async saveMetric(req, res) {
    const { type, customerId, value, details } = req.body;
    
    if (!type) {
      return res.status(400).json({ error: 'Missing metric type' });
    }

    try {
      const metricId = await new Promise((resolve, reject) => {
        const stmt = db.prepare(`INSERT INTO metrics (type, customer_id, value, details) VALUES (?, ?, ?, ?)`);
        stmt.run(type, customerId || null, value || null, details || null, function(err) {
          if (err) return reject(err);
          resolve(this.lastID);
        });
        stmt.finalize();
      });

      return res.status(201).json({ success: true, metricId });
    } catch (err) {
      console.error('Error saving metric:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new MetricsController();
