require('dotenv').config();
const chat = require('./src/services/ChatService');

(async () => {
  let ctx = { history: [], protocolId: 'ABC_' + Date.now() };
  let msgs = [
    `[DADOS_DO_FORMULARIO]:{"name":"Test","email":"test${Date.now()}@test.com","phone":"${Date.now()}","street":"Rua","number":"1","neighborhood":"Bairro","city":"SP","cep":"00000"}`,
    'Quero pedir: Coxinha de Frango com Catupiry',
    '10',
    'suco',
    '2',
    'Fechar Pedido'
  ];
  
  for (let msg of msgs) {
    let res = await chat.processMessage(msg, ctx);
    console.log('U:', msg);
    console.log('B:', res.text);
    ctx = res.context;
  }
  
  console.log('FINAL CART:', ctx.cart);
  process.exit(0);
})();
