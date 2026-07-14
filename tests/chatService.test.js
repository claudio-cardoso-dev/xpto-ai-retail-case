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

  it('Should return a greeting and ask for identification when user says "Olá"', async () => {
    const response = await chatService.processMessage('Olá');
    expect(response.text.toLowerCase()).toContain('olá');
    // For padaria it should ask for phone/email if not logged in
    expect(response.text.toLowerCase()).toContain('telefone ou e-mail');
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
