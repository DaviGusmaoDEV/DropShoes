// ==========================================================================
// 🛒 CONFIGURAÇÕES GERAIS
// ==========================================================================
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : 'https://dropshoes-repd.onrender.com';

let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
let usuarioLogado = JSON.parse(localStorage.getItem('usuario')) || null;
let freteValor = 0;

// ==========================================================================
// 🎬 INICIALIZAÇÃO UNIFICADA
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    inicializarAuth();
    
    if (document.getElementById('lista-produtos')) carregarProdutosVitrine();
    if (document.getElementById('tabela-admin-produtos')) carregarProdutos();
    if (document.getElementById('itens-carrinho')) atualizarCarrinho();
});

// ==========================================================================
// 👤 AUTENTICAÇÃO E LOGIN
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
            // Redirecionamento baseado na role
            window.location.href = data.role === 'admin' ? 'admin.html' : 'index.html';
        } else {
            alert(data.erro || 'Login falhou.');
        }
    } catch (err) { 
        console.error(err);
        alert("Erro de conexão."); 
    }
}

// ==========================================================================
// 📦 GESTÃO DE PRODUTOS
// ==========================================================================
async function cadastrarProduto(e) {
    e.preventDefault();
    const form = document.getElementById('form-produto');
    const formData = new FormData(form);
    const selecionados = Array.from(document.querySelectorAll('input[name="tamanho"]:checked')).map(cb => cb.value);
    
    if (selecionados.length === 0) return alert("Selecione pelo menos um tamanho!");
    formData.append('tamanhos', selecionados.join(','));

    try {
        const res = await fetch(`${API_BASE}/api/produtos`, { method: 'POST', body: formData });
        if (res.ok) {
            Swal.fire('Sucesso!', 'Produto cadastrado!', 'success');
            form.reset();
            carregarProdutos();
        } else {
            alert("Erro ao cadastrar.");
        }
    } catch (err) { console.error(err); }
}

async function carregarProdutos() {
    const res = await fetch(`${API_BASE}/api/produtos`);
    const produtos = await res.json();
    const tabela = document.getElementById('tabela-admin-produtos');
    if (tabela) {
        tabela.innerHTML = produtos.map(p => `
            <tr>
                <td><img src="${p.foto}" width="50"></td>
                <td>${p.nome}</td>
                <td>R$ ${Number(p.preco).toFixed(2)}</td>
                <td>${Array.isArray(p.tamanhos) ? p.tamanhos.join(', ') : p.tamanhos}</td>
                <td><button onclick="excluirProduto('${p._id}')" style="color:red">Excluir</button></td>
            </tr>
        `).join('');
    }
}

async function carregarProdutosVitrine() {
    const container = document.getElementById('lista-produtos');
    const res = await fetch(`${API_BASE}/api/produtos`);
    const produtos = await res.json();
    
    container.innerHTML = produtos.map(p => `
        <div class="produto-card">
            <img src="${p.foto}" alt="${p.nome}">
            <h3>${p.nome}</h3>
            <p>R$ ${Number(p.preco).toFixed(2)}</p>
            <select id="tam-${p._id}">
                ${Array.isArray(p.tamanhos) ? p.tamanhos.map(t => `<option value="${t}">${t}</option>`).join('') : '<option>U</option>'}
            </select>
            <button onclick="adicionarAoCarrinho('${p._id}', '${p.nome}', ${p.preco})">Adicionar</button>
        </div>
    `).join('');
}

async function excluirProduto(id) {
    if(confirm('Tem certeza?')) {
        await fetch(`${API_BASE}/api/produtos/${id}`, { method: 'DELETE' });
        carregarProdutos();
    }
}

// ==========================================================================
// 🛒 CARRINHO (Mantido funcional)
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
    container.innerHTML = carrinho.map((item, index) => `
        <div class="item-carrinho">
            <h4>${item.nome} (x${item.qtd})</h4>
            <p>Tamanho: ${item.tamanho}</p>
            <b>R$ ${(item.preco * item.qtd).toFixed(2)}</b>
            <button onclick="removerDoCarrinho(${index})">Remover</button>
        </div>`).join('');
}

function removerDoCarrinho(index) {
    carrinho.splice(index, 1);
    localStorage.setItem('carrinho', JSON.stringify(carrinho));
    atualizarCarrinho();
}