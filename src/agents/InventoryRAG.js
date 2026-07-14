const inventoryRepository = require('../repositories/InventoryRepository');
const Fuse = require('fuse.js');

class InventoryRAG {
  constructor() {
    this.fuse = null;
    this.inventory = [];
    this.isReady = false;
  }

  async init() {
    if (this.isReady) return;
    this.inventory = await inventoryRepository.getAll();
    
    const options = {
      includeScore: true,
      threshold: 0.4, // Grau de tolerância (0.0 é perfeito, 1.0 é qualquer coisa)
      keys: ['name', 'category', 'ingredients']
    };
    
    this.fuse = new Fuse(this.inventory, options);
    this.isReady = true;
  }

  /**
   * Busca semanticamente/fuzzy por produtos no estoque.
   * Reduz o uso de tokens injetando no prompt apenas o que o cliente buscou.
   * @param {string} query Termo de busca (ex: "coxinha", "suco", "doce")
   * @param {number} limit Limite de resultados (default: 5)
   * @returns {Array} Lista de produtos encontrados com alta relevância
   */
  async search(query, limit = 5) {
    if (!this.isReady) await this.init();
    
    if (!query || query.trim() === '') {
        return [];
    }

    const results = this.fuse.search(query);
    
    // Retorna apenas os produtos (removendo os metadados do fuse) e limita
    return results.slice(0, limit).map(result => ({
      id: result.item.id,
      category: result.item.category,
      name: result.item.name,
      price: result.item.price
    }));
  }

  /**
   * Obtém todo o inventário minificado (usado como fallback se necessário)
   */
  async getFullInventoryMin() {
    if (!this.isReady) await this.init();
    return this.inventory.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price
    }));
  }
}

module.exports = new InventoryRAG();
