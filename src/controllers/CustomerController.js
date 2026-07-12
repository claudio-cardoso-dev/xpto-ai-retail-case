const customerRepository = require('../repositories/CustomerRepository');

class CustomerController {
  async getAll(req, res) {
    try {
      const customers = await customerRepository.getAllCustomers();
      res.json(customers);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      res.status(500).json({ error: 'Erro ao buscar clientes' });
    }
  }

  async create(req, res) {
    try {
      const id = await customerRepository.createCustomer(req.body);
      res.status(201).json({ id, ...req.body, profile: req.body.profile || 'BTC' });
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      res.status(500).json({ error: 'Erro ao criar cliente' });
    }
  }

  async update(req, res) {
    try {
      const id = req.params.id;
      const changes = await customerRepository.updateCustomer(id, req.body);
      if (changes === 0) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      res.status(500).json({ error: 'Erro ao atualizar cliente' });
    }
  }

  async delete(req, res) {
    try {
      const id = req.params.id;
      const changes = await customerRepository.deleteCustomer(id);
      if (changes === 0) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Erro ao deletar cliente:', error);
      res.status(500).json({ error: 'Erro ao deletar cliente' });
    }
  }
}

module.exports = new CustomerController();
