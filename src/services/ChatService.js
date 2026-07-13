const inventoryRepository = require('../repositories/InventoryRepository');
const customerRepository = require('../repositories/CustomerRepository');
const Groq = require('groq-sdk');
const crypto = require('crypto');

const SalesAgent = require('../agents/SalesAgent');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

class ChatService {
  async processMessage(message, context = {}) {
    // 1. Inicializa estado
    if (!context.protocolId) {
      context.protocolId = `XPTO-${new Date().getFullYear()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      context.startTime = Date.now();
    }
    if (!context.cart) context.cart = {}; 
    if (!context.hasCrossSeled) context.hasCrossSeled = false;
    if (!context.history) context.history = [];
    
    // Busca estoque reduzido para o SalesAgent
    const inventory = await inventoryRepository.getAll();
    const inventoryMin = inventory.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price
    }));

    // Verifica se é uma interceptação de formulário do frontend
    let systemInjectedMessage = message;
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
        
        systemInjectedMessage = `[AÇÃO DO SISTEMA]: O cliente preencheu o formulário de cadastro com sucesso. O nome dele é ${formData.name}. Agradeça e pergunte o que ele deseja pedir hoje. Não peça mais dados de endereço.`;
      } catch (e) {
        console.error("Erro ao parsear formulário", e);
      }
    } else if (message.toLowerCase().includes('quero pedir:')) {
       const productName = message.replace(/Quero pedir:/i, '').trim();
       context.pendingProduct = productName;
       systemInjectedMessage = `[AÇÃO DO SISTEMA]: O cliente clicou no botão para comprar o produto "${productName}". Apenas pergunte: "Quantas unidades você deseja?".`;
    } else if (message.toLowerCase() === 'cadastrar') {
       return {
         text: "Perfeito! Por favor, preencha o formulário abaixo para agilizarmos:",
         action: 'SHOW_REGISTER_FORM',
         options: [],
         products: [],
         redirectToSite: false,
         context: context
       };
    } else if (message.toLowerCase() === 'ir para o site') {
       try {
         const timeSpent = Math.floor((Date.now() - (context.startTime || Date.now())) / 1000) || 30;
         const DashboardDataRepository = require('../repositories/DashboardDataRepository');
         await DashboardDataRepository.create({
           protocol: context.protocolId,
           chat_time_seconds: timeSpent,
           evaluation: 3,
           handoff: true,
           conversion: false
         });
       } catch(e) {}
       return {
         text: "Redirecionando para o site oficial...",
         redirectToSite: true,
         options: [],
         products: [],
         context: context
       };
    }

    const systemPrompt = SalesAgent.getSystemPrompt(context, inventoryMin);
    
    // Constrói array de mensagens para OpenAI/Groq format (que é mais seguro de prever)
    const messages = [
      { role: 'system', content: systemPrompt }
    ];
    
    if (context.history.length > 0) {
      context.history.forEach(h => {
        messages.push({ role: h.role, content: h.text });
      });
    }
    messages.push({ role: 'user', content: systemInjectedMessage });

    let finalResponse = {
      text: '',
      options: [],
      products: [],
      redirectToSite: false,
      action: null,
      context: context
    };

    try {
      let aiResponseText = '';
      let toolCalled = null;
      let toolArgs = {};

      try {
        let groqSuccess = false;
        let msg = null;
        
        // Modelos Groq com suporte a Tool Calling, em ordem de prioridade
        const groqModels = [
          'llama-3.3-70b-versatile', 
          'llama-3.1-8b-instant', 
          'llama-3.1-70b-versatile',
          'llama3-70b-8192'
        ];
        
        for (const modelName of groqModels) {
          try {
            const completion = await groq.chat.completions.create({
              messages: messages,
              model: modelName,
              tools: SalesAgent.getGroqTools(),
              tool_choice: "auto",
              temperature: 0.2,
            });
            msg = completion.choices[0].message;
            groqSuccess = true;
            break; // Sai do loop em caso de sucesso
          } catch (modelError) {
            console.warn(`[Groq Fallback]: Falhou com o modelo ${modelName}, tentando próximo...`);
          }
        }

        if (!groqSuccess || !msg) {
          throw new Error("Todos os modelos do Groq falharam por limite ou timeout.");
        }
        
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          toolCalled = msg.tool_calls[0].function.name;
          toolArgs = JSON.parse(msg.tool_calls[0].function.arguments || '{}');
        } else if (msg.content && (msg.content.includes('<function=') || msg.content.includes('function='))) {
          // Llama 3.1 fallback parser se o Groq vazar a sintaxe da tool no content
          const functionMatch = msg.content.match(/<?function=([^>]+)>(.*?)(?:<\/function>|$)/s);
          if (functionMatch) {
             toolCalled = functionMatch[1].trim();
             try {
                toolArgs = JSON.parse(functionMatch[2].trim());
             } catch(e) { toolArgs = {}; }
             // Pega o texto que sobrou fora da tag e injeta como messageToUser
             const leftoverText = msg.content.replace(functionMatch[0], '').trim();
             if (leftoverText && !toolArgs.messageToUser) {
                 toolArgs.messageToUser = leftoverText;
             }
          } else {
             aiResponseText = msg.content;
          }
        } else if (msg.content && msg.content.includes('<tool_call>')) {
           // Outro formato comum do Llama 3.1
           const toolMatch = msg.content.match(/<tool_call>(.*?)<\/tool_call>/s);
           if (toolMatch) {
              try {
                 const parsed = JSON.parse(toolMatch[1]);
                 toolCalled = parsed.name;
                 toolArgs = parsed.arguments;
              } catch(e) {}
           } else {
             aiResponseText = msg.content;
           }
        } else {
          aiResponseText = msg.content;
        }

      } catch (groqError) {
        console.warn('Groq falhou, fazendo fallback para Gemini...', groqError);
        // Fallback pro Gemini se Groq falhar
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
          model: "gemini-1.5-flash-latest",
          tools: SalesAgent.getGeminiTools(),
        });
        
        const chat = model.startChat({
          history: messages.slice(0, -1).map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          }))
        });
        
        const result = await chat.sendMessage(messages[messages.length - 1].content);
        
        const functionCalls = result.response.functionCalls();
        if (functionCalls && functionCalls.length > 0) {
          toolCalled = functionCalls[0].name;
          toolArgs = functionCalls[0].args;
        } else {
          aiResponseText = result.response.text();
        }
      }

      // Executa a lógica baseada na Tool chamada
      if (toolCalled) {
        if (toolCalled === 'lookupCustomer') {
          const customer = await customerRepository.findByTelefoneOrEmail(toolArgs.identifier);
          if (customer) {
            context.customerId = customer.id;
            context.customerName = customer.name;
            context.customerAddress = customer.address;
            context.customerProfile = customer.profile;
            context.customerIdentifier = customer.telefone || customer.email || toolArgs.identifier;
            finalResponse.text = `Bem-vindo de volta, ${customer.name}! Identifiquei seu cadastro. O que você gostaria de pedir hoje?`;
          } else {
            finalResponse.options = ["Cadastrar"];
            finalResponse.text = "Ainda não encontrei seu cadastro no nosso sistema. Por favor, me informe seu nome completo para iniciarmos, ou clique em Cadastrar para preencher o formulário rápido:";
          }
        }
        else if (toolCalled === 'requestCustomerRegistration') {
          finalResponse.action = 'SHOW_REGISTER_FORM';
          finalResponse.text = "Preciso de alguns dados para finalizar seu cadastro e enviar seu pedido corretamente. Por favor, preencha o formulário abaixo:";
        }
        else if (toolCalled === 'validateCEP') {
          try {
            const cepResponse = await fetch(`https://viacep.com.br/ws/${toolArgs.cep.replace(/\\D/g, '')}/json/`);
            const cepData = await cepResponse.json();
            if (cepData.erro) {
               finalResponse.text = "Ops, não consegui encontrar esse CEP. Pode verificar e digitar novamente?";
            } else {
               finalResponse.text = `Encontrei: ${cepData.logradouro}, ${cepData.bairro}, ${cepData.localidade}. Qual o número da residência (e complemento se houver)?`;
            }
          } catch (e) {
             finalResponse.text = "Tive um problema ao consultar o CEP. Qual o nome da sua rua, bairro e cidade?";
          }
        }
        else if (toolCalled === 'completeRegistration') {
           const fullAddress = `${toolArgs.street}, ${toolArgs.number} - ${toolArgs.neighborhood}, ${toolArgs.city} - ${toolArgs.cep}`;
           await customerRepository.createCustomer({
             name: toolArgs.name,
             email: toolArgs.email,
             telefone: toolArgs.phone,
             address: fullAddress
           });
           context.customerName = toolArgs.name;
           context.customerAddress = fullAddress;
           context.customerIdentifier = toolArgs.phone || toolArgs.email;
           finalResponse.text = `Cadastro concluído com sucesso, ${toolArgs.name}! O que você gostaria de pedir hoje?`;
        }
        else if (toolCalled === 'showProductMenu') {
          const validDisplayIds = (toolArgs.productIds || []).filter(id => !context.cart[id]);
          if (validDisplayIds.length > 0) {
            finalResponse.products = inventory.filter(p => validDisplayIds.includes(p.id));
          }
          finalResponse.text = toolArgs.messageToUser || "Aqui estão as opções que encontrei para você. Gostaria de pedir alguma?";
        }
        else if (toolCalled === 'addToCart') {
           context.isConfirmingOrder = false;
           if (toolArgs.productId && toolArgs.quantity) {
              if (!context.cart[toolArgs.productId]) context.cart[toolArgs.productId] = 0;
              context.cart[toolArgs.productId] += Number(toolArgs.quantity);
              context.pendingProduct = null;
              
              if (context.hasCrossSeled) {
                 // Estávamos no meio do fechamento, usuário aceitou o cross-sell e adicionou
                 let total = 0;
                 let cartItems = [];
                 for (const [id, qty] of Object.entries(context.cart)) {
                   const p = inventory.find(i => i.id === id);
                   if (p) {
                     total += p.price * qty;
                     cartItems.push(`${qty}x ${p.name}`);
                   }
                 }
                 let formattedCart = cartItems.map(item => `• ${item}`).join('\n');
                 finalResponse.text = `Adicionado! Aqui está o resumo atualizado do seu pedido:\n\n${formattedCart}\n\n💰 Total: R$ ${total.toFixed(2)}\n\nTudo certo para prosseguirmos?`;
                 context.isConfirmingOrder = true;
              } else {
                 let msg = toolArgs.messageToUser || `Adicionado ao carrinho com sucesso!`;
                 if (!msg.includes('?')) {
                   msg += " Deseja mais alguma coisa?";
                 }
                 finalResponse.text = msg;
              }
           }
        }
        else if (toolCalled === 'removeFromCart') {
          context.isConfirmingOrder = false;
          if (toolArgs.productId && context.cart[toolArgs.productId]) {
            context.cart[toolArgs.productId] -= Number(toolArgs.quantity || 1);
            if (context.cart[toolArgs.productId] <= 0) delete context.cart[toolArgs.productId];
            finalResponse.text = toolArgs.messageToUser || "Item removido do carrinho. Deseja mais algo?";
          }
        }
        else if (toolCalled === 'updateCustomerAddress') {
          await customerRepository.updateAddress(context.customerIdentifier, toolArgs.newAddress);
          context.customerAddress = toolArgs.newAddress;
          finalResponse.text = "Endereço atualizado com sucesso!";
        }
        else if (toolCalled === 'requestCheckout') {
          if (!context.customerName) {
            finalResponse.action = 'SHOW_REGISTER_FORM';
            finalResponse.text = "Antes de fechar o pedido, preciso dos seus dados de entrega. Por favor, preencha o formulário:";
          } else {
            let total = 0;
            let cartItems = [];
            for (const [id, qty] of Object.entries(context.cart)) {
              const p = inventory.find(i => i.id === id);
              if (p) {
                total += p.price * qty;
                cartItems.push(`${qty}x ${p.name}`);
              }
            }
            
            if (context.isConfirmingAddress) {
              finalResponse.text = `Perfeito, ${context.customerName}! Seu pedido foi confirmado e será entregue em breve no endereço:\n📍 ${context.customerAddress}\n\nEstamos enviando para a cozinha!`;
              finalResponse.action = 'CREATE_ORDER';
              context.cart = {}; // limpa o carrinho
              context.isConfirmingOrder = false;
              context.isConfirmingAddress = false;
              context.hasCrossSeled = false;
            } else if (context.isConfirmingOrder) {
              finalResponse.text = `Ótimo! O endereço de entrega cadastrado é:\n📍 ${context.customerAddress}\n\nEstá correto ou deseja alterar?`;
              context.isConfirmingAddress = true;
            } else {
              // Se tivermos cross-sell para fazer, fazemos antes de confirmar o resumo
              if (!context.hasCrossSeled) {
                finalResponse.text = `${toolArgs.messageToUser || 'Gostaria de adicionar algo mais para acompanhar?'}`;
                context.hasCrossSeled = true;
                if (toolArgs.suggestedProductId) {
                  const suggested = inventory.find(i => i.id === toolArgs.suggestedProductId);
                  if (suggested) {
                    finalResponse.products = [suggested];
                  }
                }
              } else {
                let formattedCart = cartItems.map(item => `• ${item}`).join('\n');
                finalResponse.text = `Aqui está o resumo do seu pedido:\n\n${formattedCart}\n\n💰 Total: R$ ${total.toFixed(2)}\n\nTudo certo para prosseguirmos?`;
                context.isConfirmingOrder = true;
              }
            }
          }
        }
        else if (toolCalled === 'navigateToScreen') {
          finalResponse.action = `NAVIGATE_${toolArgs.screen.toUpperCase()}`;
          finalResponse.text = `Entendido! Carregando o ambiente ${toolArgs.screen.toUpperCase()} para você...`;
        }
        else if (toolCalled === 'getOrderStatus') {
          if (!context.customerId) {
            finalResponse.text = "Preciso saber quem é você para consultar seus pedidos. Pode me informar seu telefone ou e-mail?";
          } else {
            const order = await customerRepository.getLastOrderStatus(context.customerId);
            if (order) {
              finalResponse.text = `Seu último pedido (R$ ${order.total.toFixed(2)}) está com o status: "${order.status}". O endereço de entrega é ${order.address}.`;
            } else {
              finalResponse.text = "Não encontrei nenhum pedido recente no seu cadastro.";
            }
          }
        }
        else if (toolCalled === 'triggerCustomerEvaluation') {
          context.isEvaluating = true;
          finalResponse.text = "Gostaria de avaliar seu atendimento hoje? De 1 a 5, que nota você daria para a nossa conversa?";
          finalResponse.options = ["1", "2", "3", "4", "5"];
        }
        else if (toolCalled === 'submitFeedback') {
          context.isEvaluating = false;
          finalResponse.text = "Muito obrigado pela sua avaliação! Seu feedback é muito importante para nós. Tenha um ótimo dia!";
          finalResponse.options = [];
          
          try {
            const timeSpent = Math.floor((Date.now() - (context.startTime || Date.now())) / 1000) || 60;
            const DashboardDataRepository = require('../repositories/DashboardDataRepository');
            await DashboardDataRepository.create({
              protocol: context.protocolId,
              chat_time_seconds: timeSpent,
              evaluation: toolArgs.rating || 5,
              handoff: false,
              conversion: true // reached feedback -> completed flow
            });
          } catch(e) { console.error('Erro ao salvar metrica', e); }
        }
        
