const chatService = require('../services/ChatService');

class ChatController {
  async handleMessage(req, res) {
    try {
      const { message, context } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Mensagem é obrigatória' });
      }

      const response = await chatService.processMessage(message, context);
      return res.status(200).json(response);
    } catch (error) {
      console.error('Erro no ChatController:', error);
      return res.status(500).json({ error: 'Erro interno no servidor' });
    }
  }
}

module.exports = new ChatController();
