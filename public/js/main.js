// ==========================================================================
// 🛒 CONFIGURAÇÕES GERAIS
// ==========================================================================
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : 'https://dropshoes-repd.onrender.com';

let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
let usuarioLogado = JSON.parse(localStorage.getItem('usuario')) || null;

// ==========================================================================
// 🎬 INICIALIZAÇÃO
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    // 1. Sempre inicializa a autenticação primeiro
    inicializarAuth();

    // 2. Carrega produtos baseado na página onde você está
    // Se a página tem o elemento 'lista-produtos', carrega a vitrine da loja
    if (document.getElementById('lista-produtos')) {
        carregarProdutosVitrine(); 
    }
    
    // Se a página tem a tabela do admin, carrega a gestão de produtos
    if (document.getElementById('tabela-admin-produtos')) {
        carregarProdutos(); 
    }

    // 3. Inicializa o carrinho se a página for a do carrinho
    if (document.getElementById('itens-carrinho')) {
        atualizarCarrinho();
    }
});

// ==========================================================================
// 👤 AUTENTICAÇÃO E ADMIN
// ==========================================================================
function inicializarAuth() {
    const btnAuth = document.getElementById('btn-auth');
    if (!btnAuth) return;

    if (usuarioLogado) {
        btnAuth.innerText = `Olá, ${usuarioLogado.nome?.split(' ')[0] || 'Usuário'} (Sair)`;
        btnAuth.onclick = (e) => { e.preventDefault(); localStorage.clear(); window.location.href = 'index.html'; };

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

// ==========================================================================
// 📦 PRODUTOS E ADMIN
// ==========================================================================
async function carregarProdutosVitrine() {
    const container = document.getElementById('lista-produtos');
    if (!container) return;

    const res = await fetch(`${API_BASE}/api/produtos`);
    const produtos = await res.json();
    
    container.innerHTML = produtos.map(p => `
        <div class="produto-card">
            <img src="${p.foto}" alt="${p.nome}">
            <h3>${p.nome}</h3>
            <p>R$ ${p.preco.toFixed(2)}</p>
            <select id="tam-${p._id}">
                ${p.tamanhos.map(t => `<option value="${t}">${t}</option>`).join('')}
            </select>
            <button onclick="adicionarAoCarrinho('${p._id}', '${p.nome}', ${p.preco})">Adicionar</button>
        </div>
    `).join('');
}

async function excluirProduto(id) {
    if(confirm('Tem certeza que deseja excluir este produto?')) {
        await fetch(`${API_BASE}/api/produtos/${id}`, { method: 'DELETE' });
        carregarProdutos();
    }
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