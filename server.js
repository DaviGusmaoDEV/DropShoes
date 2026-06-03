const EfiPay = require('efi-node-sdk');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { spawn } = require('child_process'); 
require('dotenv').config();

const app = express();

// ==========================================================================
// 📂 UPLOADS & DIRETÓRIOS
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
// 🌍 MIDDLEWARES GERAIS
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
// 🏦 CONFIGURAÇÃO COMPLETA DA API PIX (EFÍ BANK)
// ==========================================================================
const efiConfig = {
    sandbox: false, 
    client_id: process.env.EFI_CLIENT_ID,
    client_secret: process.env.EFI_CLIENT_SECRET,
    certificate: path.join(__dirname, process.env.EFI_CERTIFICADO)
};

// ==========================================================================
// 📦 MODELOS DO BANCO DE DADOS (MONGOOSE)
// ==========================================================================
const User = mongoose.model('User', new mongoose.Schema({
    nome: String,
    email: { type: String, unique: true },
    senha: String,
    role: { type: String, default: 'cliente' }
}));

const Produto = mongoose.model('Produto', new mongoose.Schema({
    nome: String,
    preco: Number,
    tamanhos: [String],
    foto: String
}));

const Transacao = mongoose.model('Transacao', new mongoose.Schema({
    descricao: String,
    tipo: { type: String, enum: ['receita', 'despesa'] },
    valor: Number,
    data: { type: Date, default: Date.now },
    origem: { type: String, default: 'manual' } 
}));

// ==========================================================================
// 👑 SEEDER: ADMIN PADRÃO
// ==========================================================================
async function criarAdminPadrao() {
    try {
        const adminExiste = await User.findOne({ email: 'admin@dropshoes.com' });

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
        console.error('Erro ao criar admin padrão:', err);
    }
}

// ==========================================================================
// 🔐 SISTEMA DE AUTENTICAÇÃO (LOGIN & REGISTRO)
// ==========================================================================
app.post('/api/registro', async (req, res) => {
    try {
        const { nome, email, senha } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({ erro: 'Todos os campos são obrigatórios.' });
        }

        const emailFormatado = email.toLowerCase().trim();
        const existe = await User.findOne({ email: emailFormatado });

        if (existe) {
            return res.status(400).json({ erro: 'Email já cadastrado.' });
        }

        const novoUsuario = new User({
            nome,
            email: emailFormatado,
            senha,
            role: 'cliente'
        });

        await novoUsuario.save();
        res.status(201).json({ mensagem: 'Usuário criado com sucesso.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao cadastrar usuário.' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ erro: 'Email e senha obrigatórios.' });
        }

        const usuario = await User.findOne({ email: email.toLowerCase().trim() });

        if (!usuario) {
            return res.status(401).json({ erro: 'Usuário não encontrado.' });
        }

        if (usuario.senha !== senha.trim()) {
            return res.status(401).json({ erro: 'Senha incorreta.' });
        }

        return res.json({
            _id: usuario._id,
            nome: usuario.nome,
            email: usuario.email,
            role: usuario.role
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro no login.' });
    }
});

// ==========================================================================
// 📦 CRUD DE PRODUTOS
// ==========================================================================
app.post('/api/produtos', upload.single('foto'), async (req, res) => {
    try {
        const { nome, preco, tamanhos } = req.body;
        const foto = req.file ? `/uploads/${req.file.filename}` : '';

        const produto = new Produto({
            nome,
            preco: Number(preco),
            tamanhos: typeof tamanhos === 'string' ? tamanhos.split(',') : [],
            foto
        });

        await produto.save();
        res.status(201).json(produto);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao cadastrar produto.' });
    }
});

app.get('/api/produtos', async (req, res) => {
    try {
        const produtos = await Produto.find().lean();
        res.json(produtos);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar produtos.' });
    }
});

app.put('/api/produtos/:id', upload.single('foto'), async (req, res) => {
    try {
        const { nome, preco, tamanhos } = req.body;

        const updateData = {
            nome,
            preco: Number(preco),
            tamanhos: typeof tamanhos === 'string' ? tamanhos.split(',') : []
        };

        if (req.file) {
            updateData.foto = `/uploads/${req.file.filename}`;
        }

        const atualizado = await Produto.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json(atualizado);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao atualizar produto.' });
    }
});

app.delete('/api/produtos/:id', async (req, res) => {
    try {
        await Produto.findByIdAndDelete(req.params.id);
        res.json({ mensagem: 'Produto removido.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao remover produto.' });
    }
});

