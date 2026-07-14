const db = require('../db/database');

class InventoryRepository {
  async getAll() {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM products`, [], (err, rows) => {
        if (err) {
          console.error("Erro ao buscar produtos:", err);
          return resolve([]);
        }
        
        // Parse the JSON ingredients back to arrays
        const parsedRows = rows.map(row => {
          let ingredients = [];
          try {
            ingredients = JSON.parse(row.ingredients);
          } catch (e) {
            console.error("Erro no parse do JSON de ingredientes:", e);
          }
          return {
            ...row,
            ingredients
          };
        });
        
        resolve(parsedRows);
      });
    });
  }

  async findByBrand(category, limit = 5) {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM products WHERE LOWER(category) = LOWER(?) LIMIT ?`, [category, limit], (err, rows) => {
        if (err) {
          console.error("Erro ao buscar produtos por marca:", err);
          return resolve([]);
        }

        const parsedRows = rows.map(row => {
          let ingredients = [];
          try {
            ingredients = JSON.parse(row.ingredients);
          } catch (e) {
            console.error("Erro no parse do JSON de ingredientes:", e);
          }
          return {
            ...row,
            ingredients
          };
        });

        resolve(parsedRows);
      });
    });
  }
}

module.exports = new InventoryRepository();
