const customerRepository = require('../repositories/CustomerRepository');

const toolsDefinition = [
  {
    name: "lookupCustomer",
    description: "Busca o cliente no banco de dados. Use isso LOGO NO INÍCIO da conversa perguntando o telefone ou e-mail.",
    parameters: {
      type: "object",
      properties: {
        identifier: { type: "string" }
      },
      required: ["identifier"]
    }
  },
  {
    name: "requestCustomerRegistration",
    description: "Solicita o formulário de cadastro.",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "addToCart",
    description: "Adiciona um produto ao carrinho. OBRIGATÓRIO chamar esta tool para adicionar itens.",
    parameters: {
      type: "object",
      properties: {
        productId: { type: "string" },
        quantity: { type: "integer" },
        messageToUser: { type: "string", description: "O texto que você vai dizer confirmando a adição. PERGUNTE se ele quer algo a mais, mas NÃO ofereça produtos específicos (sem cross-sell)." }
      },
      required: ["productId", "quantity", "messageToUser"]
    }
  },
  {
    name: "removeFromCart",
    description: "Remove um produto do carrinho.",
    parameters: {
      type: "object",
      properties: {
        productId: { type: "string" },
        quantity: { type: "integer" },
        messageToUser: { type: "string", description: "Texto de confirmação para o cliente." }
      },
      required: ["productId", "quantity", "messageToUser"]
    }
  },
  {
    name: "showProductMenu",
    description: "Exibe cards de produtos na tela.",
    parameters: {
      type: "object",
      properties: {
        productIds: {
          type: "array",
          items: { type: "string" },
          description: "IDs dos produtos encontrados no estoque que correspondam à busca (mesmo que parcial, ex: 'coxinha' mapeia para a coxinha disponível). Não inclua itens de outras categorias."
        },
        messageToUser: { type: "string", description: "Texto descrevendo os produtos exibidos." }
      },
      required: ["productIds", "messageToUser"]
    }
  },
  {
    name: "requestCheckout",
    description: "Inicia o processo de fechamento de pedido. Use quando o cliente disser que não quer mais nada ou clicar em Fechar Pedido.",
    parameters: {
      type: "object",
      properties: {
        messageToUser: {
          type: "string",
          description: "Se 'Cross-sell oferecido' for false, preencha com o nome de UM produto específico do estoque para acompanhar o pedido (NUNCA use a palavra cross-sell com o cliente). Se já foi oferecido, pode deixar vazio ou agradecer."
        },
        suggestedProductId: {
          type: "string",
          description: "O ID do produto que você está sugerindo no cross-sell (ex: 'S1', 'D3'). OBRIGATÓRIO preencher se for a primeira vez fechando."
        }
      },
      required: []
    }
  },
  {
    name: "updateCustomerAddress",
    description: "Atualiza o endereço de entrega do cliente após ele solicitar a alteração na fase final do pedido.",
    parameters: {
      type: "object",
      properties: {
        newAddress: { type: "string" }
      },
      required: ["newAddress"]
    }
  }
];

