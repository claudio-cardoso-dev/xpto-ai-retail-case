const repo = require('../repositories/DashboardDataRepository');

class DashboardDataController {
  async getAll(req, res) {
    try {
      const data = await repo.getAll();
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar dados' });
    }
  }

  async getKPIs(req, res) {
    try {
      const stats = await repo.getKPIs();
      
      const total = stats.total_chats || 0;
      const conversionRate = total > 0 ? (stats.total_conversions / total) * 100 : 0;
      const retentionRate = total > 0 ? (stats.total_retained / total) * 100 : 0;
      
      // format time e.g., "1m 30s"
      const avgTime = stats.avg_time_seconds || 0;
      const min = Math.floor(avgTime / 60);
      const sec = Math.floor(avgTime % 60);
      const formattedTime = `${min}m ${sec}s`;

      res.json({
        conversionAssisted: `${conversionRate.toFixed(1)}%`,
        retentionIA: `${retentionRate.toFixed(1)}%`,
        avgTime: formattedTime,
        csat: stats.avg_csat ? stats.avg_csat.toFixed(1) : '0.0'
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar KPIs' });
    }
  }

  async create(req, res) {
    try {
      const id = await repo.create(req.body);
      res.status(201).json({ id, ...req.body });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar dado' });
    }
  }

  async update(req, res) {
    try {
      const id = req.params.id;
      const changes = await repo.update(id, req.body);
      if (changes === 0) {
        return res.status(404).json({ error: 'Registro não encontrado' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar dado' });
    }
  }

  async delete(req, res) {
    try {
      const id = req.params.id;
      const changes = await repo.delete(id);
      if (changes === 0) {
        return res.status(404).json({ error: 'Registro não encontrado' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao deletar dado' });
    }
  }
}

module.exports = new DashboardDataController();
