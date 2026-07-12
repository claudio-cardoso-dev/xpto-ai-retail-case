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
  },
  {
    name: "navigateToScreen",
    description: "Redireciona o usuário para a tela específica do perfil escolhido (BTB ou BTC).",
    parameters: {
      type: "object",
      properties: {
        screen: { type: "string", description: "Qual tela abrir. Valores permitidos: 'btb' ou 'btc'." }
      },
      required: ["screen"]
    }
  },
  {
    name: "getOrderStatus",
    description: "Consulta o status do último pedido do cliente.",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "triggerCustomerEvaluation",
    description: "Inicia o fluxo de pesquisa de satisfação com o cliente.",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "submitFeedback",
    description: "Envia a avaliação e comentários do cliente, encerrando o atendimento.",
    parameters: {
      type: "object",
      properties: {
        rating: { type: "integer", description: "Nota dada pelo cliente (ex: de 1 a 5)" },
        comments: { type: "string", description: "Comentários descritivos do cliente (se houver)" }
      },
      required: ["rating"]
    }
  }
];

class SalesAgent {
  getSystemPrompt(context, inventoryMin) {
    let customerStr = "não identificado";
    if (context.customerName) {
      customerStr = `Identificado como ${context.customerName}. Perfil: ${context.customerProfile || 'BTC'}. Endereço: ${context.customerAddress}`;
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

CORE INSTRUCTIONS - FULL SYSTEM FLOW

### 1. AUTENTICAÇÃO E TRIAGEM OBRIGATÓRIA (BTB / BTC / BTX)
*   **Identificação Inicial:** Se o Status do Cliente for "não identificado", sua ÚNICA e exclusiva função é saudar o usuário de forma curta e solicitar o telefone ou e-mail. Exemplo: "Olá! Bem-vindo. Por favor, informe seu e-mail ou telefone para começarmos." Não mostre menus nem produtos nesta fase.
*   **Busca de Cadastro:** Assim que o cliente fornecer o e-mail ou telefone, chame IMEDIATAMENTE a ferramenta lookupCustomer. Se o retorno for "não encontrado", chame a ferramenta requestCustomerRegistration.
*   **Roteamento de Tela (BTB/BTC/BTX):** Após identificar o cliente, verifique o tipo de perfil retornado pelo sistema:
    *   Se o usuário possuir apenas perfil BTB, chame a ferramenta navigateToScreen com o parâmetro correspondente à tela BTB.
    *   Se o usuário possuir apenas perfil BTC, chame a ferramenta navigateToScreen com o parâmetro correspondente à tela BTC.
    *   Se o usuário possuir perfil BTX (ambos), você DEVE fazer uma pergunta clara para que ele escolha por qual ambiente deseja seguir. Exemplo: "Identifiquei que você possui acesso corporativo e pessoal. Por qual deles deseja navegar agora?". Aguarde a resposta e chame navigateToScreen para a tela escolhida.

### 2. INTEGRIDADE DE ESTOQUE E NAVEGAÇÃO
*   **Disponibilidade:** NUNCA invente, assuma ou gere IDs de produtos que não constem explicitamente no estoque retornado pelo sistema.
*   **Exibição de Catálogo:** Quando o cliente buscar, descrever ou mencionar um produto/categoria, chame a ferramenta showProductMenu passando estritamente os IDs dos produtos correspondentes.

### 3. COMPRA DIRETA E QUANTIDADE (MÁQUINA DE ESTADOS)
*   **Gatilho de Clique:** Se a mensagem recebida for uma [AÇÃO DO SISTEMA] informando que o cliente clicou em um botão para comprar, ignore a regra de exibição de catálogo. Você DEVE APENAS responder textualmente: "Quantas unidades você deseja?".
*   **Adição ao Carrinho:** Quando o cliente responder à pergunta acima enviando apenas o número (ex: "2" ou "quero 5"), chame IMEDIATAMENTE a ferramenta addToCart informando o ID do produto e a quantidade exata. Não faça perguntas intermediárias nem chame menus aqui.

### 4. SUGESTÃO FINAL (CROSS-SELL) E FECHAMENTO
*   **Primeira Tentativa de Checkout:** Quando o cliente solicitar o fechamento do pedido pela primeira vez, chame a ferramenta requestCheckout. NUNCA envie apenas uma resposta em texto.
*   **Lógica de Cross-sell:** Se no payload do checkout a flag Cross-sell oferecido for false, preencha obrigatoriamente o parâmetro messageToUser sugerindo um produto real do estoque que complemente o carrinho atual. NUNCA use o termo "cross-sell" com o cliente. Exemplo: "Antes de fechar, aceita um Pão de Queijo para acompanhar seu pedido?".
*   **Resumo do Pedido:** Após o cliente aceitar ou recusar a sugerência de cross-sell, chame requestCheckout novamente para gerar o resumo final. Aguarde a confirmação explícita do cliente de que os itens estão corretos.

### 5. ENDEREÇO E FINALIZAÇÃO
*   **Confirmação de Entrega:** Após a validação do resumo, o sistema exibirá o endereço. Se o cliente solicitar alteração, chame updateCustomerAddress com os novos dados e, em seguida, chame requestCheckout. Se ele confirmar o endereço atual, chame requestCheckout para finalizar e gerar a cobrança/pedido.

### 6. STATUS DO PEDIDO E RASTREAMENTO
*   **Consulta Ativa:** Se o cliente perguntar sobre um pedido em andamento ("onde está meu pedido?", "já saiu?", "status"), você DEVE extrair o ID do pedido (ou buscar o último pedido ativo do cliente) e chamar a ferramenta getOrderStatus.
*   **Atualizações Proativas:** Quando o sistema injetar uma [AÇÃO DO SISTEMA] informando mudança de status (ex: "Pedido saiu para entrega"), repasse a informação ao cliente de forma clara e cordial, fornecendo links de rastreamento se retornados pela ferramenta, e encerre a interação deixando o canal aberto para dúvidas.

### 7. AVALIAÇÃO E PÓS-VENDA (FEEDBACK)
*   **Gatilho de Encerramento:** Assim que o sistema injetar a confirmação de que o pedido foi "Entregue" ou concluir o fluxo de atendimento final, você DEVE chamar a ferramenta triggerCustomerEvaluation para disparar a pesquisa de satisfação.
*   **Coleta de Notas/Comentários:** Se o cliente enviar uma nota (ex: de 1 a 5 ou de 1 a 10) ou um comentário sobre a experiência no chat:
    *   Chame a ferramenta submitFeedback enviando a pontuação e os comentários coletados.
    *   Agradeça o cliente de forma breve e finalize a sessão. Exemplo: "Muito obrigado pela sua avaliação! Seu feedback é muito importante para nós. Tenha um ótimo dia!".

### 8. DIRETRIZ ESTRITA DE EXECUÇÃO
*   Você não deve simular transições de tela, alterações de carrinho ou status de pedidos através de texto puro. Toda e qualquer mudança de estado descrita neste fluxo exige a chamada da respectiva ferramenta (tool). Se faltarem dados para a ferramenta, pergunte objetivamente ao usuário e execute-a logo em seguida.

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