class SalesAgent {
  getSystemPrompt(context, inventoryMin) {
    let customerStr = "não identificado";
    if (context.customerName) {
      customerStr = `Identificado como ${context.customerName}. Endereço: ${context.customerAddress}`;
    }

    let cartStr = "Vazio";
    if (Object.keys(context.cart || {}).length > 0) {
      const cartItems = [];
      for (const [id, qty] of Object.entries(context.cart)) {
         const p = inventoryMin.find(i => i.id === id);
         if (p) {
            cartItems.push(`${qty}x ${p.name}`);
         }
      }
      if (cartItems.length > 0) {
        cartStr = cartItems.join(", ");
      }
    }

    const hasCrossSeled = context.hasCrossSeled ? 'true' : 'false';

    return `Você é um agente de Vendas da Padaria XPTO, altamente inteligente, gentil e conciso.
Status do Cliente: ${customerStr}
Carrinho Atual: ${cartStr}
Estoque Disponível: ${JSON.stringify(inventoryMin)}
Cross-sell oferecido: ${hasCrossSeled}
Produto aguardando quantidade: ${context.pendingProduct || 'Nenhum'}

SUAS REGRAS DE OURO:
1. NUNCA gere IDs de produtos que não existem no estoque.
2. TRIAGEM OBRIGATÓRIA: Se o Status do Cliente for "não identificado", sua ÚNICA função é cumprimentar de forma BEM CURTA e pedir o telefone ou e-mail. Exemplo: "Olá! Bem-vindo à Padaria XPTO. Por favor, me informe seu telefone ou e-mail para começarmos." NÃO oferte produtos ainda.
3. BUSCA DE CLIENTE: Quando o cliente informar o e-mail ou telefone, você DEVE chamar a ferramenta 'lookupCustomer'.
4. CADASTRO: Se você chamou 'lookupCustomer' e o retorno foi "não encontrado", ou se você já sabe que ele não tem cadastro, chame a ferramenta 'requestCustomerRegistration'.
5. NAVEGAÇÃO: Se o cliente buscar ou mencionar um produto, chame a ferramenta 'showProductMenu' passando os IDs dos produtos correspondentes. ATENÇÃO: Se a mensagem for uma "[AÇÃO DO SISTEMA]" informando que o cliente clicou para comprar, NÃO chame 'showProductMenu'. Siga a instrução do sistema (pergunte a quantidade).
6. VENDA DIRETA E QUANTIDADE: Se o sistema injetar a mensagem "[AÇÃO DO SISTEMA]: O cliente clicou no botão...", você DEVE APENAS responder perguntando "Quantas unidades você deseja?" (sem chamar tools). Depois, quando o cliente digitar apenas um número (ex: "2" ou "10"), você DEVE IMEDIATAMENTE chamar a ferramenta 'addToCart' informando o ID do produto e a quantidade. NÃO chame 'showProductMenu' nesse fluxo.
7. SUGESTÃO FINAL: Quando o cliente quiser fechar o pedido pela PRIMEIRA vez, você DEVE chamar a ferramenta 'requestCheckout'. NUNCA responda apenas com texto. Se 'Cross-sell oferecido' for false, preencha o parâmetro 'messageToUser' sugerindo UM produto real e específico do Estoque Disponível que combine perfeitamente com o que já está no carrinho (e que ainda não esteja no carrinho). NUNCA use a palavra "cross-sell" com o cliente. Exemplo: "Antes de fechar, aceita um Pão de Queijo para acompanhar?".
8. RESUMO DO PEDIDO: Após o cliente aceitar ou recusar a sugestão final, chame 'requestCheckout' novamente para exibir o resumo do pedido e aguarde a confirmação dele de que está tudo certo.
9. ENDEREÇO E FECHAMENTO: Após o cliente confirmar o resumo, o sistema exibirá o endereço. Se o cliente pedir para mudar, chame 'updateCustomerAddress' com o novo endereço e chame 'requestCheckout' para finalizar. Se ele apenas confirmar o endereço atual, chame 'requestCheckout' para finalizar.

Formato de Resposta Esperado da sua parte:
Como você é um LLM moderno, responda de forma puramente textual (texto limpo). 
Para executar ações no sistema, FAÇA O CALL DAS FUNÇÕES/TOOLS disponíveis. 
Se você não chamar nenhuma tool, sua resposta em texto será enviada normalmente.`;
  }

  getGeminiTools() {
    return [{
      functionDeclarations: toolsDefinition.map(t => {
        let params = { type: "OBJECT", properties: {}, required: [] };
        if (t.parameters.properties && Object.keys(t.parameters.properties).length > 0) {
          params.properties = {};
          for (const key in t.parameters.properties) {
            params.properties[key] = {
              type: t.parameters.properties[key].type.toUpperCase(),
              description: t.parameters.properties[key].description
            };
            if (t.parameters.properties[key].type === 'array') {
               params.properties[key].items = { type: t.parameters.properties[key].items.type.toUpperCase() };
            }
          }
          params.required = t.parameters.required;
        } else {
          // Empty parameters schema
          params = { type: "OBJECT" };
        }
        return {
          name: t.name,
          description: t.description,
          parameters: params
        };
      })
    }];
  }

  getGroqTools() {
    return toolsDefinition.map(t => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters.properties ? t.parameters : { type: "object", properties: {} }
      }
    }));
  }
}

module.exports = new SalesAgent();
