const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const app = express();

// --- CONFIGURAÇÃO ---
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir); }

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'public/uploads/'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.use(cors());
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    next();
});
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- MODELOS ---
const User = mongoose.model('User', new mongoose.Schema({
    nome: String,
    email: { type: String, required: true, unique: true },
    senha: { type: String, required: true },
    role: { type: String, default: 'cliente' }
}));

const Produto = mongoose.model('Produto', new mongoose.Schema({
    nome: String,
    preco: Number,
    tamanhos: [String],
    foto: String
}));

// --- ROTAS DE AUTH (O que faltava) ---
app.post('/api/login', async (req, res) => {
    console.log("Tentativa de login recebida para:", req.body.email);
    try {
        const { email, senha } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim(), senha: senha.trim() });
        
        if (!user) {
            console.log("Usuário não encontrado ou senha inválida");
            return res.status(401).json({ erro: 'Usuário ou senha incorretos.' });
        }
        
        res.json({ nome: user.nome, email: user.email, role: user.role });
    } catch (err) { 
        console.error("Erro na rota de login:", err);
        res.status(500).json({ erro: "Erro interno no servidor." }); 
    }
});

// --- ROTAS DE PRODUTOS ---
app.post('/api/produtos', upload.single('foto'), async (req, res) => {
    try {
        const { nome, preco, tamanhos } = req.body;
        const fotoUrl = req.file ? `/uploads/${req.file.filename}` : '';
        const novoProduto = new Produto({
            nome,
            preco: Number(preco),
            tamanhos: typeof tamanhos === 'string' ? tamanhos.split(',') : tamanhos,
            foto: fotoUrl
        });
        await novoProduto.save();
        res.status(201).json(novoProduto);
    } catch (err) { res.status(500).json({ erro: "Erro ao cadastrar." }); }
});

app.get('/api/produtos', async (req, res) => {
    const produtos = await Produto.find().lean();
    res.json(produtos);
});

app.delete('/api/produtos/:id', async (req, res) => {
    await Produto.findByIdAndDelete(req.params.id);
    res.json({ message: "Excluído" });
});

// --- ROTA CORINGA (Sempre por último) ---
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
      const PORT = process.env.PORT || 3000;
      app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
  })
  .catch(err => console.error('❌ Erro MongoDB:', err));