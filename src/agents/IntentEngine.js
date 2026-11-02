const { z } = require("zod");
const { ChatGroq } = require("@langchain/groq");
const { ChatPromptTemplate } = require("@langchain/core/prompts");

class IntentEngine {
  constructor() {
    const apiKey = process.env.GROQ_API_KEY || "gsk_dummy_key_for_ci";

    const fallbackLlm = new ChatGroq({
      apiKey,
      model: "llama-3.1-8b-instant",
      temperature: 0.1,
      maxRetries: 0,
    });

    const primaryLlm = new ChatGroq({
      apiKey,
      model: "qwen/qwen3-32b", // Usar um modelo melhorzinho para NLP, ou manter 3.1
      temperature: 0.1,
      maxRetries: 0,
    });

    const fallbackLlm2 = new ChatGroq({
      apiKey,
      model: "gemma2-9b-it",
      temperature: 0.1,
      maxRetries: 0,
    });

    this.schema = z.object({
      intent: z.enum([
        "ACOMPANHAR_PEDIDO",
        "COMPRAR",
        "UNKNOWN"
      ]).describe("A intenção principal da mensagem do usuário."),
      confidence: z.coerce.number().min(0).max(1).describe("O grau de certeza sobre a intenção identificada."),
      entities: z.object({
        productName: z.coerce.string().optional().describe("Nome do produto mencionado, se houver."),
        quantity: z.coerce.number().optional().describe("Quantidade mencionada, se houver."),
        phoneOrEmail: z.coerce.string().optional().describe("Telefone ou e-mail mencionado (para login/cadastro)."),
        addressInfo: z.coerce.string().optional().describe("Dados de endereço (CEP, rua, número) mencionados.")
      }).describe("Entidades extraídas da mensagem.")
    });

    const primaryParser = primaryLlm.withStructuredOutput(this.schema, { name: "extract_intent", method: "jsonMode" });
    const fallbackParser = fallbackLlm.withStructuredOutput(this.schema, { name: "extract_intent", method: "jsonMode" });
    const fallbackParser2 = fallbackLlm2.withStructuredOutput(this.schema, { name: "extract_intent", method: "jsonMode" });

    this.parser = primaryParser.withFallbacks({ fallbacks: [fallbackParser, fallbackParser2] });

    this.prompt = ChatPromptTemplate.fromMessages([
      ["system", `Você é um motor de NLU (Natural Language Understanding) altamente treinado para uma padaria chamada XPTO Retail.
Seu objetivo é analisar a mensagem do usuário e extrair a intenção e as entidades relevantes.
Não responda ao usuário. Apenas retorne a estrutura de dados solicitada em formato JSON estrito.
ATENÇÃO: MANTENHA O NOME DAS CHAVES DO JSON EM INGLÊS EXATAMENTE COMO DEFINIDO NO SCHEMA ("intent", "confidence", "entities", "phoneOrEmail", etc). NÃO TRADUZA AS CHAVES PARA O PORTUGUÊS.

Categorias de Intenção:
- ACOMPANHAR_PEDIDO: O usuário está perguntando sobre o status de entrega do seu pedido ou se possui pedido pendente.
- COMPRAR: O usuário está perguntando sobre, procurando, querendo pedir produtos, demonstrando interesse no cardápio, ou adicionando/removendo itens. Engloba toda a intenção de fluxo de vendas.
- UNKNOWN: Para mensagens incompreensíveis, irrelevantes ou se o usuário não quiser comprar nem acompanhar o pedido.

Seja preciso nas entidades.`],
      ["user", "Mensagem do sistema anterior (se houver): {systemContext}\n\nMensagem do Usuário: {message}"]
    ]);
  }

  /**
   * Processa a mensagem e retorna Intenção e Entidades.
   */
  async extract(message, systemContext = "Nenhuma ação anterior.") {
    try {
      const chain = this.prompt.pipe(this.parser);
      const result = await chain.invoke({ message, systemContext });
      return result;
    } catch (error) {
      console.error("Erro no IntentEngine (NLU):", error);
      return {
        intent: "UNKNOWN",
        confidence: 0,
        entities: {}
      };
    }
  }
}

module.exports = new IntentEngine();
