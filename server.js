const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const inventory = require('./data/inventory');
const chatController = require('./controllers/chatController');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('XPTO Retail AI API is running...');
});

// Inventory Routes
app.get('/api/inventory', (req, res) => {
  res.json(inventory);
});

// Chatbot Route
app.post('/api/chat', chatController.handleMessage);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
