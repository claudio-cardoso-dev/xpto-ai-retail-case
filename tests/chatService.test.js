require('dotenv').config();
const chatService = require('../src/services/ChatService');
const customerRepository = require('../src/repositories/CustomerRepository');

describe('ChatService Unit Tests (XPTO Padaria)', () => {
  beforeEach(() => {
    jest.spyOn(customerRepository, 'findByTelefoneOrEmail').mockImplementation(async (identifier) => {
      if (identifier === '11945256750') {
        return null; // Not registered
      }
      if (identifier === '11999999999') {
        return { id: 1, name: 'Claudio', telefone: '11999999999' };
      }
      return null;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Should return a greeting and ask for identification on initial empty message', async () => {
    const response = await chatService.processMessage('');
    expect(response.text.toLowerCase()).toContain('olá');
    expect(response.text.toLowerCase()).toContain('e-mail ou telefone');
  });

  it('Should ask for valid email or phone when user says "Olá" before identifying', async () => {
    const response = await chatService.processMessage('Olá');
    expect(response.text.toLowerCase()).toContain('formato inválido');
    expect(response.text.toLowerCase()).toContain('e-mail ou telefone');
  });

  it('Should offer registration when un unregistered phone is provided', async () => {
    const response = await chatService.processMessage('11945256750');
    expect(response.text.toLowerCase()).toContain('não encontrei seu cadastro');
    expect(response.options).toContain('Cadastrar');
  });

  it('Should welcome the user if the phone is registered', async () => {
    const response = await chatService.processMessage('11999999999');
    expect(response.text.toLowerCase()).toContain('bem-vindo de volta, claudio');
  });
});
