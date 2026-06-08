require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');

const conectarDB = require('./config/db'); 
const { verificarToken, ehAdmin, temPermissao } = require('./middlewares/auth');
const User = require('./models/User'); 

const app = express();

// Configurações Globais (Definidas apenas uma vez)
app.use(helmet());
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());

// --- ROTAS ---

app.post('/api/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        if (!email || !senha) return res.status(400).json({ erro: 'Email e senha são obrigatórios.' });

        const usuario = await User.findOne({ email: email.toLowerCase().trim() });
        if (!usuario || usuario.senha !== senha.trim()) return res.status(401).json({ erro: 'Credenciais inválidas.' });

        const payload = { id: usuario._id, role: usuario.role, permissions: usuario.permissions || [] };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.json({ token, role: usuario.role, permissions: usuario.permissions || [] });
    } catch (err) {
        console.error('Erro no login:', err);
        res.status(500).json({ erro: 'Erro interno no servidor.' });
    }
});

// A ÚNICA rota de registro necessária
app.post('/api/register', async (req, res) => {
    console.log("Dados recebidos no Backend:", req.body); 
    try {
        const { nome, email, senha, role, telefone } = req.body;
        
        const novoUser = new User({ 
            nome, 
            email: email || null,
            senha: senha || null,
            role: role || 'cliente', 
            telefone 
        });
        
        await novoUser.save();
        res.status(201).json({ mensagem: "Conta criada com sucesso!" });
    } catch (err) {
        console.error("ERRO NO BANCO DE DADOS:", err); 
        res.status(500).json({ erro: "Erro ao cadastrar: " + err.message });
    }
});

// --- INICIALIZAÇÃO ---
conectarDB().then(() => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
}).catch(err => {
    console.error("Erro ao conectar ao banco de dados:", err);
});