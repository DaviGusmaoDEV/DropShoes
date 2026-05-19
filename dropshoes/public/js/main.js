// ==========================================================================
// 🛒 ESTADO GLOBAL E CONFIGURAÇÕES
// ==========================================================================
const API_BASE = 'https://amaretto-diaphragm-calculate.ngrok-free.dev';
let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
let freteValor = 0;
let usuarioLogado = JSON.parse(localStorage.getItem('usuario')) || null;

// ==========================================================================
// 🎬 EVENTOS DE INICIALIZAÇÃO
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    inicializarAuth();

    // Roteamento interno baseado nos elementos da página
    if (document.getElementById('lista-produtos')) carregarProdutos();
    if (document.getElementById('itens-carrinho')) atualizarCarrinho();
    if (window.location.pathname.includes('detalhes.html')) carregarDetalhesProduto();
});

// ==========================================================================
// 👤 AUTENTICAÇÃO
// ==========================================================================
function inicializarAuth() {
    const btnAuth = document.getElementById('btn-auth') || document.getElementById('btn-login-modal');
    if (usuarioLogado && btnAuth) {
        btnAuth.innerText = `Olá, ${usuarioLogado.email.split('@')[0]} (Sair)`;
        btnAuth.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm("Deseja realmente sair da sua conta?")) {
                localStorage.removeItem('usuario');
                window.location.href = 'index.html';
            }
        });

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
            window.location.href = data.role === 'admin' ? 'admin.html' : 'index.html';
        } else {
            alert(data.erro || 'Login falhou.');
        }
    } catch (err) { alert("Erro de conexão com o servidor."); }
}

// ==========================================================================
// 🛍️ PRODUTOS E VITRINE
// ==========================================================================
async function carregarProdutos() {
    try {
        const res = await fetch(`${API_BASE}/api/produtos`);
        const produtos = await res.json();
        const container = document.getElementById('lista-produtos');
        if (!container) return;

        container.innerHTML = produtos.map(p => {
            let listaTamanhos = Array.isArray(p.tamanhos) ? p.tamanhos : (p.tamanhos ? p.tamanhos.split(',') : []);
            let opcoes = listaTamanhos.map(t => `<option value="${t.trim()}">${t.trim()}</option>`).join('');
            return `
                <div class="card-tenis">
                    <img src="${p.foto || 'https://via.placeholder.com/250'}" alt="${p.nome}">
                    <h3>${p.nome}</h3>
                    <div class="preco">R$ ${p.preco.toFixed(2)}</div>
                    <select class="form-control" id="tam-${p.id}" style="margin-bottom: 12px;">${opcoes}</select>
                    <button onclick="adicionarAoCarrinho(${p.id}, '${p.nome}', ${p.preco})" class="btn btn-dark">Adicionar</button>
                </div>
            `;
        }).join('');
    } catch (err) { console.error(err); }
}

async function carregarDetalhesProduto() {
    const params = new URLSearchParams(window.location.search);
    const prodId = params.get('id');
    const container = document.getElementById('detalhe-produto');
    if (!container) return;
    
    try {
        const res = await fetch(`${API_BASE}/api/produtos`);
        const produtos = await res.json();
        const p = produtos.find(item => item.id == prodId);

        if (p) {
            const listaTamanhos = Array.isArray(p.tamanhos) ? p.tamanhos : (p.tamanhos ? p.tamanhos.split(',') : []);
            let opcoes = listaTamanhos.map(t => `<option value="${t.trim()}">${t.trim()}</option>`).join('');
            container.innerHTML = `
                <div class="produto-detalhe-imagem"><img src="${p.foto}" alt="${p.nome}"></div>
                <div class="produto-detalhe-info">
                    <h1>${p.nome}</h1>
                    <div class="preco-grande">R$ ${Number(p.preco).toFixed(2)}</div>
                    <select id="tamanho-selecionado" class="form-control">${opcoes}</select>
                    <button class="btn btn-dark" onclick="adicionarDetalheAoCarrinho(${p.id}, '${p.nome}', ${p.preco})">Adicionar ao Carrinho</button>
                </div>
            `;
        }
    } catch (err) { console.error(err); }
}

// ==========================================================================
// 🛒 CARRINHO E PAGAMENTO
// ==========================================================================
function salvarNoCarrinho(id, nome, preco, tamanho = "U", qtd = 1) {
    let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
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

function adicionarDetalheAoCarrinho(id, nome, preco) {
    const tam = document.getElementById('tamanho-selecionado').value;
    salvarNoCarrinho(id, nome, preco, tam);
}

function atualizarCarrinho() {
    const container = document.getElementById('itens-carrinho');
    if (!container) return;
    container.innerHTML = '';
    let subtotal = 0;
    carrinho.forEach((item, index) => {
        subtotal += item.preco * item.qtd;
        container.innerHTML += `
            <div class="item-carrinho">
                <div><h4>${item.nome} (x${item.qtd})</h4><p>Tamanho: ${item.tamanho}</p></div>
                <div><b>R$ ${(item.preco * item.qtd).toFixed(2)}</b>
                <button class="btn-remover" onclick="removerDoCarrinho(${index})">Remover</button></div>
            </div>`;
    });
    if (document.getElementById('subtotal-val')) document.getElementById('subtotal-val').innerText = `R$ ${subtotal.toFixed(2)}`;
}

function removerDoCarrinho(index) {
    carrinho.splice(index, 1);
    localStorage.setItem('carrinho', JSON.stringify(carrinho));
    atualizarCarrinho();
}

async function calcularFrete() {
    const cep = document.getElementById('cep').value.replace(/\D/g, '');
    const res = await fetch(`${API_BASE}/api/frete`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ cepDestino: cep }) });
    const dados = await res.json();
    if (dados.valor) {
        freteValor = dados.valor;
        document.getElementById('valor-frete').innerText = freteValor.toFixed(2);
        atualizarCarrinho();
    }
}

async function irParaPagamento() {
    if (carrinho.length === 0) return alert('Carrinho vazio!');
    if (!usuarioLogado) return window.location.href = 'login.html';
    const res = await fetch(`${API_BASE}/api/checkout`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ itens: carrinho, frete: freteValor, email: usuarioLogado.email }) });
    const dados = await res.json();
    if (dados.url) window.location.href = dados.url;
}