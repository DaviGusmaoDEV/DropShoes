const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer'); // Necessário para processar arquivos
require('dotenv').config();
const fs = require('fs');
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir); }
const app = express();

// Configuração de armazenamento do Multer (salva na pasta 'public/uploads')
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

app.use(cors({
    origin: '*', // Ou coloque a URL do seu frontend em produção
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
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
  .catch(err => { console.error('❌ Erro na conexão MongoDB:', err); process.exit(1); });

// --- ROTAS ---
// Cadastro, Login, Meus Pedidos e Checkout permanecem iguais...

// ROTA CADASTRAR PRODUTO (Agora com upload de imagem)
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
    } catch (err) { res.status(500).json({ erro: "Erro ao cadastrar produto." }); }
});

app.get('/api/produtos', async (req, res) => {
    try {
        const produtos = await Produto.find().lean();
        res.json(produtos);
    } catch (err) { res.status(500).json({ erro: "Erro ao buscar produtos." }); }
});

app.delete('/api/produtos/:id', async (req, res) => {
    try {
        await Produto.findByIdAndDelete(req.params.id);
        res.json({ message: "Produto excluído com sucesso!" });
    } catch (err) { res.status(500).json({ erro: "Erro ao excluir." }); }
});

app.put('/api/produtos/:id', upload.single('foto'), async (req, res) => {
    try {
        const updateData = { ...req.body };
        if (req.file) updateData.foto = `/uploads/${req.file.filename}`;
        const atualizado = await Produto.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json(atualizado);
    } catch (err) { res.status(500).json({ erro: "Erro ao atualizar." }); }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));