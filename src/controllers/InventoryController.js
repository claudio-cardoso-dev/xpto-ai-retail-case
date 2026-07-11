const inventoryRepository = require('../repositories/InventoryRepository');

class InventoryController {
  async getInventory(req, res) {
    try {
      const inventory = await inventoryRepository.getAll();
      return res.status(200).json(inventory);
    } catch (error) {
      console.error('Erro no InventoryController:', error);
      return res.status(500).json({ error: 'Erro interno no servidor' });
    }
  }
}

module.exports = new InventoryController();
