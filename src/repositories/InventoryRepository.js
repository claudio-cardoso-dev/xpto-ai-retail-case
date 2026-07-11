const inventoryData = [
  // Nike
  { id: 'N1', brand: 'Nike', model: 'Air Max 90', colors: ['Preto', 'Branco', 'Vermelho'], price: 799.99, stock: 15, image: 'https://images.unsplash.com/photo-1605348532760-6753d2c43329?auto=format&fit=crop&q=80&w=400' },
  { id: 'N2', brand: 'Nike', model: 'Air Force 1', colors: ['Branco', 'Preto', 'Azul'], price: 699.99, stock: 20, image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=400' },
  { id: 'N3', brand: 'Nike', model: 'Dunk Low', colors: ['Panda', 'Azul', 'Verde'], price: 899.99, stock: 5, image: 'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&q=80&w=400' },
  { id: 'N4', brand: 'Nike', model: 'Pegasus 40', colors: ['Preto', 'Laranja', 'Cinza'], price: 999.99, stock: 12, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=400' },
  { id: 'N5', brand: 'Nike', model: 'Vomero 17', colors: ['Branco', 'Preto', 'Roxo'], price: 1199.99, stock: 8, image: 'https://images.unsplash.com/photo-1605348532760-6753d2c43329?auto=format&fit=crop&q=80&w=400' },

  // Adidas
  { id: 'A1', brand: 'Adidas', model: 'Ultraboost Light', colors: ['Preto', 'Branco', 'Azul Marinho'], price: 1199.99, stock: 10, image: 'https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?auto=format&fit=crop&q=80&w=400' },
  { id: 'A2', brand: 'Adidas', model: 'NMD_R1', colors: ['Preto', 'Cinza', 'Branco'], price: 899.99, stock: 14, image: 'https://images.unsplash.com/photo-1518002171953-a080ee817e1f?auto=format&fit=crop&q=80&w=400' },
  { id: 'A3', brand: 'Adidas', model: 'Forum Low', colors: ['Branco/Azul', 'Branco/Verde', 'Preto'], price: 799.99, stock: 18, image: 'https://images.unsplash.com/photo-1536766820879-059fec98ec0a?auto=format&fit=crop&q=80&w=400' },
  { id: 'A4', brand: 'Adidas', model: 'Superstar', colors: ['Branco/Preto', 'Preto/Branco', 'Todo Branco'], price: 599.99, stock: 25, image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=80&w=400' },
  { id: 'A5', brand: 'Adidas', model: 'Stan Smith', colors: ['Branco/Verde', 'Branco/Azul', 'Todo Preto'], price: 599.99, stock: 22, image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=80&w=400' },

  // Puma
  { id: 'P1', brand: 'Puma', model: 'Suede Classic', colors: ['Preto', 'Vermelho', 'Azul'], price: 499.99, stock: 30, image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=80&w=400' },
  { id: 'P2', brand: 'Puma', model: 'RS-X', colors: ['Multicolorido', 'Preto/Branco', 'Cinza/Laranja'], price: 699.99, stock: 15, image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=80&w=400' },
  { id: 'P3', brand: 'Puma', model: 'Cali Dream', colors: ['Branco/Rosa', 'Branco/Preto', 'Pastel'], price: 549.99, stock: 18, image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=80&w=400' },
  { id: 'P4', brand: 'Puma', model: 'Deviate Nitro 2', colors: ['Laranja', 'Preto', 'Verde Limão'], price: 999.99, stock: 7, image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=80&w=400' },
  { id: 'P5', brand: 'Puma', model: 'Mayze', colors: ['Branco/Preto', 'Bege', 'Branco/Verde'], price: 649.99, stock: 12, image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=80&w=400' },

  // Reebok
  { id: 'R1', brand: 'Reebok', model: 'Club C 85', colors: ['Branco/Verde', 'Branco/Marinho', 'Creme'], price: 499.99, stock: 25, image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=80&w=400' },
  { id: 'R2', brand: 'Reebok', model: 'Classic Leather', colors: ['Branco', 'Preto', 'Cinza'], price: 499.99, stock: 28, image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=80&w=400' },
  { id: 'R3', brand: 'Reebok', model: 'Nano X3', colors: ['Preto/Branco', 'Azul', 'Verde Militar'], price: 899.99, stock: 11, image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=80&w=400' },
  { id: 'R4', brand: 'Reebok', model: 'Pump Omni Zone II', colors: ['Branco/Preto/Laranja', 'Preto/Branco', 'Azul'], price: 1099.99, stock: 4, image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=80&w=400' },
  { id: 'R5', brand: 'Reebok', model: 'Zig Kinetica', colors: ['Preto/Cinza', 'Branco/Vermelho', 'Todo Preto'], price: 799.99, stock: 9, image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=80&w=400' },

  // Vans
  { id: 'V1', brand: 'Vans', model: 'Old Skool', colors: ['Preto/Branco', 'Azul Marinho', 'Xadrez'], price: 399.99, stock: 40, image: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&q=80&w=400' },
  { id: 'V2', brand: 'Vans', model: 'Sk8-Hi', colors: ['Preto/Branco', 'Verde', 'Preto Total'], price: 499.99, stock: 22, image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&q=80&w=400' },
  { id: 'V3', brand: 'Vans', model: 'Slip-On', colors: ['Checkerboard Preto/Branco', 'Preto Liso', 'Branco'], price: 349.99, stock: 35, image: 'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?auto=format&fit=crop&q=80&w=400' },
  { id: 'V4', brand: 'Vans', model: 'Authentic', colors: ['Preto', 'Vermelho', 'Azul Marinho'], price: 349.99, stock: 38, image: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&q=80&w=400' },
  { id: 'V5', brand: 'Vans', model: 'Half Cab', colors: ['Preto', 'Marrom', 'Azul'], price: 549.99, stock: 14, image: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&q=80&w=400' },
];

class InventoryRepository {
  /**
   * Retorna todo o estoque
   */
  async getAll() {
    return inventoryData;
  }

  /**
   * Retorna produtos filtrados por marca (limitado)
   * @param {string} brand Nome da marca
   * @param {number} limit Limite de resultados
   */
  async findByBrand(brand, limit = 5) {
    const filtered = inventoryData.filter(p => p.brand.toLowerCase() === brand.toLowerCase());
    return filtered.slice(0, limit);
  }
}

module.exports = new InventoryRepository();
