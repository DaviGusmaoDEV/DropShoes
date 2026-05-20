const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // IMPORTANTE: Adicione esta linha no topo
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// --- SERVIR ARQUIVOS ESTÁTICOS ---
// Isso diz ao Node: "Tudo que estiver na pasta 'public', entregue como site"
app.use(express.static(path.join(__dirname, 'public')));

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

// --- ROTAS DE API ---

app.post('/api/cadastro', async (req, res) => {
    try {
        const { nome, email, senha } = req.body;
        const cleanEmail = email.toLowerCase().trim();
        const cleanSenha = senha.trim();

        const userExistente = await User.findOne({ email: cleanEmail });
        if (userExistente) return res.status(400).json({ erro: "E-mail já cadastrado!" });

        const novoUser = new User({ nome, email: cleanEmail, senha: cleanSenha, role: 'cliente' });
        await novoUser.save();
        console.log(`✅ Novo usuário cadastrado: ${cleanEmail}`);
        res.status(201).json({ message: "Cadastro realizado com sucesso!" });
    } catch (err) { 
        res.status(500).json({ erro: "Erro ao realizar cadastro." }); 
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim(), senha: senha.trim() });
        if (!user) return res.status(401).json({ erro: 'Usuário ou senha incorretos.' });
        res.json({ email: user.email, role: user.role, nome: user.nome });
    } catch (err) { res.status(500).json({ erro: "Erro interno." }); }
});

app.get('/api/produtos', async (req, res) => {
    try {
        const produtos = await Produto.find().lean();
        res.json(produtos);
    } catch (err) { res.status(500).json({ erro: "Erro ao buscar produtos." }); }
});

app.get('/api/meus-pedidos/:email', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email.toLowerCase().trim() });
        res.json(user ? user.pedidos : []);
    } catch (err) { res.status(500).json({ erro: "Erro ao buscar pedidos." }); }
});

app.post('/api/checkout', async (req, res) => {
    const { itens, frete, email } = req.body;
    try {
        const total = itens.reduce((acc, i) => acc + (i.preco * (i.qtd || 1)), 0) + (frete || 0);
        await User.updateOne({ email: email.toLowerCase().trim() }, { $push: { pedidos: { id: `PED-${Date.now()}`, itens, data: new Date().toISOString(), total } } });
        res.json({ success: true, url: "https://stripe.com/checkout/sucesso" });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- ROTA PARA O FRONTEND ---
// Garante que o index.html seja servido para qualquer rota que não seja /api
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));