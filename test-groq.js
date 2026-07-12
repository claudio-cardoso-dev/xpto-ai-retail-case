const Groq = require('groq-sdk');
require('dotenv').config({ path: 'C:/projetos/xpto-ai-retail-case/.env' });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function run() {
  const customPrompt = `Você é um agente especialista de Cadastro da Padaria XPTO.
[FASE ATUAL: CADASTRO DE NOVO CLIENTE]
Sua missão é coletar dados estruturados passo a passo.

- TAREFA ATUAL: Peça APENAS o CEP do endereço de entrega do cliente.
- INSTRUÇÃO CRÍTICA: Qualquer número fornecido agora é o CEP. Grave-o EXCLUSIVAMENTE em "customerCEP". Deixe "customerNumber" nulo.
- Se ele fornecer o dado que você pediu, extraia-o.

Responda SEMPRE E APENAS no formato JSON:
{
  "text": "Sua pergunta ou resposta",
  "customerName": "nome_extraido_caso_fornecido",
  "customerEmail": "email_extraido_caso_fornecido",
  "customerPhone": "telefone_extraido_caso_fornecido",
  "customerCEP": "cep_extraido_caso_fornecido",
  "customerNumber": "numero_extraido_caso_fornecido"
}`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: customPrompt },
      { role: 'user', content: '13300170' }
    ],
    model: 'llama-3.1-8b-instant',
    response_format: { type: 'json_object' },
    temperature: 0.2,
  });

  console.log(completion.choices[0].message.content);
}

run().catch(console.error);
