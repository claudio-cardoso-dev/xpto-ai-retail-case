const { tool } = require("@langchain/core/tools");
const { z } = require("zod");
const { ChatPromptTemplate, MessagesPlaceholder } = require("@langchain/core/prompts");

class SalesAgent {
  getPromptTemplate() {
    return ChatPromptTemplate.fromMessages([
      ["system", `Você é um agente de Vendas da Padaria XPTO, altamente inteligente, gentil e conciso.
Status do Cliente: {customerStr}
Carrinho Atual: {cartStr}
Contexto de Estoque (Produtos Recuperados RAG): {inventoryContext}

CORE INSTRUCTIONS & AUTO-CORREÇÃO:
1. EXIBIR CARDS DE PRODUTOS (showProductMenu): Se o cliente pedir uma categoria inteira ("Salgados", "Doces", "Bebidas", "Cardápio"), chame 'showProductMenu' informando APENAS o parâmetro 'category' (deixe productIds vazio). Se ele pedir um produto específico (ex: "coxinha", "suco"), extraia o ID do 'Contexto de Estoque' e passe no parâmetro 'productIds'. NUNCA responda descrevendo o produto sem acionar a tool!
2. EXCEÇÃO DO CLIQUE: Se a mensagem recebida começar com "[AÇÃO DO SISTEMA]", significa que o cliente já clicou no card. Nesse caso, NÃO chame 'showProductMenu', apenas pergunte a quantidade em texto livre.
3. ADICIONAR AO CARRINHO (addToCart): OBRIGATÓRIO chamar 'addToCart' se houver intenção clara de compra. Se o cliente falar o produto e a quantidade (ex: "quero 2 coxinhas"), chame direto esta tool. Se não especificar quantidade, assuma 1 e avise na 'messageToUser'.
4. IDENTIFICAÇÃO: Se não identificado, sua única função é pedir telefone ou e-mail e usar 'lookupCustomer'.
5. FERRAMENTAS: Use chamadas de função nativas (tool call). NUNCA invente respostas formatadas em tags.
6. CHECKOUT: Ao fechar pedido (usando 'requestCheckout'), garanta que o endereço já está confirmado.
7. CROSS-SELL: NÃO ofereça adicionais antes da hora. Cross-sell APENAS no fechamento do pedido.
8. AUTO-CORREÇÃO: Se ocorrer algum erro na ferramenta, peça desculpas educadamente e peça para o cliente reformular.`],
      new MessagesPlaceholder("chat_history"),
      ["user", "{input}"],
      new MessagesPlaceholder("agent_scratchpad")
    ]);
  }

  getTools(toolExecutionState = {}) {
    // Mantemos a factory para interceptação caso adicione o AgentExecutor futuramente
    const intercept = (name, args) => {
      toolExecutionState.called = name;
      toolExecutionState.args = args;
      return "Operação interceptada e processada no backend.";
    };

    return [
      tool(async (args) => intercept("lookupCustomer", args), {
        name: "lookupCustomer",
        description: "Busca o cliente no banco de dados. Acione prioritariamente se o cliente não estiver identificado.",
        schema: z.object({
          identifier: z.coerce.string().describe("Telefone ou e-mail do usuário")
        })
      }),

      // z.any() evita que o Langchain quebre se o LLM enviar parâmetros fantasmas num objeto vazio
      tool(async (args) => intercept("requestCustomerRegistration", args), {
        name: "requestCustomerRegistration",
        description: "Solicita o formulário de cadastro ao cliente.",
        schema: z.any()
      }),

      tool(async (args) => intercept("addToCart", args), {
        name: "addToCart",
        description: "Adiciona um produto ao carrinho. OBRIGATÓRIO chamar esta tool para adicionar itens.",
        schema: z.object({
          productId: z.coerce.string().optional().describe("ID do produto ou nome do produto. Preencha SEMPRE que souber!"),
          quantity: z.coerce.number().optional().default(1).describe("Quantidade a ser adicionada. Assuma 1 se não especificado."),
          messageToUser: z.coerce.string().optional()
        })
      }),

      tool(async (args) => intercept("removeFromCart", args), {
        name: "removeFromCart",
        description: "Remove um produto do carrinho.",
        schema: z.object({
          productId: z.coerce.string().optional(),
          quantity: z.coerce.number().optional(),
          messageToUser: z.coerce.string().optional()
        })
      }),

      tool(async (args) => intercept("showProductMenu", args), {
        name: "showProductMenu",
        description: "Exibe cards de produtos na interface para o cliente.",
        schema: z.object({
          category: z.coerce.string().optional().describe("Filtre por categoria ('Salgados', 'Doces' ou 'Bebidas') se o cliente pedir de forma genérica."),
          // Essa união aceita String, Número, ou Array de ambos, e converte tudo forçadamente para Array de Strings. BLINDADO!
          productIds: z.union([
            z.array(z.coerce.string()),
            z.coerce.string().transform(v => [v])
          ]).optional().describe("IDs dos produtos a exibir. Extraia do Contexto de Estoque."),
          messageToUser: z.coerce.string().optional()
        })
      }),

      tool(async (args) => intercept("requestCheckout", args), {
        name: "requestCheckout",
        description: "Inicia, prossegue ou finaliza o pedido do cliente (fluxo de checkout e cross-sell).",
        schema: z.object({
          category: z.coerce.string().optional().describe("Categoria de cross-sell, se aplicável")
        })
      }),

      tool(async (args) => intercept("getOrderStatus", args), {
        name: "getOrderStatus",
        description: "Consulta o status do último pedido do cliente.",
        schema: z.any()
      }),

      tool(async (args) => intercept("requestAgent", args), {
        name: "requestAgent",
        description: "Transfere o atendimento para um humano.",
        schema: z.object({
          reason: z.coerce.string().describe("Motivo da transferência")
        })
      }),

      tool(async (args) => intercept("updateAddress", args), {
        name: "updateAddress",
        description: "Atualiza o endereço de entrega do cliente.",
        schema: z.object({
          address: z.coerce.string().describe("Endereço completo")
        })
      }),

      tool(async (args) => intercept("navigateToScreen", args), {
        name: "navigateToScreen",
        description: "Redireciona o usuário para a tela específica (btb ou btc).",
        schema: z.object({
          screen: z.coerce.string().describe("A tela para redirecionamento")
        })
      }),

      tool(async (args) => intercept("validateCEP", args), {
        name: "validateCEP",
        description: "Valida um CEP digitado pelo usuário.",
        schema: z.object({
          cep: z.coerce.string()
        })
      }),

      tool(async (args) => intercept("completeRegistration", args), {
        name: "completeRegistration",
        description: "Finaliza o cadastro do cliente via chat com todos os dados.",
        schema: z.object({
          name: z.coerce.string(),
          email: z.coerce.string(),
          phone: z.coerce.string(),
          cep: z.coerce.string(),
          street: z.coerce.string(),
          number: z.coerce.string(),
          neighborhood: z.coerce.string(),
          city: z.coerce.string()
        })
      }),

      tool(async (args) => intercept("triggerCustomerEvaluation", args), {
        name: "triggerCustomerEvaluation",
        description: "Inicia a pesquisa de satisfação.",
        schema: z.any()
      }),

      tool(async (args) => intercept("submitFeedback", args), {
        name: "submitFeedback",
        description: "Envia a avaliação final do cliente.",
        schema: z.object({
          rating: z.coerce.number()
        })
      })
    ];
  }
}

module.exports = new SalesAgent();