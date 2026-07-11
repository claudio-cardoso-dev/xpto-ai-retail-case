const express = require('express');
const inventoryController = require('../controllers/InventoryController');
const chatController = require('../controllers/ChatController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         brand:
 *           type: string
 *         model:
 *           type: string
 *         colors:
 *           type: array
 *           items:
 *             type: string
 *         price:
 *           type: number
 *         stock:
 *           type: number
 *         image:
 *           type: string
 */

/**
 * @swagger
 * /api/inventory:
 *   get:
 *     summary: Retorna todo o estoque de tênis
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       401:
 *         description: Não autorizado (Token inválido)
 */
router.get('/inventory', authMiddleware, inventoryController.getInventory.bind(inventoryController));

/**
 * @swagger
 * /api/chat:
 *   post:
 *     summary: Processa mensagens do chatbot
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *               context:
 *                 type: object
 *     responses:
 *       200:
 *         description: Resposta processada pelo bot
 *       401:
 *         description: Não autorizado (Token inválido)
 */
router.post('/chat', authMiddleware, chatController.handleMessage.bind(chatController));

module.exports = router;
