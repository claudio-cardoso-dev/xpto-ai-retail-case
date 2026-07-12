const db = require('../db/database');

class CustomerRepository {
  /**
   * Busca um cliente pelo Telefone ou E-mail
   * @param {string} identifier Telefone ou E-mail
   * @returns {Promise<object|null>} Cliente encontrado
   */
  findByTelefoneOrEmail(identifier) {
    return new Promise((resolve, reject) => {
      // Limpa pontuações do Telefone se for número
      const cleanIdentifier = identifier.replace(/[^\w\s@.]/gi, '');
      const query = `SELECT * FROM customers WHERE email = ? OR telefone = ? OR telefone = ?`;
      
      // Tentamos buscar o identifier puro ou limpo (somente números)
      db.get(query, [identifier, identifier, cleanIdentifier], (err, row) => {
        if (err) {
          console.error('Erro ao buscar cliente:', err);
          return reject(err);
        }
        resolve(row || null);
      });
    });
  }

  /**
   * Cria um novo cliente
   * @param {object} data
   * @returns {Promise<number>} ID do cliente inserido
   */
  createCustomer(data) {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO customers (name, email, telefone, address, profile) VALUES (?, ?, ?, ?, ?)`;
      
      const email = data.email || null;
      const telefone = data.telefone || null;
      const profile = data.profile || 'BTC';
      
      db.run(query, [data.name, email, telefone, data.address, profile], function(err) {
        if (err) {
          console.error('Erro ao criar cliente:', err);
          return reject(err);
        }
        resolve(this.lastID);
      });
    });
  }
  updateAddress(identifier, newAddress) {
    return new Promise((resolve, reject) => {
      const cleanIdentifier = identifier.replace(/[^\w\s@.]/gi, '');
      const query = `UPDATE customers SET address = ? WHERE email = ? OR telefone = ? OR telefone = ?`;
      db.run(query, [newAddress, identifier, identifier, cleanIdentifier], function(err) {
        if (err) {
          console.error('Erro ao atualizar endereço:', err);
          return reject(err);
        }
        resolve(this.changes);
      });
    });
  }

  getLastOrderStatus(customerId) {
    return new Promise((resolve, reject) => {
      const query = `SELECT id, status, total, address FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 1`;
      db.get(query, [customerId], (err, row) => {
        if (err) {
          console.error('Erro ao buscar pedido:', err);
          return reject(err);
        }
        resolve(row || null);
      });
    });
  }

  getAllCustomers() {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM customers ORDER BY id DESC`;
      db.all(query, [], (err, rows) => {
        if (err) {
          console.error('Erro ao listar clientes:', err);
          return reject(err);
        }
        resolve(rows || []);
      });
    });
  }

  updateCustomer(id, data) {
    return new Promise((resolve, reject) => {
      const query = `UPDATE customers SET name = ?, email = ?, telefone = ?, address = ?, profile = ? WHERE id = ?`;
      const profile = data.profile || 'BTC';
      db.run(query, [data.name, data.email, data.telefone, data.address, profile, id], function(err) {
        if (err) {
          console.error('Erro ao atualizar cliente:', err);
          return reject(err);
        }
        resolve(this.changes);
      });
    });
  }

  deleteCustomer(id) {
    return new Promise((resolve, reject) => {
      const query = `DELETE FROM customers WHERE id = ?`;
      db.run(query, [id], function(err) {
        if (err) {
          console.error('Erro ao deletar cliente:', err);
          return reject(err);
        }
        resolve(this.changes);
      });
    });
  }
}

module.exports = new CustomerRepository();
