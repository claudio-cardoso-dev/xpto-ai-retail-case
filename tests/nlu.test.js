require('dotenv').config();
const IntentEngine = require('../src/agents/IntentEngine');

describe('IntentEngine (NLU) Tests', () => {
  it('Should classify "Olá" as GREETING', async () => {
    const result = await IntentEngine.extract('Olá, tudo bem?');
    expect(result.intent).toBe('GREETING');
  });

  it('Should classify phone number as PROVIDE_DATA and extract it', async () => {
    const result = await IntentEngine.extract('11945256750');
    expect(result.intent).toBe('PROVIDE_DATA');
    expect(result.entities.phoneOrEmail).toBe('11945256750');
  });

  it('Should classify "quero 2 pudins" as ORDER_PRODUCT or ADD_TO_CART', async () => {
    const result = await IntentEngine.extract('quero 2 pudins');
    expect(['ADD_TO_CART', 'ORDER_PRODUCT']).toContain(result.intent);
    expect(result.entities.productName.toLowerCase()).toContain('pudim');
    expect(result.entities.quantity).toBe(2);
  });
});
