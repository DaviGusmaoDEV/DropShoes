const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
// Importação do Mercado Pago SDK v2
const { MercadoPagoConfig, Preference } = require('mercadopago');
require('dotenv').config();

const app = express();

// --- CONFIGURAÇÃO DE UPLOADS ---
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

// --- MIDDLEWARES ---
app.use(cors());
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    next();
});
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- CONFIGURAÇÃO MERCADO PAGO ---
const mpClient = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN || 'APP_USR-TESTE-SEU-TOKEN-AQUI' 
});

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

// ==========================================================================
// 👤 ROTAS DE CADASTRO E AUTENTICAÇÃO
// ==========================================================================

// 🆕 NOVA ROTA: Cadastro de Usuário com Logs para o Render e Mongo
// ==========================================================================
// 🚀 ROTA DE REGISTRO COM LOGS EXPLICITOS PARA MONGODB E RENDER
// ==========================================================================
app.post('/api/registro', async (req, res) => {
    console.log("📢 [RENDER LOG] Tentativa de cadastro recebida para:", req.body.email);

    try {
        const { nome, email, senha } = req.body;

        if (!nome || !email || !senha) {
            console.log("⚠️ [RENDER LOG] Cadastro rejeitado: dados incompletos recebidos do front.");
            return res.status(400).json({ erro: "Todos os campos (nome, email e senha) são obrigatórios." });
        }

        const emailFormatado = email.toLowerCase().trim();

        // Valida duplicação no MongoDB Atlas
        const usuarioExistente = await User.findOne({ email: emailFormatado });
        if (usuarioExistente) {
            console.log(`⚠️ [RENDER LOG] Cadastro recusado: O email ${emailFormatado} já consta no banco.`);
            return res.status(400).json({ erro: "Este e-mail já está cadastrado." });
        }

        // Instancia o novo usuário no modelo do Mongoose
        const novoUsuario = new User({
            nome: nome.trim(),
            email: emailFormatado,
            senha: senha.trim(), // Nota: Em ambiente produtivo, recomenda-se encriptar com bcrypt
            role: 'cliente'
        });

        // Salva o registro no MongoDB
        await novoUsuario.save();

        // 🔥 LOGS EM TEMPO REAL PARA O CONSOLE DO RENDER
        console.log(`✅ [RENDER LOG] SUCESSO! Usuário criado com êxito.`);
        console.log(`💾 [MONGO DATA] Registro -> ID: ${novoUsuario._id} | Nome: ${novoUsuario.nome} | Email: ${novoUsuario.email}`);

        return res.status(201).json({ mensagem: "Usuário cadastrado com sucesso!" });

    } catch (err) {
        console.error("❌ [RENDER LOG] ERRO INTERNO NO BANCO DE DADOS:", err);
        return res.status(500).json({ erro: "Erro ao salvar usuário no banco de dados." });
    }
});
// ==========================================================================
// 📦 ROTAS DE PRODUTOS (CRUD Completo)
// ==========================================================================

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
    } catch (err) { 
        console.error("Erro ao cadastrar produto:", err);
        res.status(500).json({ erro: "Erro ao cadastrar." }); 
    }
});

app.get('/api/produtos', async (req, res) => {
    try {
        const produtos = await Produto.find().lean();
        res.json(produtos);
    } catch (err) {
        res.status(500).json({ erro: "Erro ao buscar produtos." });
    }
});

app.put('/api/produtos/:id', upload.single('foto'), async (req, res) => {
    try {
        const { nome, preco, tamanhos } = req.body;
        
        const updateData = {
            nome,
            preco: Number(preco),
            tamanhos: typeof tamanhos === 'string' ? tamanhos.split(',') : tamanhos
        };

        if (req.file) {
            updateData.foto = `/uploads/${req.file.filename}`;
        }

        const atualizado = await Produto.findByIdAndUpdate(
            req.params.id, 
            updateData, 
            { new: true }
        );

        if (!atualizado) return res.status(404).json({ erro: "Produto não encontrado." });

        res.json(atualizado);
    } catch (err) { 
        console.error("Erro ao atualizar produto:", err);
        res.status(500).json({ erro: "Erro ao atualizar produto no banco." }); 
    }
});

