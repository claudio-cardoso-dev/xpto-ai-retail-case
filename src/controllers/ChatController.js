const { z } = require('zod');
const chatService = require('../services/ChatService');

// Schema de validação Zod para garantir integridade e sanitização da entrada
const chatRequestSchema = z.object({
  message: z.union([z.string(), z.record(z.any())]).transform(val => {
    if (typeof val === 'string') return val;
    return val.text || val.content || JSON.stringify(val);
  }),
  context: z.union([z.string(), z.record(z.any())]).optional().transform(val => {
    if (typeof val === 'string') {
      try { return val ? JSON.parse(val) : {}; }
      catch { return {}; }
    }
    return val || {};
  })
});

class ChatController {
  async handleMessage(req, res) {
    try {
      // 1. Validação e normalização estruturada
      const parseResult = chatRequestSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Formato de requisição inválido',
          details: parseResult.error.issues
        });
      }

      const { message, context } = parseResult.data;

      if (!message || message.trim() === '') {
        return res.status(400).json({ error: 'A mensagem não pode estar vazia' });
      }

      // 2. Processamento da regra de negócio (LLM / Agent)
      const response = await chatService.processMessage(message, context);
      return res.status(200).json(response);

    } catch (error) {
      console.error('[ChatController] Erro:', error);

      // 3. Resposta de erro padronizada e segura
      return res.status(error.status || 500).json({
        error: 'Ocorreu um erro interno ao processar a mensagem.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new ChatController();