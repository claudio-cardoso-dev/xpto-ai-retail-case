/**
 * Auth Middleware
 * Garante que a requisição contenha um header Authorization Bearer válido.
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido' });
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Token mal formatado' });
  }

  const token = parts[1];
  const secret = process.env.API_SECRET_TOKEN || 'xpto_demo_123';

  if (token !== secret) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  return next();
};

module.exports = authMiddleware;
