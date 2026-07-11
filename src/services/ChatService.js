const inventoryRepository = require('../repositories/InventoryRepository');

class ChatService {
  /**
   * Processa a mensagem do usuário e devolve a resposta do bot
   * @param {string} message Mensagem enviada pelo cliente
   * @param {object} context Contexto anterior da conversa
   */
  async processMessage(message, context = {}) {
    const lowerMessage = message.toLowerCase();
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
      return response;
    }

    // 2. Transfer to Human
    if (lowerMessage.includes('humano') || lowerMessage.includes('atendente') || lowerMessage.includes('falar com uma pessoa')) {
      response.text = 'Entendi. Estou transferindo você para a nossa equipe de especialistas. Por favor, aguarde um instante.';
      response.transferToHuman = true;
      return response;
    }

    // 3. Brand Filtering (Mover para antes do catálogo genérico)
    const brands = ['nike', 'adidas', 'puma', 'reebok', 'vans'];
    const matchedBrand = brands.find(brand => lowerMessage.includes(brand));
    
    if (matchedBrand) {
      const filteredProducts = await inventoryRepository.findByBrand(matchedBrand, 5);
      response.text = `Excelente escolha! Aqui estão alguns modelos da ${matchedBrand.charAt(0).toUpperCase() + matchedBrand.slice(1)} que temos em estoque:`;
      response.products = filteredProducts;
      response.options = ['Falar com um humano', 'Voltar ao menu'];
      return response;
    }

    // 4. View Catalog / Recommendations
    if (lowerMessage.includes('catálogo') || lowerMessage.includes('comprar') || lowerMessage.includes('tênis') || lowerMessage.includes('produtos')) {
      response.text = 'Temos várias opções incríveis! Você tem preferência por alguma marca? Trabalhamos com Nike, Adidas, Puma, Reebok e Vans.';
      response.options = ['Nike', 'Adidas', 'Puma', 'Reebok', 'Vans', 'Ver todos'];
      return response;
    }

    // 5. Fallback / Unrecognized Intent
    response.text = 'Desculpe, não entendi muito bem. Você gostaria de ver nossos produtos ou falar com um de nossos consultores humanos?';
    response.options = ['Ver catálogo', 'Falar com um humano'];
    return response;
  }
}

module.exports = new ChatService();
