const http = require('http');

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendMsg(message, context) {
    console.log(`\n======================================================`);
    console.log(`[USER]: ${message}`);
    const res = await fetch('http://localhost:3002/api/xpto/api/chat', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer xpto_demo_123'
        },
        body: JSON.stringify({ message, context })
    });
    const data = await res.json();
    console.log(`[BOT]: ${data.text}`);
    if (data.products && data.products.length > 0) {
        console.log(`[BOT_PRODUCTS]: ${data.products.map(p => p.name).join(', ')}`);
    }
    if (data.options && data.options.length > 0) {
        console.log(`[BOT_OPTIONS]: ${data.options.join(', ')}`);
    }
    return data;
}

async function runTest() {
    console.log("Iniciando Teste E2E do Chatbot XPTO...");
    
    // 1. Identificação
    let response = await sendMsg("Olá", {});
    response = await sendMsg("teste@email.com", response.context);
    
    // 2. Preencher formulário
    const formData = { name: "Test User", email: "teste@email.com", phone: "(11) 99999-9999", street: "Rua X", number: "123", neighborhood: "Bairro", city: "SP", cep: "00000-000" };
    response = await sendMsg(`[DADOS_DO_FORMULARIO]:${JSON.stringify(formData)}`, response.context);
    
    // 3. Pedir Produto 1 (Pão de queijo)
    response = await sendMsg("Quero um pão de queijo", response.context);
    
    // 3. Adicionar Produto 1
    response = await sendMsg("<FUNCTION_CALL>addToCart_pao_de_queijo", response.context); // Simula o clique
    // O front-end na verdade injeta: "Quero pedir: Pão de Queijo Tradicional"
    response = await sendMsg("Quero pedir: Pão de Queijo Tradicional", response.context);
    response = await sendMsg("1", response.context); // Quantidade
    
    // 4. Pedir Produto 2 (Coxinha)
    response = await sendMsg("Também quero uma coxinha", response.context);
    
    // 5. Adicionar Produto 2
    response = await sendMsg("Quero pedir: Coxinha de Frango com Catupiry", response.context);
    response = await sendMsg("2", response.context); // Quantidade
    
    // 6. Fechar pedido
    response = await sendMsg("Pode fechar meu pedido", response.context);
    
    // 7. Aceitar recomendação (Cross-sell)
    // O bot deve perguntar se quero adicionar algo mais (bebida).
    response = await sendMsg("Sim, me dê um suco de laranja", response.context);
    
    // 8. Adicionar Produto 3 (Recomendação)
    response = await sendMsg("Quero pedir: Suco de Laranja Natural", response.context);
    response = await sendMsg("1", response.context); // Quantidade
    
    // 9. Validar resumo
    response = await sendMsg("Pode finalizar agora", response.context);
    
    // 10. Intenção de não compra (Cupom)
    response = await sendMsg("Achei meio caro, acho que vou desistir", response.context);
    
    // 11. Aceitar Cupom
    response = await sendMsg("Aceito o desconto", response.context);
    
    // 12. Confirmar Pedido e Endereço
    response = await sendMsg("Sim, tudo certo", response.context); // confirma produtos
    response = await sendMsg("Sim, o endereço está correto", response.context); // confirma endereço
    
    // 13. Avaliar
    response = await sendMsg("5", response.context);
    
    console.log("\n======================================================");
    console.log("Teste Concluído!");
}

runTest().catch(console.error);
