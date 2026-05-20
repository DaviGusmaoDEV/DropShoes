// ==========================================================================
// 🛒 CONFIGURAÇÕES GERAIS
// ==========================================================================
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : 'https://dropshoes-repd.onrender.com';

let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
let freteValor = 0;
let usuarioLogado = JSON.parse(localStorage.getItem('usuario')) || null;

// ==========================================================================
// 🎬 INICIALIZAÇÃO
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    inicializarAuth();
    if (document.getElementById('lista-produtos')) carregarProdutos();
    if (document.getElementById('itens-carrinho')) atualizarCarrinho();
    if (document.getElementById('lista-pedidos')) carregarMeusPedidos();
});

// ==========================================================================
// 👤 AUTENTICAÇÃO E ADMIN
// ==========================================================================
function inicializarAuth() {
    const btnAuth = document.getElementById('btn-auth');
    if (!btnAuth) return;

    if (usuarioLogado) {
        btnAuth.innerText = `Olá, ${usuarioLogado.nome ? usuarioLogado.nome.split(' ')[0] : 'Usuário'} (Sair)`;
        btnAuth.onclick = (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = 'index.html';
        };

        // Correção: Injeção do botão Admin de forma robusta
        if (usuarioLogado.role === 'admin') {
            const nav = btnAuth.parentElement;
            if (nav && !document.getElementById('btn-admin-panel')) {
                const adminLink = document.createElement('a');
                adminLink.id = 'btn-admin-panel';
                adminLink.href = 'admin.html';
                adminLink.innerText = '⚙️ Painel Admin';
                adminLink.style.marginRight = '15px';
                adminLink.style.fontWeight = 'bold';
                nav.insertBefore(adminLink, btnAuth);
            }
        }
    }
}

// ... (Restante das funções: cadastrarUsuario, fazerLogin, carregarProdutos, etc.)
async function cadastrarUsuario(e) {
    e.preventDefault();
    const nome = document.getElementById('nome').value;
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;

    try {
        const res = await fetch(`${API_BASE}/api/cadastro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha })
        });
        const data = await res.json();
        if (res.ok) {
            alert("Cadastro realizado! Faça login.");
            window.location.href = 'login.html';
        } else {
            alert(data.erro);
        }
    } catch (err) { alert("Erro ao conectar no servidor."); }
}

async function fazerLogin(e) {
    if (e) e.preventDefault();
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;

    try {
        const res = await fetch(`${API_BASE}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('usuario', JSON.stringify(data));
            window.location.href = 'index.html';
        } else {
            alert(data.erro || 'Login falhou.');
        }
    } catch (err) { alert("Erro de conexão."); }
}

// ==========================================================================
// 📦 PEDIDOS DO CLIENTE
// ==========================================================================
async function carregarMeusPedidos() {
    if (!usuarioLogado) return;
    try {
        const res = await fetch(`${API_BASE}/api/meus-pedidos/${usuarioLogado.email}`);
        const pedidos = await res.json();
        const container = document.getElementById('lista-pedidos');
        
        if (pedidos.length === 0) {
            container.innerHTML = "<p>Nenhum pedido encontrado.</p>";
            return;
        }

        container.innerHTML = pedidos.map(p => `
            <div class="pedido-card">
                <p>Pedido #${p.id}</p>
                <p>Data: ${new Date(p.data).toLocaleDateString()}</p>
                <p>Total: R$ ${p.total.toFixed(2)}</p>
            </div>
        `).join('');
    } catch (err) { console.error("Erro ao buscar pedidos:", err); }
}

// ==========================================================================
// 🛒 CARRINHO E PAGAMENTO
// ==========================================================================
function salvarNoCarrinho(id, nome, preco, tamanho = "U", qtd = 1) {
    const itemExistente = carrinho.find(i => i.id === id && i.tamanho === tamanho);
    if (itemExistente) { itemExistente.qtd += qtd; } 
    else { carrinho.push({ id, nome, preco: Number(preco), tamanho, qtd }); }
    localStorage.setItem('carrinho', JSON.stringify(carrinho));
    window.location.href = 'carrinho.html';
}

function adicionarAoCarrinho(id, nome, preco) {
    const tam = document.getElementById(`tam-${id}`)?.value || "U";
    salvarNoCarrinho(id, nome, preco, tam);
}

function atualizarCarrinho() {
    const container = document.getElementById('itens-carrinho');
    if (!container) return;
    
    let subtotal = 0;
    container.innerHTML = carrinho.map((item, index) => {
        subtotal += item.preco * item.qtd;
        return `
            <div class="item-carrinho">
                <h4>${item.nome} (x${item.qtd})</h4>
                <p>Tamanho: ${item.tamanho}</p>
                <b>R$ ${(item.preco * item.qtd).toFixed(2)}</b>
                <button onclick="removerDoCarrinho(${index})">Remover</button>
            </div>`;
    }).join('');
    
    if (document.getElementById('subtotal-val')) 
        document.getElementById('subtotal-val').innerText = `R$ ${subtotal.toFixed(2)}`;
}

function removerDoCarrinho(index) {
    carrinho.splice(index, 1);
    localStorage.setItem('carrinho', JSON.stringify(carrinho));
    atualizarCarrinho();
}

async function irParaPagamento() {
    if (carrinho.length === 0) return alert('Carrinho vazio!');
    if (!usuarioLogado) return window.location.href = 'login.html';
    
    try {
        const res = await fetch(`${API_BASE}/api/checkout`, { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({ 
                itens: carrinho, 
                frete: freteValor, 
                email: usuarioLogado.email 
            }) 
        });
        const dados = await res.json();
        if (dados.url) window.location.href = dados.url;
    } catch (err) { alert("Erro ao processar pagamento."); }
}