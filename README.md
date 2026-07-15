# XPTO AI Retail Case - Backend / Chatbot

Este projeto consiste na API Backend e motor conversacional de Inteligência Artificial para a Padaria XPTO (XPTO Retail). Ele gerencia o atendimento ao cliente via Chatbot, com foco em jornada de compras, retenção de checkout, cross-sell, e resolução de intenções do usuário em tempo real.

## 🚀 Como a aplicação funciona

O sistema atua como uma interface conversacional inteligente que guia o usuário pelo cardápio, adiciona itens ao carrinho, realiza "Cross-Sell" de produtos complementares, gerencia descontos (cupons de retenção na hora do checkout) e coleta pesquisas de satisfação (CSAT). 

A aplicação utiliza LLMs (Large Language Models via Groq) em uma arquitetura RAG (Retrieval-Augmented Generation) combinada com um poderoso motor de extração de intenções e entidades para entender exatamente o que o usuário deseja e guiar o estado da conversa (`flowState`).

### Principais Funcionalidades
1. **Reconhecimento de Intenções (NLU):** Identifica rapidamente o objetivo da mensagem do cliente (compra, rastreamento, dúvidas).
2. **Sistema RAG:** Busca produtos do banco de dados (SQLite) que sejam mais relevantes ao que o usuário solicitou.
3. **Cross-Sell:** Oferta de produtos complementares de forma inteligente antes da confirmação do pedido, visando aumentar o ticket médio.
4. **Retenção de Carrinho:** Se o usuário tentar desistir da compra ou rejeitar o resumo do pedido final, o sistema possui a capacidade de ofertar estrategicamente um cupom de desconto na tentativa de salvar a conversão.
5. **CSAT e Dashboard:** Em caso de abandono de carrinho definitivo ou de venda concluída, o sistema coleta a avaliação do usuário (1 a 5 estrelas) e salva métricas operacionais que alimentam um painel gerencial de indicadores.

---

## 📂 Estruturação de Pastas

A arquitetura do projeto segue princípios de modularização (Clean Architecture), separando as responsabilidades de forma explícita:

```text
📦 xpto-ai-retail-case
 ┣ 📂 src
 ┃ ┣ 📂 agents          # Motores de IA (IntentEngine, SalesAgent, InventoryRAG)
 ┃ ┣ 📂 controllers     # Controladores das rotas e requisições HTTP (req/res)
 ┃ ┣ 📂 db              # Arquivos locais e lógica de persistência do Banco (SQLite)
 ┃ ┣ 📂 middlewares     # Interceptadores (Validação, Rate Limiting, CORS)
 ┃ ┣ 📂 repositories    # Camada de Acesso a Dados (Queries de Produtos, Clientes, Métricas)
 ┃ ┣ 📂 routes          # Endpoints mapeados para a API Rest (Express)
 ┃ ┗ 📂 services        # Regras de Negócio, orquestração de estados (Ex: ChatService)
 ┣ 📜 server.js         # Arquivo principal e ponto de entrada da API
 ┣ 📜 package.json      # Configurações de scripts e pacotes NPM
 ┗ 📜 README.md         # Documentação da aplicação
```

---

## 🧠 Intenções Mapeadas (Intents)

O módulo responsável pela Interpretação de Intenções (`IntentEngine.js`) é capaz de classificar as mensagens do usuário nas seguintes categorias principais:

- **`ACOMPANHAR_PEDIDO`**
  O usuário está perguntando sobre o status de entrega do seu pedido ou deseja saber se já possui algum em andamento (Ex: "Onde está minha entrega?", "Meu pedido já saiu?").

- **`COMPRAR`**
  O usuário está procurando produtos, querendo iniciar um pedido, visualizando o cardápio ou gerenciando itens (adicionando/removendo). Esta intenção engloba de forma macro todo o funil de vendas.

- **`UNKNOWN`**
  Utilizada como *Fallback* de intenção. Associa-se a mensagens incompreensíveis, conversas triviais que fogem do escopo de vendas/rastreamento, ou caso o LLM não consiga classificar com alto grau de confiança (confidence level).

---

## 📦 Entidades Extraídas (Entities)

Enquanto as Intenções determinam "o que o usuário quer fazer", as entidades são as "informações chave" (dados estruturados) extraídas de dentro da frase durante a conversa pela IA:

- **`productName`** (String)
  O nome específico do produto mencionado na fala do cliente (Ex: "Coxinha", "Sonho", "Café gelado").

- **`quantity`** (Number)
  A quantidade de itens daquele produto que o usuário deseja adicionar ou remover (Ex: 2, 5, 10).

- **`phoneOrEmail`** (String)
  Informação de contato capturada para fluxos de registro e recuperação de histórico de cliente.

- **`addressInfo`** (String)
  Dados geográficos mencionados pelo usuário, como CEP, rua ou número, utilizados para confirmação do local de entrega da padaria.

---

## 🛠 Como Executar Localmente

1. Realize o clone deste repositório para o seu ambiente local.
2. Crie e configure um arquivo `.env` na raiz do projeto (utilize o `.env.example` como base). Não se esqueça de preencher sua variável de ambiente `GROQ_API_KEY`.
3. Instale as dependências via NPM:
   ```bash
   npm install
   ```
4. Inicie o servidor. O banco de dados relacional SQLite criará os arquivos localmente caso não existam:
   ```bash
   npm start
   ```
5. A API Backend estará funcional e aguardando requisições (por padrão) na porta `3001` ou aquela definida em seu arquivo de ambiente. Você poderá conectar um Frontend React ao motor para testar a comunicação.
