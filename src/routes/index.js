const express = require('express');
const inventoryController = require('../controllers/InventoryController');
const chatController = require('../controllers/ChatController');
const orderController = require('../controllers/OrderController');
const metricsController = require('../controllers/MetricsController');
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

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Cria um novo pedido
 *     security:
 *       - bearerAuth: []
 */
router.post('/orders', authMiddleware, orderController.createOrder.bind(orderController));

/**
 * @swagger
 * /api/orders/{identifier}:
 *   get:
 *     summary: Consulta o pedido mais recente de um cliente
 *     security:
 *       - bearerAuth: []
 */
router.get('/orders/:identifier', authMiddleware, orderController.getOrder.bind(orderController));

/**
 * @swagger
 * /api/metrics:
 *   post:
 *     summary: Salva métricas de conversão, queda e CSAT
 *     security:
 *       - bearerAuth: []
 */
router.post('/metrics', authMiddleware, metricsController.saveMetric.bind(metricsController));

const customerController = require('../controllers/CustomerController');

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Lista todos os clientes
 *     security:
 *       - bearerAuth: []
 */
router.get('/customers', authMiddleware, customerController.getAll.bind(customerController));

/**
 * @swagger
 * /api/customers:
 *   post:
 *     summary: Cria um novo cliente
 *     security:
 *       - bearerAuth: []
 */
router.post('/customers', authMiddleware, customerController.create.bind(customerController));

/**
 * @swagger
 * /api/customers/{id}:
 *   put:
 *     summary: Atualiza um cliente
 *     security:
 *       - bearerAuth: []
 */
router.put('/customers/:id', authMiddleware, customerController.update.bind(customerController));

/**
 * @swagger
 * /api/customers/{id}:
 *   delete:
 *     summary: Exclui um cliente
 *     security:
 *       - bearerAuth: []
 */
router.delete('/customers/:id', authMiddleware, customerController.delete.bind(customerController));

const dashboardDataController = require('../controllers/DashboardDataController');

/**
 * @swagger
 * /api/dashboard-data/kpis:
 *   get:
 *     summary: Obtem os KPIs calculados
 *     security:
 *       - bearerAuth: []
 */
router.get('/dashboard-data/kpis', dashboardDataController.getKPIs.bind(dashboardDataController));

/**
 * @swagger
 * /api/dashboard-data:
 *   get:
 *     summary: Lista todos os dados de dashboard
 *     security:
 *       - bearerAuth: []
 */
router.get('/dashboard-data', authMiddleware, dashboardDataController.getAll.bind(dashboardDataController));

/**
 * @swagger
 * /api/dashboard-data:
 *   post:
 *     summary: Cria um novo dado de dashboard
 *     security:
 *       - bearerAuth: []
 */
router.post('/dashboard-data', authMiddleware, dashboardDataController.create.bind(dashboardDataController));

/**
 * @swagger
 * /api/dashboard-data/{id}:
 *   put:
 *     summary: Atualiza um dado de dashboard
 *     security:
 *       - bearerAuth: []
 */
router.put('/dashboard-data/:id', authMiddleware, dashboardDataController.update.bind(dashboardDataController));

/**
 * @swagger
 * /api/dashboard-data/{id}:
 *   delete:
 *     summary: Exclui um dado de dashboard
 *     security:
 *       - bearerAuth: []
 */
router.delete('/dashboard-data/:id', authMiddleware, dashboardDataController.delete.bind(dashboardDataController));

module.exports = router;
