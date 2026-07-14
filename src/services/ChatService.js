const inventoryRepository = require('../repositories/InventoryRepository');
const customerRepository = require('../repositories/CustomerRepository');
const DashboardDataRepository = require('../repositories/DashboardDataRepository');
const FailedIntentRepository = require('../repositories/FailedIntentRepository');
const crypto = require('crypto');

const SalesAgent = require('../agents/SalesAgent');
const IntentEngine = require('../agents/IntentEngine');
const InventoryRAG = require('../agents/InventoryRAG');

const { ChatGroq } = require("@langchain/groq");
const { HumanMessage, AIMessage } = require("@langchain/core/messages");

class ChatService {
  constructor() {
    // Inicialização otimizada dos modelos
    this.primaryLlm = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      maxRetries: 0,
    });

    this.fallbackLlm = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: "llama-3.1-8b-instant",
      temperature: 0.1,
      maxRetries: 0,
    });

    this.emergencyFallbackLlm = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: "gemma2-9b-it",
      temperature: 0.1,
      maxRetries: 0,
    });
  }

  // Helper assíncrono Fire-and-Forget para não bloquear o response do usuário
  _logMetricBackground(promise) {
    Promise.resolve(promise).catch(e => console.error('[Metrics Background Error]:', e));
  }

  async processMessage(message, context = {}) {
    // 1. Inicialização Segura de Estado
    context.protocolId = context.protocolId || `XPTO-${new Date().getFullYear()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    context.startTime = context.startTime || Date.now();
    context.flowState = context.flowState || 'VALIDATION';
    context.failureCount = context.failureCount || 0;
    context.cart = context.cart || {};
    context.hasCrossSeled = context.hasCrossSeled || false;
    context.history = context.history || [];

    // Prevenção de estouro de janela de contexto (Window Buffer)
    if (context.history.length > 6) {
      context.history = context.history.slice(-6);
    }

    let finalResponse = {
      text: '',
      options: [],
      products: [],
      redirectToSite: false,
      action: null,
      context: context
    };

    let systemInjectedMessage = message;
    const msgLower = typeof message === 'string' ? message.toLowerCase() : '';

    // --- INTERCEPTAÇÕES GLOBAIS (Early Returns) ---
    if (msgLower === 'ir para o site') {
      const timeSpent = Math.floor((Date.now() - context.startTime) / 1000) || 30;
      this._logMetricBackground(DashboardDataRepository.create({ protocol: context.protocolId, chat_time_seconds: timeSpent, evaluation: 3, handoff: true, conversion: false }));

      finalResponse.text = "Redirecionando para o site oficial...";
      finalResponse.redirectToSite = true;
      return finalResponse;
    }

    if (msgLower === 'cadastrar') {
      context.flowState = 'REGISTRATION';
      finalResponse.text = "Perfeito! Por favor, preencha o formulário abaixo para agilizarmos:";
      finalResponse.action = 'SHOW_REGISTER_FORM';
      return finalResponse;
    }

    // Handlers de Ações de Interface
    if (message.startsWith('[DADOS_DO_FORMULARIO]:')) {
      try {
        const formData = JSON.parse(message.replace('[DADOS_DO_FORMULARIO]:', '').trim());
        context.customerName = formData.name;
        context.customerAddress = `${formData.street}, ${formData.number} ${formData.complement || ''} - ${formData.neighborhood}, ${formData.city} - ${formData.cep}`;

        await customerRepository.createCustomer({
          name: formData.name,
          email: formData.email,
          telefone: formData.phone,
          address: context.customerAddress
        });

        context.customerIdentifier = formData.phone || formData.email;
        context.flowState = 'INTENT_RECOGNITION';
        systemInjectedMessage = `[AÇÃO DO SISTEMA]: O cliente preencheu o formulário com sucesso. O nome dele é ${formData.name}. Agradeça e pergunte o que ele deseja pedir hoje.`;
      } catch (e) {
        console.error("[Form Parse Error]:", e);
      }
    } else if (msgLower.includes('quero pedir:')) {
      const productName = message.replace(/Quero pedir:/i, '').trim();
      context.pendingProduct = productName;
      systemInjectedMessage = `[AÇÃO DO SISTEMA]: O cliente clicou no botão para comprar o produto "${productName}". Apenas pergunte: "Quantas unidades você deseja?".`;
    }

    // --- MÁQUINA DE ESTADOS (State Machine) ---
    switch (context.flowState) {

      case 'VALIDATION':
        if (context.history.length === 0 && !message) {
          finalResponse.text = "Olá! Bem-vindo à XPTO Retail. Por favor, me informe seu e-mail ou telefone para iniciarmos.";
          return finalResponse;
        }

        const identifierMatch = message.match(/(?:[^\s@]+@[^\s@]+\.[^\s@]+)|(?:(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}-?\d{4})/);

        if (identifierMatch) {
          let identifier = identifierMatch[0].replace(/[^a-zA-Z0-9@.-]/g, '');
          const customer = await customerRepository.findByTelefoneOrEmail(identifier);

          if (customer) {
            Object.assign(context, {
              customerId: customer.id,
              customerName: customer.name,
              customerAddress: customer.address,
              customerProfile: customer.profile,
              customerIdentifier: customer.telefone || customer.email || identifier,
              flowState: 'INTENT_RECOGNITION',
              failureCount: 0
            });
            finalResponse.text = `Bem-vindo de volta, ${customer.name}! Identifiquei seu cadastro. O que você gostaria de pedir hoje ou deseja acompanhar seu pedido?`;
            finalResponse.options = ["Cardápio", "Salgados", "Doces", "Bebidas", "Acompanhar Pedido"];
          } else {
            context.flowState = 'REGISTRATION';
            context.failureCount = 0;
            finalResponse.options = ["Cadastrar"];
            finalResponse.text = "Ainda não encontrei seu cadastro no nosso sistema. Por favor, clique em Cadastrar para preencher o formulário e fazer seu pedido:";
          }
        } else {
          context.failureCount++;
          if (context.failureCount > 2) {
            finalResponse.text = "Tivemos problemas para identificar seus dados. Você será redirecionado para o nosso site.";
            finalResponse.options = ['Ir para o site'];
            finalResponse.redirectToSite = true;
          } else {
            finalResponse.text = "Formato inválido. Por favor, informe um e-mail ou telefone válido (Ex: (11) 99999-9999 ou seu@email.com).";
          }
        }
        break;

      case 'REGISTRATION':
        finalResponse.action = 'SHOW_REGISTER_FORM';
        finalResponse.text = "Por favor, preencha o formulário abaixo para concluir seu cadastro:";
        break;

      case 'INTENT_RECOGNITION':
      case 'ORDER_TRACKING':
      case 'SHOPPING_CROSS_SELL':
      case 'CHECKOUT_RETENTION':
        const isSimpleReply = /^(sim|não|nao|fechar pedido|ok|certo|correto|alterar|tudo certo|desejo alterar)$/i.test(message.trim());
        let nluResult = { intent: 'UNKNOWN', confidence: 1 };
        
        // Economiza tokens e evita Rate Limits do LLM ignorando o NLU para respostas óbvias
        if (!isSimpleReply && !context.isConfirmingOrder && !context.isConfirmingAddress) {
          nluResult = await IntentEngine.extract(systemInjectedMessage);
        }

        if ((nluResult.intent === 'UNKNOWN' || nluResult.confidence < 0.6) && !isSimpleReply && !context.isConfirmingOrder && !context.isConfirmingAddress) {
          context.failureCount++;
          this._logMetricBackground(FailedIntentRepository.save(context.protocolId, message, context.flowState));

          if (context.failureCount > 2) {
            finalResponse.text = "Não estou conseguindo compreender. Vou te direcionar para o site para você ser melhor atendido.";
            finalResponse.options = ['Ir para o site'];
            finalResponse.redirectToSite = true;
            return finalResponse;
          }
        } else {
          context.failureCount = 0;
        }

        // Transições de fluxo baseadas na intenção
        if (context.flowState === 'INTENT_RECOGNITION' || (context.flowState === 'ORDER_TRACKING' && nluResult.intent === 'COMPRAR')) {
          context.flowState = nluResult.intent === 'ACOMPANHAR_PEDIDO' ? 'ORDER_TRACKING' : 'SHOPPING_CROSS_SELL';
        }

        // Regra de Negócio: Retenção de Carrinho
        if (context.flowState === 'CHECKOUT_RETENTION') {
          const negativeKeywords = ['caro', 'desistir', 'não quero', 'cancelar'];
          if (negativeKeywords.some(kw => msgLower.includes(kw))) {
            if (!context.couponOffered) {
              context.couponOffered = true;
              finalResponse.text = "Entendo perfeitamente! Para não perder seu pedido, que tal um cupom de 10% de desconto no total? Deseja aplicar o desconto e finalizar?";
              finalResponse.options = ["Aceito o desconto", "Não, obrigado"];
              return finalResponse;
            } else {
              finalResponse.text = "Sem problemas. Se mudar de ideia, estamos no site oficial.";
              finalResponse.options = ['Ir para o site'];
              finalResponse.redirectToSite = true;
              return finalResponse;
            }
          }
          if (context.couponOffered && msgLower.includes('aceito')) {
            context.couponApplied = true;
          }
        }

        // --- CHECKOUT CONFIRMATION BYPASS (AVOID RATE LIMITS) ---
        if (context.isConfirmingOrder) {
          if (msgLower === 'sim' || msgLower.includes('tudo certo') || msgLower.includes('correto')) {
            finalResponse.text = `Ótimo! O endereço de entrega é:\n📍 ${context.customerAddress}\n\nEstá correto ou deseja alterar?`;
            context.isConfirmingAddress = true;
            context.isConfirmingOrder = false;
            finalResponse.options = ["Tudo Certo", "Desejo Alterar"];
            
            context.history.push({ role: 'user', text: message });
            context.history.push({ role: 'assistant', text: finalResponse.text });
            finalResponse.context = context;
            return finalResponse;
          }
          if (msgLower === 'não' || msgLower.includes('cardápio') || msgLower.includes('alterar')) {
            context.isConfirmingOrder = false;
            context.hasCrossSeled = false;
            context.flowState = 'SHOPPING_CROSS_SELL';
            finalResponse.text = "Ok, vamos voltar ao cardápio! O que mais deseja?";
            finalResponse.options = ["Cardápio", "Salgados", "Doces", "Bebidas"];
            
            context.history.push({ role: 'user', text: message });
            context.history.push({ role: 'assistant', text: finalResponse.text });
            finalResponse.context = context;
            return finalResponse;
          }
        }

        if (context.isConfirmingAddress) {
          if (msgLower === 'sim' || msgLower.includes('tudo certo') || msgLower.includes('correto')) {
            finalResponse.text = `Perfeito! Seu pedido foi confirmado e será entregue em breve no endereço:\n📍 ${context.customerAddress}\n\nEstamos enviando para a cozinha!\n\nGostaria de avaliar seu atendimento hoje? De 1 a 5, que nota você daria para a nossa conversa?`;
            finalResponse.action = 'CREATE_ORDER';
            finalResponse.options = ["1", "2", "3", "4", "5"];
            Object.assign(context, { cart: {}, isConfirmingOrder: false, isConfirmingAddress: false, hasCrossSeled: false, flowState: 'METRICS_CSAT', isEvaluating: true });
            
            context.history.push({ role: 'user', text: message });
            context.history.push({ role: 'assistant', text: finalResponse.text });
            finalResponse.context = context;
            return finalResponse;
          }
          if (msgLower.includes('alterar') || msgLower === 'não') {
            finalResponse.text = "Por favor, digite o novo endereço completo (Rua, Número, Bairro, Cidade):";
            context.isConfirmingAddress = false;
            context.pendingAddressUpdate = true;
            finalResponse.options = [];
            
            context.history.push({ role: 'user', text: message });
            context.history.push({ role: 'assistant', text: finalResponse.text });
            finalResponse.context = context;
            return finalResponse;
          }
        }
        
        if (context.pendingAddressUpdate) {
          context.customerAddress = message;
          context.pendingAddressUpdate = false;
          finalResponse.text = `Endereço atualizado com sucesso para:\n📍 ${context.customerAddress}\n\nTudo certo para prosseguirmos?`;
          context.isConfirmingAddress = true;
          finalResponse.options = ["Tudo Certo", "Desejo Alterar"];
          
          context.history.push({ role: 'user', text: message });
          context.history.push({ role: 'assistant', text: finalResponse.text });
          finalResponse.context = context;
          return finalResponse;
        }

        // Preparação do Contexto RAG / Estoque
        let inventoryContext = "Nenhum contexto de busca acionado.";
        if (nluResult.intent === 'COMPRAR' || context.pendingProduct) {
          const searchTerm = nluResult.entities?.productName || context.pendingProduct || "";
          const retrievedProducts = searchTerm ? await InventoryRAG.search(searchTerm, 3) : [];
          inventoryContext = JSON.stringify(retrievedProducts.length > 0 ? retrievedProducts : await InventoryRAG.getFullInventoryMin());
        }

        let customerStr = context.customerName ? `Identificado: ${context.customerName} | Perfil: ${context.customerProfile || 'BTC'} | Endereço: ${context.customerAddress}` : "não identificado";
        let cartStr = Object.keys(context.cart).length > 0 ? JSON.stringify(context.cart) : "Vazio";

        let toolExecutionState = { called: null, args: null };
        const prompt = SalesAgent.getPromptTemplate();
        const tools = SalesAgent.getTools(toolExecutionState);

        // Conversão de Histórico Segura
        const chatHistory = context.history.map(h => {
          let text = String(typeof h.text === 'object' ? (h.text.text || JSON.stringify(h.text)) : (h.text || ""));
          return h.role === 'user' ? new HumanMessage(text) : new AIMessage(text);
        });

        let aiResponseText = "";

        try {
          // Arquitetura Langchain: Bind com Fallback Nativo (Resolve lentidão de Try/Catchs)
          const modelChain = this.primaryLlm.bindTools(tools).withFallbacks({
            fallbacks: [this.fallbackLlm.bindTools(tools), this.emergencyFallbackLlm.bindTools(tools)]
          });

          const formattedPrompt = await prompt.formatMessages({
            input: systemInjectedMessage,
            chat_history: chatHistory,
            customerStr,
            cartStr,
            inventoryContext,
            agent_scratchpad: []
          });

          const aiMessage = await modelChain.invoke(formattedPrompt);

          if (aiMessage.tool_calls?.length > 0) {
            const tc = aiMessage.tool_calls[0];
            toolExecutionState.called = tc.name;
            toolExecutionState.args = tc.args;
            aiResponseText = aiMessage.content || "";
          } else {
            aiResponseText = aiMessage.content || "";

            // Fallback de extração (Hallucination Parser otimizado)
            if (!toolExecutionState.called && aiResponseText.includes('<function=')) {
              const funcMatch = aiResponseText.match(/<function=([^>]+)>([\s\S]*?)<\/function>/);
              if (funcMatch) {
                try {
                  const funcArgs = funcMatch[2].trim() ? JSON.parse(funcMatch[2].trim()) : {};
                  toolExecutionState.called = funcMatch[1];
                  // Normalização de chaves da Alucinação
                  toolExecutionState.args = { ...funcArgs, productId: funcArgs.productId || funcArgs.product_id, productIds: Array.isArray(funcArgs.productIds) ? funcArgs.productIds : (funcArgs.productIds ? [funcArgs.productIds] : []) };
                  aiResponseText = aiResponseText.replace(funcMatch[0], '').trim();
                } catch (e) {
                  console.error("[Function Parser Error]:", e);
                }
              }
            }
          }

          // Execução de Regra de Negócio Pós-Tool
          if (toolExecutionState.called) {
            const toolCalled = toolExecutionState.called;
            const toolArgs = toolExecutionState.args || {};

            // Cache do inventário para evitar múltiplos awaits na mesma requisição
            const fullInventory = await inventoryRepository.getAll();

            if (toolCalled === 'showProductMenu') {
              // Convertendo as tipagens para string forçadamente para o .includes não falhar
              const idsToFilter = toolArgs?.productIds?.map(id => String(id)) || [];
              const categoryFilter = toolArgs?.category ? String(toolArgs.category).toLowerCase().trim() : null;

              if (categoryFilter) {
                finalResponse.products = fullInventory.filter(p => categoryFilter.includes(String(p.category || '').toLowerCase().trim()));
              } else if (idsToFilter.length > 0) {
                finalResponse.products = fullInventory.filter(p => idsToFilter.includes(String(p.id)));
              } else {
                finalResponse.products = fullInventory;
              }

              finalResponse.text = toolArgs.messageToUser || "Aqui estão as opções:";
            }

            else if (toolCalled === 'addToCart') {
              context.isConfirmingOrder = false;
              let rawRef = toolArgs.productId || toolArgs.id || toolArgs.name || toolArgs.product;
              let productId = null;

              if (rawRef) {
                const refLower = String(rawRef).toLowerCase();
                const match = fullInventory.find(p => String(p.id).toLowerCase() === refLower || p.name.toLowerCase().includes(refLower));
                if (match) productId = match.id;
              }

              if (!productId && context.pendingProduct) {
                const found = fullInventory.find(p => p.name.toLowerCase() === context.pendingProduct.toLowerCase());
                if (found) productId = found.id;
              }

              if (productId && toolArgs.quantity) {
                context.cart[productId] = (context.cart[productId] || 0) + Number(toolArgs.quantity);
                context.pendingProduct = null;

                if (context.hasCrossSeled) {
                  context.flowState = 'CHECKOUT_RETENTION';
                  let { total, cartItems } = this._calculateCart(context.cart, fullInventory, context.couponApplied);

                  finalResponse.text = `Adicionado! Resumo:\n\n${cartItems}\n\n💰 Total: R$ ${total.toFixed(2)}\n\nTudo certo para prosseguirmos?`;
                  context.isConfirmingOrder = true;
                } else {
                  let msg = toolArgs.messageToUser || `Adicionado ao carrinho com sucesso!`;
                  finalResponse.text = msg.includes('?') ? msg : `${msg} Deseja mais alguma coisa?`;
                }
              } else {
                finalResponse.text = "Desculpe, não consegui identificar qual produto ou a quantidade desejada. Poderia repetir?";
              }
            }

            else if (toolCalled === 'requestCheckout') {
              context.flowState = 'CHECKOUT_RETENTION';
              let { total, cartItems } = this._calculateCart(context.cart, fullInventory, context.couponApplied);

              if (context.isConfirmingAddress) {
                // Tratado no bypass acima, nunca vai chegar aqui se entrar nas regras
              } else if (context.isConfirmingOrder) {
                // Tratado no bypass acima
              } else {
                if (!context.hasCrossSeled) {
                  finalResponse.text = toolArgs.messageToUser || 'Gostaria de adicionar algo mais para acompanhar?';
                  context.hasCrossSeled = true;
                  if (toolArgs.suggestedProductId) {
                    const suggested = fullInventory.find(i => i.id === toolArgs.suggestedProductId);
                    if (suggested) finalResponse.products = [suggested];
                  }
                } else {
                  finalResponse.text = `Resumo do pedido:\n\n${cartItems}\n\n💰 Total: R$ ${total.toFixed(2)}\n\nTudo certo para prosseguirmos?`;
                  context.isConfirmingOrder = true;
                }
              }
            }

            else if (toolCalled === 'getOrderStatus') {
              if (!context.customerId) {
                finalResponse.text = "Preciso saber quem é você para consultar seus pedidos.";
              } else {
                const order = await customerRepository.getLastOrderStatus(context.customerId);
                finalResponse.text = order ? `Seu último pedido (R$ ${order.total.toFixed(2)}) está com status: "${order.status}".\n\nMais alguma coisa?` : "Não encontrei pedido recente.\n\nMais alguma coisa?";
              }
            }

            else {
              aiResponseText = finalResponse.text || "Ok.";
            }
          } else {
            finalResponse.text = aiResponseText;
            if (context.flowState === 'ORDER_TRACKING' && !finalResponse.text.includes('?')) {
              finalResponse.text += "\n\nDeseja pedir alguma coisa?";
            }
          }

        } catch (error) {
          console.error("[LLM Chain Error]:", error);
          finalResponse.text = 'Ocorreu um erro de comunicação com o assistente. Deseja continuar no site oficial?';
          finalResponse.options = ['Ir para o site'];
          finalResponse.redirectToSite = true;
        }
        break;

      case 'METRICS_CSAT':
        if (!context.isEvaluating) {
          context.isEvaluating = true;
          finalResponse.text = "Gostaria de avaliar seu atendimento hoje? De 1 a 5, que nota você daria para a nossa conversa?";
          finalResponse.options = ["1", "2", "3", "4", "5"];
        } else {
          context.isEvaluating = false;
          finalResponse.text = "Muito obrigado pela sua avaliação! Seu feedback é importante para nós. Tenha um ótimo dia!";
          finalResponse.options = [];

          const timeSpent = Math.floor((Date.now() - context.startTime) / 1000) || 60;
          let rating = parseInt(message.replace(/\D/g, '')) || 5;
          this._logMetricBackground(DashboardDataRepository.create({
            protocol: context.protocolId,
            chat_time_seconds: timeSpent,
            evaluation: rating,
            handoff: false,
            conversion: true
          }));
        }
        break;
    }

    // Processamento Final de Resposta
    if (!finalResponse.options) finalResponse.options = [];
    if (!['CREATE_ORDER', 'SHOW_REGISTER_FORM'].includes(finalResponse.action) && context.flowState !== 'METRICS_CSAT') {
      if (context.isConfirmingAddress) {
        finalResponse.options = ["Tudo Certo", "Desejo Alterar"];
      } else if (context.isConfirmingOrder) {
        finalResponse.options = ["Sim", "Não", "Ver cardápio"];
      } else if (context.flowState === 'SHOPPING_CROSS_SELL' && Object.keys(context.cart).length > 0) {
        finalResponse.options.push("Cardápio", "Salgados", "Doces", "Bebidas", "Fechar Pedido");
      }
    }

    // Update Histórico
    context.history.push({ role: 'user', text: message.startsWith('[DADOS_DO_FORMULARIO]:') ? "Preenchi meus dados de cadastro." : message });
    context.history.push({ role: 'assistant', text: finalResponse.text });

    finalResponse.context = context;
    return finalResponse;
  }

  // Helper Limpo para calcular o resumo do carrinho
  _calculateCart(cartMap, inventory, isCouponApplied) {
    let total = 0;
    let items = [];
    for (const [id, qty] of Object.entries(cartMap)) {
      const p = inventory.find(i => String(i.id) === String(id));
      if (p) {
        total += p.price * qty;
        items.push(`• ${qty}x ${p.name}`);
      }
    }
    return { total: isCouponApplied ? total * 0.9 : total, cartItems: items.join('\n') };
  }
}

module.exports = new ChatService();