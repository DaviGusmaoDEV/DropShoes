const express = require('express');
const fs = require('fs'); // Módulo para ler e salvar arquivos locais
require('dotenv').config(); // Carrega o .env antes de tudo

// Inicializa o Stripe com uma proteção caso a chave não exista no .env
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key_se_nao_existir_env';
const stripe = require('stripe')(stripeKey);

const { google } = require('googleapis');
const multer = require('multer');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Configuração do Multer para Upload de Fotos dos Tênis
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, 'tenis-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// 📁 BANCO DE DADOS EM ARQUIVO LOCAL (Evita que os produtos sumam ao reiniciar)
let produtos = [];
if (fs.existsSync('produtos.json')) {
    try {
        produtos = JSON.parse(fs.readFileSync('produtos.json', 'utf-8'));
    } catch (err) {
        console.error("Erro ao ler o arquivo produtos.json, iniciando lista vazia.", err);
        produtos = [];
    }
}

let usuarios = [
    { email: 'admin@dropshoes.com', senha: 'admin123', role: 'admin' },
    { email: 'cliente@gmail.com', senha: 'user123', role: 'cliente' }
];

// --- INTEGRAÇÃO GOOGLE SHEETS ---
async function salvarPedidoNoSheets(pedido) {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: 'credentials.json',
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        
        const client = await auth.getClient();
        const googleSheets = google.sheets({ version: 'v4', auth: client });
        const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

        if (!spreadsheetId) {
            console.log('⚠️ GOOGLE_SHEETS_ID não configurado no arquivo .env');
            return;
        }

        await googleSheets.spreadsheets.values.append({
            auth: client,
            spreadsheetId,
            range: 'Engenharia de Pedidos!A:E',
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[pedido.id, pedido.cliente, pedido.produto, pedido.total, 'Pago']],
            },
        });
        console.log('🚀 Pedido salvo no Google Sheets com sucesso!');
    } catch (error) {
        console.error('Erro ao salvar no Google Sheets:', error);
    }
}

// --- ROTAS DE AUTENTICAÇÃO ---
app.post('/api/login', (req, res) => {
    const { email, senha } = req.body;

    console.log("Tentativa de login recebida no servidor:");
    console.log(`E-mail digitado: ->${email}<-`);
    console.log(`Senha digitada:  ->${senha}<-`);

    const usuarioEncontrado = usuarios.find(u => u.email === email && u.senha === senha);

    if (usuarioEncontrado) {
        console.log(`✅ Login aceito para: ${email} (${usuarioEncontrado.role})`);
        res.json({ email: usuarioEncontrado.email, role: usuarioEncontrado.role });
    } else {
        console.log(`❌ Login recusado: Dados não batem com nenhum usuário.`);
        res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
    }
});

// --- ROTAS DO ADMIN (PRODUTOS) ---
app.post('/api/produtos', upload.single('foto'), (req, res) => {
    try {
        const { nome, preco, tamanhos } = req.body;
        
        const novoTenis = {
            id: Date.now(),
            nome,
            preco: parseFloat(preco) || 0,
            tamanhos: tamanhos ? tamanhos.split(',').map(t => t.trim()) : [], 
            foto: req.file ? `/uploads/${req.file.filename}` : ''
        };

        produtos.push(novoTenis);

        // Salva as alterações fisicamente no arquivo produtos.json
        fs.writeFileSync('produtos.json', JSON.stringify(produtos, null, 2));
        console.log(`👟 Novo produto cadastrado: ${nome}`);

        res.status(201).json(novoTenis);
    } catch (error) {
        console.error("Erro ao cadastrar produto:", error);
        res.status(500).json({ error: "Erro interno ao cadastrar o produto." });
    }
});

app.get('/api/produtos', (req, res) => {
    res.json(produtos);
});

// --- ROTA DE CÁLCULO DE FRETE ---
app.post('/api/frete', (req, res) => {
    const { cepDestino, tipoEnvio } = req.body;
    
    if (!cepDestino || cepDestino.length < 8) {
        return res.status(400).json({ error: 'CEP Inválido' });
    }

    let valorFrete = tipoEnvio === 'sedex' ? 35.00 : 18.50;
    let prazo = tipoEnvio === 'sedex' ? '2 a 4 dias úteis' : '7 a 12 dias úteis';

    res.json({ valor: valorFrete, prazo: prazo });
});

// --- ROTA DO STRIPE (CHECKOUT) ---
app.post('/api/checkout', async (req, res) => {
    const { itens, frete, clienteEmail } = req.body;

    try {
        if (!itens || itens.length === 0) {
            return res.status(400).json({ error: "O carrinho está vazio." });
        }

        const lineItems = itens.map(item => ({
            price_data: {
                currency: 'brl',
                product_data: { name: `${item.nome} (Tam: ${item.tamanho})` },
                unit_amount: Math.round(item.preco * 100),
            },
            quantity: item.qtd || 1,
        }));

        // Só adiciona a linha de frete se o valor for maior que zero
        if (frete > 0) {
            lineItems.push({
                price_data: {
                    currency: 'brl',
                    product_data: { name: 'Taxa de Entrega (Florianópolis -> Destino)' },
                    unit_amount: Math.round(frete * 100),
                },
                quantity: 1,
            });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card', 'pix'],
            line_items: lineItems,
            mode: 'payment',
            success_url: 'http://localhost:3000/sucesso.html',
            cancel_url: 'http://localhost:3000/cancelado.html',
        });

        // 🔥 CORRIGIDO: Agora calcula levando em conta a quantidade (item.preco * item.qtd)
        const totalPedido = itens.reduce((acc, i) => acc + (i.preco * (i.qtd || 1)), 0) + (frete || 0);

        await salvarPedidoNoSheets({
            id: session.id.substring(0, 10),
            cliente: clienteEmail || 'Cliente Anônimo',
            produto: itens.map(i => `${i.nome} x${i.qtd || 1}`).join(', '),
            total: totalPedido.toFixed(2)
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error("Erro no checkout:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => console.log('🚀 DropShoes rodando na porta 3000'));