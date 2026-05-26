const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { MercadoPagoConfig, Preference } = require('mercadopago');
require('dotenv').config();

const app = express();

// ==========================================================================
// 📂 UPLOADS
// ==========================================================================
const uploadDir = path.join(__dirname, 'public/uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage });

// ==========================================================================
// 🌍 MIDDLEWARES
// ==========================================================================
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

// ==========================================================================
// 💳 MERCADO PAGO
// ==========================================================================
const mpClient = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN
});

// ==========================================================================
// 📦 MODELOS
// ==========================================================================
const User = mongoose.model('User', new mongoose.Schema({
    nome: String,
    email: { type: String, unique: true },
    senha: String,
    role: {
        type: String,
        default: 'cliente'
    }
}));

const Produto = mongoose.model('Produto', new mongoose.Schema({
    nome: String,
    preco: Number,
    tamanhos: [String],
    foto: String
}));

// ==========================================================================
// 👑 ADMIN PADRÃO
// ==========================================================================
async function criarAdminPadrao() {
    try {
        const adminExiste = await User.findOne({
            email: 'admin@dropshoes.com'
        });

        if (!adminExiste) {
            await User.create({
                nome: 'Administrador',
                email: 'admin@dropshoes.com',
                senha: '123456',
                role: 'admin'
            });

            console.log('✅ Admin padrão criado');
        }

    } catch (err) {
        console.error(err);
    }
}

// ==========================================================================
// 📝 REGISTRO
// ==========================================================================
app.post('/api/registro', async (req, res) => {

    try {

        const { nome, email, senha } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({
                erro: 'Todos os campos são obrigatórios.'
            });
        }

        const emailFormatado = email.toLowerCase().trim();

        const existe = await User.findOne({
            email: emailFormatado
        });

        if (existe) {
            return res.status(400).json({
                erro: 'Email já cadastrado.'
            });
        }

        const novoUsuario = new User({
            nome,
            email: emailFormatado,
            senha,
            role: 'cliente'
        });

        await novoUsuario.save();

        res.status(201).json({
            mensagem: 'Usuário criado com sucesso.'
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            erro: 'Erro ao cadastrar usuário.'
        });
    }
});

// ==========================================================================
// 🔐 LOGIN
// ==========================================================================
app.post('/api/login', async (req, res) => {

    try {

        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({
                erro: 'Email e senha obrigatórios.'
            });
        }

        const usuario = await User.findOne({
            email: email.toLowerCase().trim()
        });

        if (!usuario) {
            return res.status(401).json({
                erro: 'Usuário não encontrado.'
            });
        }

        if (usuario.senha !== senha.trim()) {
            return res.status(401).json({
                erro: 'Senha incorreta.'
            });
        }

        return res.json({
            _id: usuario._id,
            nome: usuario.nome,
            email: usuario.email,
            role: usuario.role
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            erro: 'Erro no login.'
        });
    }
});

// ==========================================================================
// 📦 PRODUTOS
// ==========================================================================
app.post('/api/produtos', upload.single('foto'), async (req, res) => {

    try {

        const { nome, preco, tamanhos } = req.body;

        const foto = req.file
            ? `/uploads/${req.file.filename}`
            : '';

        const produto = new Produto({
            nome,
            preco: Number(preco),
            tamanhos: typeof tamanhos === 'string'
                ? tamanhos.split(',')
                : [],
            foto
        });

        await produto.save();

        res.status(201).json(produto);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            erro: 'Erro ao cadastrar produto.'
        });
    }
});

app.get('/api/produtos', async (req, res) => {

    try {

        const produtos = await Produto.find().lean();

        res.json(produtos);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            erro: 'Erro ao buscar produtos.'
        });
    }
});

app.put('/api/produtos/:id', upload.single('foto'), async (req, res) => {

    try {

        const { nome, preco, tamanhos } = req.body;

        const updateData = {
            nome,
            preco: Number(preco),
            tamanhos: typeof tamanhos === 'string'
                ? tamanhos.split(',')
                : []
        };

        if (req.file) {
            updateData.foto =
                `/uploads/${req.file.filename}`;
        }

        const atualizado =
            await Produto.findByIdAndUpdate(
                req.params.id,
                updateData,
                { new: true }
            );

        res.json(atualizado);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            erro: 'Erro ao atualizar produto.'
        });
    }
});

app.delete('/api/produtos/:id', async (req, res) => {

    try {

        await Produto.findByIdAndDelete(req.params.id);

        res.json({
            mensagem: 'Produto removido.'
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            erro: 'Erro ao remover produto.'
        });
    }
});

// ==========================================================================
// 💳 CHECKOUT
// ==========================================================================
app.post('/api/pagamentos/checkout', async (req, res) => {

    try {

        const { itens, frete } = req.body;

        if (!itens || itens.length === 0) {
            return res.status(400).json({
                erro: 'Carrinho vazio.'
            });
        }

        const itemsPreference = itens.map(item => ({
            id: String(item.id),
            title: item.nome,
            quantity: Number(item.qtd),
            unit_price: Number(item.preco),
            currency_id: 'BRL'
        }));

        if (frete > 0) {
            itemsPreference.push({
                id: 'frete',
                title: 'Frete',
                quantity: 1,
                unit_price: Number(frete),
                currency_id: 'BRL'
            });
        }

        const preference = new Preference(mpClient);

        const response = await preference.create({
            body: {
                items: itemsPreference,
                back_urls: {
                    success: 'https://dropshoes-repd.onrender.com',
                    failure: 'https://dropshoes-repd.onrender.com/carrinho.html',
                    pending: 'https://dropshoes-repd.onrender.com/carrinho.html'
                },
                auto_return: 'approved'
            }
        });

        res.json({
            init_point: response.init_point
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            erro: 'Erro ao gerar checkout.'
        });
    }
});

// ==========================================================================
// 🌍 ROTA CORINGA
// ==========================================================================
app.get('*', (req, res) => {

    if (req.path.startsWith('/api')) {
        return res.status(404).json({
            erro: 'Rota API não encontrada.'
        });
    }

    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
// ==========================================================================
// 🚀 START SERVER
// ==========================================================================
mongoose.connect(process.env.MONGODB_URI)
.then(async () => {

    await criarAdminPadrao();

    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
        console.log(`🚀 Servidor rodando na porta ${PORT}`);
    });

})
.catch(err => {
    console.error('Erro MongoDB:', err);
});
