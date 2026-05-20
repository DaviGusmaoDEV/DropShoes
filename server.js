const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// --- MODELOS ---
const User = mongoose.model('User', new mongoose.Schema({
    nome: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    senha: { type: String, required: true, trim: true },
    role: { type: String, default: 'cliente' },
    pedidos: { type: Array, default: [] }
}));

const Produto = mongoose.model('Produto', new mongoose.Schema({
    nome: String,
    preco: Number,
    tamanhos: [String],
    foto: String
}));

// Conexão com MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Conectado ao MongoDB Atlas'))
  .catch(err => {
      console.error('❌ Erro na conexão MongoDB:', err);
      process.exit(1);
  });

// --- ROTAS ---

// CADASTRO
// CADASTRO
app.post('/api/cadastro', async (req, res) => {
    try {
        const { nome, email, senha } = req.body;
        const cleanEmail = email.toLowerCase().trim();
        const cleanSenha = senha.trim();

        const userExistente = await User.findOne({ email: cleanEmail });
        if (userExistente) return res.status(400).json({ erro: "E-mail já cadastrado!" });

        const novoUser = new User({ nome, email: cleanEmail, senha: cleanSenha, role: 'cliente' });
        await novoUser.save();
        
        // --- LOG QUE APARECERÁ NO RENDER ---
        console.log(`✅ Novo usuário cadastrado com sucesso: ${cleanEmail}`);
        
        res.status(201).json({ message: "Cadastro realizado com sucesso!" });
    } catch (err) { 
        console.error("❌ Erro no servidor durante cadastro:", err);
        res.status(500).json({ erro: "Erro ao realizar cadastro." }); 
    }
});

// LOGIN
app.post('/api/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        const cleanEmail = email.toLowerCase().trim();
        const cleanSenha = senha.trim();

        const user = await User.findOne({ email: cleanEmail, senha: cleanSenha });
        if (!user) return res.status(401).json({ erro: 'Usuário ou senha incorretos.' });
        
        res.json({ email: user.email, role: user.role, nome: user.nome });
    } catch (err) { res.status(500).json({ erro: "Erro interno no servidor." }); }
});

// LISTAR PRODUTOS
app.get('/api/produtos', async (req, res) => {
    try {
        const produtos = await Produto.find().lean();
        res.json(produtos);
    } catch (err) { res.status(500).json({ erro: "Erro ao buscar produtos." }); }
});

// MEUS PEDIDOS
app.get('/api/meus-pedidos/:email', async (req, res) => {
    try {
        const cleanEmail = req.params.email.toLowerCase().trim();
        const user = await User.findOne({ email: cleanEmail });
        res.json(user ? user.pedidos : []);
    } catch (err) { res.status(500).json({ erro: "Erro ao buscar pedidos." }); }
});

// CHECKOUT
app.post('/api/checkout', async (req, res) => {
    const { itens, frete, email } = req.body;
    try {
        const cleanEmail = email.toLowerCase().trim();
        const total = itens.reduce((acc, i) => acc + (i.preco * (i.qtd || 1)), 0) + (frete || 0);
        
        const novoPedido = { 
            id: `PED-${Date.now()}`, 
            itens, 
            data: new Date().toISOString(),
            total
        };
        
        await User.updateOne({ email: cleanEmail }, { $push: { pedidos: novoPedido } });
        res.json({ success: true, url: "https://stripe.com/checkout/sucesso" });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));