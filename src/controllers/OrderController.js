const db = require('../db/database');

class OrderController {
  async createOrder(req, res) {
    const { customerId, total, address } = req.body;
    
    if (!customerId || total == null || !address) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const orderId = await new Promise((resolve, reject) => {
        const stmt = db.prepare(`INSERT INTO orders (customer_id, total, status, address) VALUES (?, ?, ?, ?)`);
        stmt.run(customerId, total, 'PREPARANDO', address, function(err) {
          if (err) return reject(err);
          resolve(this.lastID);
        });
        stmt.finalize();
      });

      return res.status(201).json({ success: true, orderId, status: 'PREPARANDO' });
    } catch (err) {
      console.error('Error creating order:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getOrder(req, res) {
    const { identifier } = req.params; // Can be order ID or Customer ID (for simplicity we will use customer ID to find their latest order)

    try {
      const order = await new Promise((resolve, reject) => {
        db.get(`SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 1`, [identifier], (err, row) => {
          if (err) return reject(err);
          resolve(row);
        });
      });

      if (!order) {
        return res.status(404).json({ error: 'No active orders found' });
      }

      return res.status(200).json({ success: true, order });
    } catch (err) {
      console.error('Error fetching order:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new OrderController();
