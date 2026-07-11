const inventory = require('../data/inventory');

const chatController = {
  handleMessage: (req, res) => {
    const { message, context = {} } = req.body;
    const lowerMessage = message.toLowerCase();

    // Default response structure
    const response = {
      text: '',
      options: [],
      products: [],
      transferToHuman: false,
      context: { ...context }
    };

    // 1. Initial Greeting
    if (lowerMessage.includes('olá') || lowerMessage.includes('oi') || lowerMessage.includes('bom dia') || lowerMessage.includes('boa tarde')) {
      response.text = 'Olá! Sou o assistente de vendas da XPTO Sneakers. Como posso ajudar você hoje?';
      response.options = ['Ver catálogo', 'Dúvida sobre pedido', 'Falar com um humano'];
      return res.json(response);
    }

    // 2. Transfer to Human
    if (lowerMessage.includes('humano') || lowerMessage.includes('atendente') || lowerMessage.includes('falar com uma pessoa')) {
      response.text = 'Entendi. Estou transferindo você para a nossa equipe de especialistas. Por favor, aguarde um instante.';
      response.transferToHuman = true;
      return res.json(response);
    }

    // 3. View Catalog / Recommendations
    if (lowerMessage.includes('catálogo') || lowerMessage.includes('comprar') || lowerMessage.includes('tênis')) {
      response.text = 'Temos várias opções incríveis! Você tem preferência por alguma marca? Trabalhamos com Nike, Adidas, Puma, Reebok e Vans.';
      response.options = ['Nike', 'Adidas', 'Puma', 'Reebok', 'Vans', 'Ver todos'];
      return res.json(response);
    }

    // 4. Brand Filtering
    const brands = ['nike', 'adidas', 'puma', 'reebok', 'vans'];
    const matchedBrand = brands.find(brand => lowerMessage.includes(brand));
    
    if (matchedBrand) {
      const filteredProducts = inventory.filter(p => p.brand.toLowerCase() === matchedBrand).slice(0, 5); // Return up to 5 products
      response.text = `Excelente escolha! Aqui estão alguns modelos da ${matchedBrand.charAt(0).toUpperCase() + matchedBrand.slice(1)} que temos em estoque:`;
      response.products = filteredProducts;
      response.options = ['Falar com um humano', 'Voltar ao menu'];
      return res.json(response);
    }

    // 5. Fallback / Unrecognized Intent
    response.text = 'Desculpe, não entendi muito bem. Você gostaria de ver nossos produtos ou falar com um de nossos consultores humanos?';
    response.options = ['Ver catálogo', 'Falar com um humano'];
    return res.json(response);
  }
};

module.exports = chatController;