app.delete('/api/produtos/:id', async (req, res) => {
    try {
        const deletado = await Produto.findByIdAndDelete(req.params.id);
        if (!deletado) return res.status(404).json({ erro: "Produto não encontrado." });
        res.json({ message: "Produto excluído com sucesso!" });
    } catch (err) { 
        res.status(500).json({ erro: "Erro ao excluir." }); 
    }
});
// ==========================================================================
// 💳 ROTA DE PAGAMENTO (Mercado Pago - PRODUÇÃO REAL)
// ==========================================================================
app.post('/api/pagamentos/checkout', async (req, res) => {
    try {
        const { itens, frete } = req.body;

        if (!itens || itens.length === 0) {
            return res.status(400).json({ erro: "O carrinho está vazio." });
        }

        // 1. Mapeia os itens garantindo os tipos de dados que a API exige
        const itemsPreference = itens.map(item => {
            const precoBruto = parseFloat(item.preco);
            const precoTratado = isNaN(precoBruto) ? 10.00 : parseFloat(precoBruto.toFixed(2));
            const tituloTratado = String(item.nome || 'Tênis DropShoes').substring(0, 50);

            return {
                id: String(item.id || item._id || 'produto'),
                title: tituloTratado,
                quantity: parseInt(item.qtd) || 1,
                unit_price: precoTratado,
                currency_id: 'BRL'
            };
        });

        // 2. Adiciona o valor do frete se houver
        const freteBruto = parseFloat(frete);
        if (!isNaN(freteBruto) && freteBruto > 0) {
            itemsPreference.push({
                id: 'frete-entrega',
                title: 'Taxa de Entrega / Frete',
                quantity: 1,
                unit_price: parseFloat(freteBruto.toFixed(2)),
                currency_id: 'BRL'
            });
        }

        // Captura a URL de onde veio a requisição (localhost ou dropshoes-repd.onrender.com)
        let origin = req.headers.origin || 'http://localhost:3000';
        if (origin.endsWith('/')) { origin = origin.slice(0, -1); }

        console.log("🚀 Gerando link oficial de produção no Mercado Pago...");

        // 3. Cria a preferência de produção
        const preference = new Preference(mpClient);
        const response = await preference.create({
            body: {
                items: itemsPreference,
                // Em produção, NÃO enviamos e-mail de payer fixo falso. 
                // O próprio cliente vai digitar o e-mail dele na tela do Mercado Pago.
                back_urls: {
                    success: `${origin}/index.html`, // Volta para a página inicial ao aprovar
                    failure: `${origin}/carrinho.html`, // Volta para o carrinho se falhar
                    pending: `${origin}/carrinho.html`
                },
                // Em produção real, o 'approved' funciona perfeitamente para mandar o cliente de volta na hora
                auto_return: 'approved' 
            }
        });

        // 4. Captura o link de redirecionamento oficial
        let linkPagamento = response.init_point;
        let preferenceId = response.id;

        if (response.body) {
            linkPagamento = linkPagamento || response.body.init_point;
            preferenceId = preferenceId || response.body.id;
        }

        if (!linkPagamento) {
            console.error("⚠️ Falha ao obter init_point em produção:", response);
            return res.status(500).json({ erro: "O Mercado Pago não gerou o link de produção." });
        }

        console.log(`✅ Link de Produção criado! ID: ${preferenceId}`);

        return res.json({ 
            id: preferenceId, 
            init_point: linkPagamento 
        });

    } catch (err) {
        console.error("❌ ERRO CRÍTICO EM PRODUÇÃO NO MERCADO PAGO:", err.message || err);
        if (err.api_response) {
            console.error("🔍 DETALHES DO ERRO DA API:", JSON.stringify(err.api_response, null, 2));
        }
        return res.status(500).json({ erro: "Erro ao processar checkout em produção." });
    }
});

// --- ROTA CORINGA (Sempre por último) ---
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// --- INICIALIZAÇÃO DO BANCO E SERVIDOR ---
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
      const PORT = process.env.PORT || 3000;
      app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
  })
  .catch(err => console.error('❌ Erro MongoDB:', err));