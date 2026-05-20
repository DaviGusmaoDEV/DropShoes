// ==========================================================================
// 🛒 CONFIGURAÇÕES GERAIS
// ==========================================================================
// CORREÇÃO CRÍTICA: Definição correta da URL base para evitar requests para "false/api/..."
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
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
        btnAuth.onclick = (e) => { 
            e.preventDefault(); 
            localStorage.clear(); 
            window.location.href = 'index.html'; 
        };

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
    } catch (err) { 
        console.error("Erro no fetch de login:", err);
        alert("Erro de conexão. Verifique se o servidor está online."); 
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
            if (typeof Swal !== 'undefined') {
                Swal.fire('Sucesso!', 'Produto cadastrado!', 'success');
            } else {
                alert('Produto cadastrado com sucesso!');
            }
            form.reset();
            carregarProdutos();
        } else {
            alert("Erro ao cadastrar o produto no banco de dados.");
        }
    } catch (err) { 
        console.error("Erro no fetch de cadastro:", err); 
        alert("Falha de conexão ao tentar cadastrar.");
    }
}

// Função auxiliar para garantir que a imagem carregue mesmo se frontend/backend estiverem separados
function formatarUrlImagem(caminho) {
    if (!caminho) return 'placeholder.jpg';
    if (caminho.startsWith('http')) return caminho;
    return `${API_BASE}${caminho}`;
}

async function carregarProdutos() {
    try {
        const res = await fetch(`${API_BASE}/api/produtos`);
        const produtos = await res.json();
        const tabela = document.getElementById('tabela-admin-produtos');
        if (tabela) {
            tabela.innerHTML = produtos.map(p => `
                <tr>
                    <td><img src="${formatarUrlImagem(p.foto)}" width="50" style="object-fit: cover; border-radius: 4px;"></td>
                    <td>${p.nome}</td>
                    <td>R$ ${Number(p.preco).toFixed(2)}</td>
                    <td>${Array.isArray(p.tamanhos) ? p.tamanhos.join(', ') : p.tamanhos}</td>
                    <td><button onclick="excluirProduto('${p._id}')" style="color:white; background-color:red; padding: 5px 10px; border:none; border-radius:3px; cursor:pointer;">Excluir</button></td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error("Erro ao carregar tabela de produtos:", err);
    }
}

async function carregarProdutosVitrine() {
    try {
        const container = document.getElementById('lista-produtos');
        if (!container) return;

        const res = await fetch(`${API_BASE}/api/produtos`);
        const produtos = await res.json();
        
        container.innerHTML = produtos.map(p => `
            <div class="produto-card">
                <img src="${formatarUrlImagem(p.foto)}" alt="${p.nome}" onerror="this.src='placeholder.jpg'">
                <h3>${p.nome}</h3>
                <p>R$ ${Number(p.preco).toFixed(2)}</p>
                <select id="tam-${p._id}">
                    ${Array.isArray(p.tamanhos) && p.tamanhos.length > 0 
                        ? p.tamanhos.map(t => `<option value="${t}">${t}</option>`).join('') 
                        : '<option value="U">Tamanho Único</option>'}
                </select>
                <button onclick="adicionarAoCarrinho('${p._id}', '${p.nome}', ${p.preco})">Adicionar</button>
            </div>
        `).join('');
    } catch (err) {
        console.error("Erro ao carregar vitrine de produtos:", err);
    }
}

async function excluirProduto(id) {
    if(confirm('Tem certeza que deseja excluir este produto?')) {
        try {
            const res = await fetch(`${API_BASE}/api/produtos/${id}`, { method: 'DELETE' });
            if (res.ok) {
                carregarProdutos();
            } else {
                alert("Erro ao excluir o produto.");
            }
        } catch (err) {
            console.error("Erro ao excluir:", err);
        }
    }
}

// ==========================================================================
// 🛒 CARRINHO
// ==========================================================================
function salvarNoCarrinho(id, nome, preco, tamanho = "U", qtd = 1) {
    const itemExistente = carrinho.find(i => i.id === id && i.tamanho === tamanho);
    if (itemExistente) { 
        itemExistente.qtd += qtd; 
    } else { 
        carrinho.push({ id, nome, preco: Number(preco), tamanho, qtd }); 
    }
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
    
    if (carrinho.length === 0) {
        container.innerHTML = '<p>Seu carrinho está vazio.</p>';
        return;
    }

    container.innerHTML = carrinho.map((item, index) => `
        <div class="item-carrinho">
            <h4>${item.nome} (x${item.qtd})</h4>
            <p>Tamanho: ${item.tamanho}</p>
            <b>R$ ${(Number(item.preco) * item.qtd).toFixed(2)}</b>
            <button onclick="removerDoCarrinho(${index})" style="margin-left: 10px; cursor: pointer;">Remover</button>
        </div>`).join('');
}

function removerDoCarrinho(index) {
    carrinho.splice(index, 1);
    localStorage.setItem('carrinho', JSON.stringify(carrinho));
    atualizarCarrinho();
}