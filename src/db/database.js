const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Caminho absoluto para o banco de dados
const dbPath = path.resolve(__dirname, 'customers.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados SQLite:', err.message);
  } else if (process.env.NODE_ENV !== 'test') {
    console.log('Conectado ao banco de dados SQLite.');
  }
});

initDb();

function initDb() {
  db.serialize(() => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        telefone TEXT UNIQUE,
        address TEXT NOT NULL,
        profile TEXT DEFAULT 'BTC'
      );

      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        total REAL NOT NULL,
        status TEXT NOT NULL,
        address TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        customer_id INTEGER,
        value TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS dashboard_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        protocol TEXT NOT NULL,
        chat_time_seconds INTEGER NOT NULL,
        evaluation INTEGER NOT NULL,
        handoff INTEGER NOT NULL DEFAULT 0,
        conversion INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        name TEXT NOT NULL,
        ingredients TEXT NOT NULL,
        price REAL NOT NULL,
        stock INTEGER NOT NULL,
        image TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS failed_intents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        protocol TEXT NOT NULL,
        user_message TEXT NOT NULL,
        context_state TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Inserir dados de teste (Mock)
    const checkQuery = `SELECT COUNT(*) AS count FROM customers`;
    db.get(checkQuery, (err, row) => {
      if (!err && row.count === 0) {
        console.log('Populando banco com clientes mockados...');
        const insert = db.prepare(`INSERT INTO customers (name, email, telefone, address, profile) VALUES (?, ?, ?, ?, ?)`);
        insert.run('João Silva', 'joao@example.com', '11999999999', 'Rua A, 123', 'BTC');
        insert.run('Maria Souza', 'maria@empresa.com', '11988888888', 'Av B, 456', 'BTB');
        insert.run('Claudio Cardoso', 'claudio@cardoso.dev', '11977777777', 'Rua C, 789', 'BTX');
        insert.finalize();
        
        // Mock order for testing getOrderStatus
        const insertOrder = db.prepare(`INSERT INTO orders (customer_id, total, status, address) VALUES (?, ?, ?, ?)`);
        insertOrder.run(3, 150.00, 'Em preparo', 'Rua C, 789');
        insertOrder.finalize();
      }
    });

    // Mock dashboard data
    const checkDash = `SELECT COUNT(*) AS count FROM dashboard_data`;
    db.get(checkDash, (errDash, rowDash) => {
      if (!errDash && rowDash.count === 0) {
        console.log('Populando banco com dados de dashboard mockados...');
        const insertDash = db.prepare(`INSERT INTO dashboard_data (protocol, chat_time_seconds, evaluation, handoff, conversion) VALUES (?, ?, ?, ?, ?)`);
        insertDash.run('PRT-2026-001', 45, 5, 0, 1);
        insertDash.run('PRT-2026-002', 120, 4, 0, 1);
        insertDash.run('PRT-2026-003', 300, 3, 1, 0);
        insertDash.run('PRT-2026-004', 65, 5, 0, 0);
        insertDash.run('PRT-2026-005', 90, 5, 0, 1);
        insertDash.finalize();
      }
    });

    // Mock product data (Inventory)
    const checkProd = `SELECT COUNT(*) AS count FROM products`;
    db.get(checkProd, (errProd, rowProd) => {
      if (!errProd && rowProd.count === 0) {
        console.log('Populando banco com dados de estoque (Inventory)...');
        const inventoryData = [
          // 15 Salgados
          { id: 'S1', category: 'Salgado', name: 'Pão de Queijo Tradicional', ingredients: ['Polvilho azedo', 'Queijo meia cura', 'Ovo', 'Leite', 'Óleo'], price: 5.50, stock: 50, image: 'https://panutti.com.br/arquivos/produtos/imagens_adicionais/P%C3%A3o%20de%20Queijo-209.jpg' },
          { id: 'S2', category: 'Salgado', name: 'Coxinha de Frango com Catupiry', ingredients: ['Farinha de trigo', 'Frango desfiado', 'Catupiry', 'Batata', 'Óleo'], price: 8.90, stock: 30, image: 'https://agostinholanchesdelivery.com.br/wp-content/uploads/2022/08/COXINHA-CATUPIRY.jpg' },
          { id: 'S3', category: 'Salgado', name: 'Croissant Frango', ingredients: ['Farinha de trigo', 'Manteiga', 'Leite', 'Açúcar', 'Fermento', 'Frango'], price: 12.00, stock: 20, image: 'https://ogimg.infoglobo.com.br/in/21476861-6b9-6af/FT1086A/INFOCHPDPICT000065884626.jpg' },
          { id: 'S4', category: 'Salgado', name: 'Empada de Palmito', ingredients: ['Farinha de trigo', 'Margarina', 'Palmito', 'Cebola', 'Azeitona'], price: 7.50, stock: 25, image: 'https://www.comidaereceitas.com.br/wp-content/uploads/2010/06/Empada-de-palmito-com-frango-freepik.jpg' },
          { id: 'S5', category: 'Salgado', name: 'Quiche de Alho-poró', ingredients: ['Farinha de trigo', 'Manteiga', 'Ovo', 'Creme de leite', 'Alho-poró'], price: 14.50, stock: 15, image: 'https://www.receitasnestle.com.br/sites/default/files/srh_recipes/d6a6f84f954f7f2751faba4d2a7005cb.jpg' },
          { id: 'S6', category: 'Salgado', name: 'Pão Francês', ingredients: ['Farinha de trigo', 'Água', 'Sal', 'Fermento'], price: 1.00, stock: 100, image: 'https://massamadreblog.com.br/wp-content/uploads/2018/04/160790-tudo-que-voce-precisa-saber-sobre-pao-frances.jpg' },
          { id: 'S7', category: 'Salgado', name: 'Esfiha de Carne', ingredients: ['Farinha de trigo', 'Carne moída', 'Tomate', 'Cebola', 'Limão'], price: 6.90, stock: 40, image: 'https://assets.tmecosys.com/image/upload/t_web_rdp_recipe_584x480/img/recipe/ras/Assets/a50c22e8-916d-4e5c-8848-97bc99263dac/Derivates/2fcfad3e-2365-46bd-93d1-1bc5c754375d.jpg' },
          { id: 'S8', category: 'Salgado', name: 'Enroladinho de Salsicha', ingredients: ['Farinha de trigo', 'Salsicha', 'Leite', 'Ovo', 'Margarina'], price: 6.50, stock: 35, image: 'https://www.tiaeliana.com.br/wp-content/uploads/2021/03/ENROLADINHO-DE-SALSICHA-2.jpg' },
          { id: 'S9', category: 'Salgado', name: 'Pão de Batata', ingredients: ['Farinha de trigo', 'Batata', 'Catupiry', 'Leite', 'Manteiga'], price: 7.90, stock: 22, image: 'https://www.sabornamesa.com.br/media/k2/items/cache/5b28f48ced011fc04be950095172835a_XL.jpg' },
          { id: 'S10', category: 'Salgado', name: 'Bauruzinho', ingredients: ['Farinha de trigo', 'Presunto', 'Queijo Muçarela', 'Tomate', 'Orégano'], price: 7.00, stock: 28, image: 'https://panattos.com.br/uploads/produtos/2017/07/bauruzinho-chines-massa-congelada.jpg' },
          { id: 'S11', category: 'Salgado', name: 'Pão Italiano', ingredients: ['Farinha de trigo', 'Água', 'Azeite', 'Sal', 'Fermento natural'], price: 18.00, stock: 10, image: 'https://img.almanaqueculinario.com.br/receitas/28/42/pao-italiano-caseiro.jpg' },
          { id: 'S12', category: 'Salgado', name: 'Ciabatta', ingredients: ['Farinha de trigo', 'Água', 'Azeite', 'Sal', 'Levedura'], price: 9.90, stock: 15, image: 'https://www.comidaereceitas.com.br/wp-content/uploads/2014/02/Ciabatta-pao-branco-italiano1.jpg' },
          { id: 'S13', category: 'Salgado', name: 'Pão de Alho', ingredients: ['Farinha de trigo', 'Alho', 'Manteiga', 'Parmesão', 'Salsa'], price: 8.50, stock: 20, image: 'https://d1uz88p17r663j.cloudfront.net/original/a20218353f2de0eadd54742d5efe1399_pao-alho-receitas-nestle.jpg' },
          { id: 'S15', category: 'Salgado', name: 'Empanada de Milho', ingredients: ['Farinha de milho', 'Manteiga', 'Milho verde', 'Queijo', 'Cebola'], price: 8.90, stock: 18, image: 'https://media.istockphoto.com/id/157579564/pt/foto/tr%C3%AAs-empanadas.jpg?s=612x612&w=0&k=20&c=Vt7yTkKv4EYqx7jWfMYACIaARenK_Gu9NbGEIItUYVk=' },
        
          // 15 Doces
          { id: 'D1', category: 'Doce', name: 'Sonho de Creme', ingredients: ['Farinha de trigo', 'Açúcar', 'Creme de confeiteiro', 'Leite', 'Ovo'], price: 7.50, stock: 30, image: 'https://lirp.cdn-website.com/33406c6e/dms3rep/multi/opt/Untitled-1-640w.jpg' },
          { id: 'D2', category: 'Doce', name: 'Brigadeiro Gourmet', ingredients: ['Leite condensado', 'Chocolate em pó 50%', 'Manteiga', 'Granulado'], price: 4.50, stock: 60, image: 'https://confeitarparavender.com.br/wp-content/uploads/2025/08/O-que-e-brigadeiro-gourmet.jpg' },
          { id: 'D3', category: 'Doce', name: 'Bolo de Cenoura com Chocolate', ingredients: ['Cenoura', 'Farinha de trigo', 'Açúcar', 'Óleo', 'Chocolate'], price: 12.00, stock: 12, image: 'https://i.ytimg.com/vi/bdRct-Wad8g/maxresdefault.jpg' },
          { id: 'D4', category: 'Doce', name: 'Pudim de Leite', ingredients: ['Leite condensado', 'Leite', 'Ovo', 'Açúcar'], price: 15.00, stock: 8, image: 'https://www.mococa.com.br/wp-content/uploads/2022/03/Pudim-de-leite.jpeg' },
          { id: 'D5', category: 'Doce', name: 'Torta de Limão', ingredients: ['Biscoito maisena', 'Leite condensado', 'Limão', 'Creme de leite', 'Manteiga'], price: 14.90, stock: 10, image: 'https://img.band.com.br/image/2023/05/29/torta-de-limao-184350.jpg' },
          { id: 'D6', category: 'Doce', name: 'Brownie de Chocolate', ingredients: ['Chocolate meio amargo', 'Açúcar', 'Manteiga', 'Farinha de trigo', 'Nozes'], price: 11.50, stock: 25, image: 'https://www.estadao.com.br/resizer/v2/AVCDNFW4ERIQBBMXF33MLHKNSU.jpg?quality=80&auth=b4945d0bbe684c6919218d0cb630195728f9e49a11a19ae82d0aaa5b1378b7c9&width=1200' },
          { id: 'D7', category: 'Doce', name: 'Mil-folhas', ingredients: ['Massa folhada', 'Creme de confeiteiro', 'Açúcar de confeiteiro', 'Extrato de baunilha'], price: 16.50, stock: 15, image: 'https://storage.googleapis.com/imagens_videos_gou_cooking_prod/production/mesas/2019/12/6ff8bbbd-mil-folhas-_-tm-folhados-_-lu-neves-_-6743-baixa-2.jpg' },
          { id: 'D8', category: 'Doce', name: 'Donut Glaceado', ingredients: ['Farinha de trigo', 'Açúcar', 'Manteiga', 'Leite', 'Fermento'], price: 8.00, stock: 40, image: 'https://media-cdn.tripadvisor.com/media/photo-s/1a/cb/84/25/donuts-glaceado.jpg' },
          { id: 'D9', category: 'Doce', name: 'Bolo Red Velvet', ingredients: ['Farinha de trigo', 'Cacau', 'Buttermilk', 'Corante vermelho', 'Cream cheese'], price: 18.00, stock: 8, image: 'https://www.guiadasemana.com.br/contentFiles/image/2018/08/FEA/galeria/57665_w840h525_1534185215shutterstock-528774664.jpg' },
          { id: 'D10', category: 'Doce', name: 'Macaron de Pistache', ingredients: ['Farinha de amêndoa', 'Açúcar', 'Clara de ovo', 'Pistache'], price: 9.00, stock: 35, image: 'https://chefsandromartins.com/wp-content/uploads/2014/07/macarons-al-pistacchio-2.jpg' },
          { id: 'D11', category: 'Doce', name: 'Bomba de Chocolate', ingredients: ['Massa choux', 'Creme de confeiteiro', 'Chocolate meio amargo'], price: 13.50, stock: 18, image: 'https://anamariabrogui.com.br/assets/uploads/receitas/fotos/usuario-3000-b90b64231b4fb5ea6174a4dfc5b55f56.jpg' },
          { id: 'D12', category: 'Doce', name: 'Cookie com Gotas de Chocolate', ingredients: ['Farinha de trigo', 'Açúcar mascavo', 'Manteiga', 'Gotas de chocolate', 'Ovo'], price: 7.90, stock: 45, image: 'https://www.comidaereceitas.com.br/wp-content/uploads/2020/05/cookie_chocolate_leite.jpg' },
          { id: 'D13', category: 'Doce', name: 'Quindim', ingredients: ['Gema de ovo', 'Açúcar', 'Coco ralado', 'Manteiga'], price: 8.50, stock: 20, image: 'https://guiadacozinha.com.br/wp-content/uploads/2019/11/quindim-de-padaria.jpg' },
          { id: 'D14', category: 'Doce', name: 'Torta de Morango', ingredients: ['Farinha de trigo', 'Morangos', 'Creme de confeiteiro', 'Geleia de brilho'], price: 16.90, stock: 12, image: 'https://www.sabornamesa.com.br/media/k2/items/cache/d4ece76a0fc75091c09eca5036691827_XL.jpg' },
          { id: 'D15', category: 'Doce', name: 'Cheesecake de Frutas Vermelhas', ingredients: ['Cream cheese', 'Açúcar', 'Biscoito', 'Manteiga', 'Frutas vermelhas'], price: 19.90, stock: 10, image: 'https://s2-receitas.glbimg.com/54KiQVGas8DCIiwYqclaakNc1O4=/0x0:1366x768/600x0/smart/filters:gifv():strip_icc()/i.s3.glbimg.com/v1/AUTH_1f540e0b94d8437dbbc39d567a1dee68/internal_photos/bs/2025/3/r/h8urvgQPO8vv1nWSPy3A/cheesecake-de-frutas-vermelhas.jpg' },
        
          // 5 Bebidas
          { id: 'B1', category: 'Bebida', name: 'Café Expresso', ingredients: ['Grãos de café selecionados', 'Água'], price: 6.00, stock: 999, image: 'https://static.itdg.com.br/images/1200-675/b7b7e976d94a0f0bee8a7ed64baef971/shutterstock-529515136.jpg' },
          { id: 'B2', category: 'Bebida', name: 'Cappuccino', ingredients: ['Café expresso', 'Leite vaporizado', 'Espuma de leite', 'Chocolate em pó'], price: 11.50, stock: 999, image: 'https://www.thespruceeats.com/thmb/oUxhx54zsjVWfPlrgedJU0MZ-y0=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/how-to-make-cappuccinos-766116-hero-01-a754d567739b4ee0b209305138ecb996.jpg' },
          { id: 'B3', category: 'Bebida', name: 'Suco de Laranja Natural', ingredients: ['Laranja pera'], price: 10.00, stock: 50, image: 'https://i.pinimg.com/736x/3c/f4/93/3cf4934a1808a643e4ae617d4df470fc.jpg' },
          { id: 'B4', category: 'Bebida', name: 'Chocolate Quente', ingredients: ['Leite integral', 'Chocolate 50%', 'Creme de leite'], price: 14.00, stock: 999, image: 'https://static.itdg.com.br/images/640-400/c917c8b8756e11e760db1cb81e1b8250/321194-original.jpg' },
          { id: 'B5', category: 'Bebida', name: 'Chá Gelado de Pêssego', ingredients: ['Chá preto', 'Pêssego', 'Açúcar', 'Gelo'], price: 9.50, stock: 40, image: 'https://m.media-amazon.com/images/I/81Gj6VqdymL._AC_UF350,350_QL80_.jpg' }
        ];

        const insertProd = db.prepare(`INSERT INTO products (id, category, name, ingredients, price, stock, image) VALUES (?, ?, ?, ?, ?, ?, ?)`);
        inventoryData.forEach(p => {
          insertProd.run(p.id, p.category, p.name, JSON.stringify(p.ingredients), p.price, p.stock, p.image);
        });
        insertProd.finalize();
      }
    });
  });
}

module.exports = db;