// ==========================================================================
// 💳 GATEWAY EFÍ PIX (CHECKOUT & WEBHOOK)
// ==========================================================================
app.post('/api/pagamentos/checkout', async (req, res) => {
    try {
        const { itens, frete } = req.body;

        if (!itens || itens.length === 0) {
            return res.status(400).json({ erro: 'Carrinho vazio.' });
        }

        let valorTotal = Number(frete || 0);
        itens.forEach(item => {
            valorTotal += Number(item.preco) * Number(item.qtd);
        });

        const bodyCob = {
            calendario: { expiracao: 3600 }, 
            valor: { original: valorTotal.toFixed(2) },
            chave: process.env.EFI_CHAVE_PIX, 
            solicitacaoPagador: 'Pedido Delicias Da Lucy'
        };

        const efipay = new EfiPay(efiConfig);
        const cobranca = await efipay.pixCreateImmediateCharge([], bodyCob);

        const paramsQr = { id: cobranca.loc.id };
        const qrCodeData = await efipay.pixGenerateQRCode(paramsQr);

        res.json({
            tipo: 'pix',
            codigoCopiaCola: qrCodeData.qrcode,       
            qrcodeImagem: qrCodeData.imagemQrcode,    
            txid: cobranca.txid,                      
            valor: valorTotal
        });

    } catch (err) {
        console.error('Erro no Checkout Efí:', err);
        res.status(500).json({ erro: 'Erro ao gerar o Pix na Efí.' });
    }
});

app.post('/api/pagamentos/webhook', async (req, res) => {
    try {
        const { pix } = req.body;

        if (pix && pix.length > 0) {
            for (const pagamento of pix) {
                const jaExiste = await Transacao.findOne({ descricao: new RegExp(pagamento.endToEndId, 'i') });
                
                if (!jaExiste) {
                    const transacaoAutomatica = new Transacao({
                        descricao: `Pedido Confirmado (Pix Efí) - ID: ${pagamento.endToEndId}`,
                        tipo: 'receita',
                        valor: Number(pagamento.valor),
                        data: new Date(pagamento.horario),
                        origem: 'pedido'
                    });

                    await transacaoAutomatica.save();
                    console.log(`💰 Sucesso: R$ ${pagamento.valor} adicionados ao fluxo de caixa via Efí!`);
                }
            }
        }

        res.status(200).send({ status: 'processado' });
    } catch (err) {
        console.error("Erro no processamento do Webhook da Efí:", err);
        res.sendStatus(500);
    }
});

// ==========================================================================
// 💸 FLUXO DE CAIXA (MANUAL)
// ==========================================================================
app.post('/api/fluxo-caixa/transacoes', async (req, res) => {
    try {
        const { descricao, tipo, valor, data } = req.body;

        if (!descricao || !tipo || !valor || !data) {
            return res.status(400).json({ erro: 'Todos os campos são obrigatórios.' });
        }

        const novaTransacao = new Transacao({
            descricao,
            tipo,
            valor: Number(valor),
            data: new Date(data),
            origem: 'manual'
        });

        await novaTransacao.save();
        res.status(201).json({ mensagem: 'Transação registrada com sucesso!', transacao: novaTransacao });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao salvar transação.' });
    }
});

app.get('/api/fluxo-caixa/transacoes', async (req, res) => {
    try {
        const transacoes = await Transacao.find().sort({ data: -1 }).lean();
        res.json(transacoes);
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao buscar transações.' });
    }
});

// ==========================================================================
// 📊 PONTE PYTHON (PROCESSAMENTO INTELIGENTE)
// ==========================================================================
app.post('/api/admin/processar-dados', async (req, res) => {
    try {
        const transacoesDoBanco = await Transacao.find().lean();

        const pythonProcess = spawn('python', [path.join(__dirname, 'geral.py')]);

        let pythonData = '';
        let pythonError = '';

        pythonProcess.stdin.write(JSON.stringify(transacoesDoBanco));
        pythonProcess.stdin.end();

        pythonProcess.stdout.on('data', (data) => {
            pythonData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            pythonError += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Erro no Python (Código ${code}):`, pythonError);
                return res.status(500).json({ 
                    erro: 'Erro interno ao processar dados com Python.',
                    detalhes: pythonError 
                });
            }

            try {
                const jsonRetorno = JSON.parse(pythonData);
                return res.json(jsonRetorno);
            } catch (parseErr) {
                return res.status(500).json({ 
                    erro: 'Python não retornou uma string JSON válida.',
                    saida_bruta: pythonData 
                });
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro na ponte de execução Node-Python.' });
    }
});

// ==========================================================================
// 🌍 ROTA CORINGA (DEVE SER SEMPRE A ÚLTIMA DAS ROTAS)
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
// 🚀 INICIALIZAÇÃO DO SERVIDOR & BANCO DE DADOS
// ==========================================================================
mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
    await criarAdminPadrao();

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🚀 Servidor rodando com sucesso na porta ${PORT}`);
    });
})
.catch(err => {
    console.error('Erro crítico ao conectar no MongoDB:', err);
});