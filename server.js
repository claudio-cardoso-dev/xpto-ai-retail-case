const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const apiRoutes = require('./src/routes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Swagger Configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'XPTO Retail AI API',
      version: '1.0.0',
      description: 'API para demonstração de chatbot ativo e estoque da XPTO Sneakers.',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Servidor Local'
      },
      {
        url: `https://api.claudiocardoso.dev/api/xpto`,
        description: 'Servidor de Produção VPS'
      }
    ],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Rotas Base
app.get('/', (req, res) => {
  res.send('XPTO Retail AI API is running... Acesse /api-docs para documentação.');
});

// Registra as rotas da API
app.use('/api', apiRoutes);

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
  });
}

module.exports = app;