        aiResponseText = finalResponse.text; // Salva para o histórico o que geramos via tool
      } else {
        finalResponse.text = aiResponseText;
      }

      // Adiciona botões auxiliares na interface
      if (!finalResponse.options) finalResponse.options = [];
      if (finalResponse.action !== 'CREATE_ORDER' && finalResponse.action !== 'SHOW_REGISTER_FORM' && !finalResponse.action?.startsWith('NAVIGATE_') && !context.isEvaluating) {
        
        const lowerText = finalResponse.text.toLowerCase();

        // Se estamos no fluxo de fechamento (cross-sell, resumo do pedido ou endereço)
        if (context.isConfirmingOrder || context.isConfirmingAddress || (context.hasCrossSeled && (lowerText.includes('acompanhar') || lowerText.includes('adicionar')))) {
          finalResponse.options = ["Sim", "Não", "Ver cardápio"];
        } else {
          if (lowerText.includes('?') && (lowerText.includes('algo mais') || lowerText.includes('alguma coisa'))) {
            // Quando o bot pergunta se quer algo mais, oferecemos navegação rápida
            if (!finalResponse.options.includes("Ver cardápio")) {
              finalResponse.options.push("Ver cardápio", "Salgados", "Doces", "Bebidas");
            }
          } 
          
          const isAskingQuantity = lowerText.includes('quantidade') || lowerText.includes('quantas') || lowerText.includes('quantos');
          
          if (context.customerName && !isAskingQuantity && !finalResponse.options.includes("Ver cardápio")) {
             finalResponse.options.push("Ver cardápio", "Salgados", "Doces", "Bebidas");
          }
          
          if (Object.keys(context.cart).length > 0 && !finalResponse.options.includes("Fechar Pedido")) {
            finalResponse.options.push("Fechar Pedido");
          }
        }
      }

      // Atualiza o histórico apenas se não for a mensagem oculta do formulário
      if (!message.startsWith('[DADOS_DO_FORMULARIO]:')) {
        context.history.push({ role: 'user', text: message });
      } else {
        context.history.push({ role: 'user', text: "Preenchi meus dados de cadastro." });
      }
      context.history.push({ role: 'assistant', text: aiResponseText });

      finalResponse.context = context;
      return finalResponse;

    } catch (error) {
      console.error('AI Error:', error);
      return {
        text: 'Desculpe, meus circuitos estão temporariamente em manutenção. Deseja ir para o nosso site?',
        options: ['Ir para o site', 'Tentar novamente'],
        products: [],
        redirectToSite: true,
        action: null,
        context
      };
    }
  }
}

module.exports = new ChatService();
