const chatService = require('../src/services/ChatService');
const inventoryRepository = require('../src/repositories/InventoryRepository');

describe('ChatService Unit Tests', () => {
  it('Should return a greeting when user says "Olá"', async () => {
    const response = await chatService.processMessage('Olá');
    expect(response.text).toContain('Olá! Sou o assistente de vendas');
    expect(response.options).toContain('Ver catálogo');
  });

  it('Should transfer to human when requested', async () => {
    const response = await chatService.processMessage('quero falar com humano');
    expect(response.transferToHuman).toBe(true);
    expect(response.text).toContain('transferindo você para a nossa equipe');
  });

  it('Should return Nike products when user mentions "nike"', async () => {
    const response = await chatService.processMessage('tênis da nike');
    expect(response.products.length).toBeGreaterThan(0);
    expect(response.products[0].brand.toLowerCase()).toBe('nike');
    expect(response.text).toContain('Nike');
  });

  it('Should offer catalog options when intent is not specific', async () => {
    const response = await chatService.processMessage('gostaria de comprar');
    expect(response.options).toEqual(expect.arrayContaining(['Nike', 'Adidas']));
    expect(response.products.length).toBe(0);
  });
});
