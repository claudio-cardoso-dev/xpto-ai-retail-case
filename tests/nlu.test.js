require('dotenv').config();
const IntentEngine = require('../src/agents/IntentEngine');

describe('IntentEngine (NLU) Tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Should validate schema and classify order tracking as ACOMPANHAR_PEDIDO', async () => {
    jest.spyOn(IntentEngine.prompt, 'pipe').mockReturnValue({
      invoke: jest.fn().mockResolvedValue({
        intent: 'ACOMPANHAR_PEDIDO',
        confidence: 0.95,
        entities: {}
      })
    });

    const result = await IntentEngine.extract('onde está meu pedido?');
    const parsed = IntentEngine.schema.parse(result);
    expect(parsed.intent).toBe('ACOMPANHAR_PEDIDO');
    expect(parsed.confidence).toBeGreaterThan(0.5);
  });

  it('Should classify "quero 2 pudins" as COMPRAR and extract product entities', async () => {
    jest.spyOn(IntentEngine.prompt, 'pipe').mockReturnValue({
      invoke: jest.fn().mockResolvedValue({
        intent: 'COMPRAR',
        confidence: 0.98,
        entities: {
          productName: 'pudim',
          quantity: 2
        }
      })
    });

    const result = await IntentEngine.extract('quero 2 pudins');
    const parsed = IntentEngine.schema.parse(result);
    expect(parsed.intent).toBe('COMPRAR');
    expect(parsed.entities.productName.toLowerCase()).toContain('pudim');
    expect(parsed.entities.quantity).toBe(2);
  });

  it('Should safely fallback to UNKNOWN when LLM throws an error (e.g. missing API key)', async () => {
    jest.spyOn(IntentEngine.prompt, 'pipe').mockReturnValue({
      invoke: jest.fn().mockRejectedValue(new Error('Invalid API Key'))
    });

    const result = await IntentEngine.extract('mensagem qualquer');
    expect(result.intent).toBe('UNKNOWN');
    expect(result.confidence).toBe(0);
    expect(result.entities).toEqual({});
  });
});
