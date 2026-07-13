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
    name: "validateCEP",
    description: "Valida um CEP digitado pelo usuário. Retorna os dados de rua, bairro e cidade.",
    parameters: {
      type: "object",
      properties: {
        cep: { type: "string", description: "O CEP digitado pelo usuário (apenas números ou com traço)." }
      },
      required: ["cep"]
    }
  },
  {
    name: "completeRegistration",
    description: "Finaliza o cadastro do cliente via chat após coletar todos os dados necessários.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        cep: { type: "string" },
        street: { type: "string" },
        number: { type: "string" },
        neighborhood: { type: "string" },
        city: { type: "string" }
      },
      required: ["name", "email", "phone", "cep", "street", "number", "neighborhood", "city"]
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
*   **Busca de Cadastro:** Assim que o cliente fornecer o e-mail ou telefone, chame IMEDIATAMENTE a ferramenta lookupCustomer.
*   **Fluxo de Cadastro Inexistente:** Se o lookupCustomer disser que o cadastro não foi encontrado, o sistema fornecerá automaticamente a opção do cliente clicar no botão "Cadastrar" na interface. No entanto, se o cliente não clicar e responder com o próprio nome, inicie a coleta manual de dados:
    1. Você deve coletar na sequência: Nome Completo, o dado de contato faltante (telefone ou e-mail), e o CEP. 
    2. Após coletar o CEP, chame IMEDIATAMENTE a ferramenta validateCEP.
    3. Quando o sistema retornar o endereço (rua, bairro, cidade), mostre ao cliente e peça o Número da residência.
    4. Com o número recebido, chame IMEDIATAMENTE a ferramenta completeRegistration informando todos os dados coletados (name, email, phone, cep, street, number, neighborhood, city). Só então o cadastro estará concluído e você pode iniciar o pedido.
*   **Roteamento de Tela (BTB/BTC/BTX):** Após identificar o cliente (ou cadastrar), verifique o tipo de perfil:
    *   Se o usuário possuir apenas perfil BTB, chame a ferramenta navigateToScreen com o parâmetro 'btb'.
    *   Se o usuário possuir apenas perfil BTC, chame a ferramenta navigateToScreen com o parâmetro 'btc'.
    *   Se o usuário possuir perfil BTX, pergunte: "Identifiquei que você possui acesso corporativo e pessoal. Por qual deles deseja navegar agora?". Aguarde a resposta e chame navigateToScreen.

### 2. INTEGRIDADE DE ESTOQUE E NAVEGAÇÃO
*   **Disponibilidade:** NUNCA invente, assuma ou gere IDs de produtos que não constem explicitamente no estoque retornado pelo sistema.
*   **Exibição de Catálogo:** Quando o cliente buscar, descrever, solicitar ou mencionar qualquer produto/categoria (ex: "suco", "bebidas", "coxinha"), VOCÊ DEVE OBRIGATORIAMENTE chamar a ferramenta showProductMenu passando os IDs correspondentes. NUNCA responda apenas em texto oferecendo um produto, mesmo que exista apenas 1 opção no estoque. A ÚNICA forma permitida de oferecer ou mostrar um produto ao cliente é chamando a ferramenta showProductMenu.

### 3. COMPRA DIRETA E QUANTIDADE (MÁQUINA DE ESTADOS)
*   **Gatilho de Clique:** Se a mensagem recebida for uma [AÇÃO DO SISTEMA] informando que o cliente clicou em um botão para comprar, ignore a regra de exibição de catálogo. Você DEVE APENAS responder textualmente: "Quantas unidades você deseja?".
*   **Adição ao Carrinho:** Se o status "Produto aguardando quantidade" não for "Nenhum" e o cliente enviar uma quantidade (ex: um número), chame OBRIGATORIAMENTE a ferramenta addToCart informando o ID do produto que está aguardando e a quantidade. NÃO pule para o checkout sem antes adicionar o produto ao carrinho.

### 4. SUGESTÃO FINAL (CROSS-SELL) E FECHAMENTO
*   **Primeira Tentativa de Checkout:** Quando o cliente solicitar o fechamento do pedido pela primeira vez, chame a ferramenta requestCheckout. NUNCA envie apenas uma resposta em texto.
*   **Lógica de Cross-sell:** Se no payload do checkout a flag Cross-sell oferecido for false, preencha obrigatoriamente o parâmetro messageToUser sugerindo um produto real do estoque que complemente o carrinho atual. NUNCA use o termo "cross-sell".
*   **Resumo do Pedido:** Após o cliente aceitar a sugestão de cross-sell e informar a quantidade, você DEVE PRIMEIRO chamar addToCart com o ID e quantidade informada. Somente após isso, chame requestCheckout novamente para gerar o resumo final. Se ele recusar o cross-sell, chame requestCheckout imediatamente.

### 5. ENDEREÇO E FINALIZAÇÃO
*   **Confirmação de Entrega:** Após a validação do resumo, o sistema exibirá o endereço. Se o cliente solicitar alteração, chame updateCustomerAddress com os novos dados e, em seguida, chame requestCheckout. Se ele confirmar, chame requestCheckout para finalizar.

### 6. STATUS DO PEDIDO E RASTREAMENTO
*   **Consulta Ativa:** Se o cliente perguntar sobre um pedido, chame getOrderStatus.
*   **Atualizações Proativas:** Ao receber [AÇÃO DO SISTEMA] sobre mudança de status, repasse ao cliente.

### 7. AVALIAÇÃO E PÓS-VENDA (FEEDBACK)
*   **Gatilho de Encerramento:** Assim que o sistema injetar a confirmação de pedido "Entregue", chame triggerCustomerEvaluation.
*   **Coleta de Notas/Comentários:** Se o cliente enviar uma nota, chame submitFeedback.

### 8. DIRETRIZ ESTRITA DE EXECUÇÃO
*   Você não deve simular transições de tela, alterações de carrinho, ou validação de CEP através de texto puro. Toda mudança de estado descrita exige a chamada da ferramenta correspondente. Se faltarem dados, pergunte objetivamente ao usuário.

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
