// ==========================================================================
// 🌍 API
// ==========================================================================
const API_BASE =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000'
        : 'https://dropshoes-repd.onrender.com';

// ==========================================================================
// 💾 STORAGE
// ==========================================================================
let carrinho =
    JSON.parse(localStorage.getItem('carrinho')) || [];

let usuarioLogado =
    JSON.parse(localStorage.getItem('usuario')) || null;

let freteValor = 0;
let idProdutoEmEdicao = null;
let produtosLocais = [];

// ==========================================================================
// 🚀 INIT - VERSÃO CORRIGIDA
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {

    inicializarAuth();

    if (document.getElementById('lista-produtos')) {
        carregarProdutosVitrine();
    }

    if (document.getElementById('tabela-admin-produtos')) {
        carregarProdutos();
    }

    if (document.getElementById('itens-carrinho')) {
        atualizarCarrinho();
    }

    const formCadastro = document.getElementById('form-cadastro');
    if (formCadastro) {
        formCadastro.addEventListener('submit', cadastrarUsuario);
    }

    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', fazerLogin);
    }

    const formProduto = document.getElementById('form-produto');
    if (formProduto) {
        // ✅ CORREÇÃO CRUCIAL: Passando apenas a referência da função, sem os parênteses ()
        formProduto.addEventListener('submit', salvarProduto);
    }
});

// ==========================================================================
// 👤 AUTH
// ==========================================================================
function inicializarAuth() {
    const btnAuth = document.getElementById('btn-auth');
    if (!btnAuth) return;

    if (usuarioLogado) {
        btnAuth.innerText = `Olá, ${usuarioLogado.nome} (Sair)`;
        btnAuth.onclick = (e) => {
            e.preventDefault();
            localStorage.removeItem('usuario');
            Swal.fire({
                icon: 'success',
                title: 'Logout realizado'
            }).then(() => {
                window.location.href = 'index.html';
            });
        };

        if (usuarioLogado.role === 'admin') {
            const nav = btnAuth.parentElement;
            if (!document.getElementById('btn-admin')) {
                const adminLink = document.createElement('a');
                adminLink.id = 'btn-admin';
                adminLink.href = 'admin.html';
                adminLink.innerText = '⚙️ Painel Admin';
                adminLink.style.marginRight = '15px';
                nav.insertBefore(adminLink, btnAuth);
            }
        }
    }
}

// ==========================================================================
// 🔐 LOGIN
// ==========================================================================
async function fazerLogin(e) {
    e.preventDefault();
    try {
        const form = e.target;
        const email = form.querySelector('[name="email"]').value.trim();
        const senha = form.querySelector('[name="senha"]').value.trim();

        if (!email || !senha) {
            return Swal.fire({ icon: 'warning', title: 'Preencha todos os campos' });
        }

        Swal.fire({ title: 'Entrando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const res = await fetch(`${API_BASE}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });

        let data = {};
        try { data = await res.json(); } catch { throw new Error('JSON inválido'); }

        if (!res.ok) throw new Error(data.erro);

        localStorage.setItem('usuario', JSON.stringify(data));
        Swal.fire({ icon: 'success', title: 'Login realizado' });

        setTimeout(() => {
            if (data.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'index.html';
            }
        }, 1000);

    } catch (err) {
        console.error(err);
        Swal.fire({ icon: 'error', title: 'Erro login', text: err.message });
    }
}

// ==========================================================================
// 📝 CADASTRO
// ==========================================================================
async function cadastrarUsuario(e) {
    e.preventDefault();
    try {
        const form = e.target;
        const nome = form.querySelector('[name="nome"]').value.trim();
        const email = form.querySelector('[name="email"]').value.trim();
        const senha = form.querySelector('[name="senha"]').value.trim();

        if (!nome || !email || !senha) {
            return Swal.fire({ icon: 'warning', title: 'Preencha tudo' });
        }

        Swal.fire({ title: 'Criando conta...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const res = await fetch(`${API_BASE}/api/registro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha })
        });

        let data = {};
        try { data = await res.json(); } catch { throw new Error('JSON inválido'); }

        if (!res.ok) throw new Error(data.erro);

        Swal.fire({ icon: 'success', title: 'Conta criada' }).then(() => {
            window.location.href = 'login.html';
        });

    } catch (err) {
        console.error(err);
        Swal.fire({ icon: 'error', title: 'Erro cadastro', text: err.message });
    }
}

// ==========================================================================
// 📦 PRODUTOS
// ==========================================================================
async function salvarProduto(e) {
    if (e) e.preventDefault(); 
    
    const form = document.getElementById('form-produto');
    if (!form) return;

    const formData = new FormData(form);
    const selecionados = Array.from(document.querySelectorAll('input[name="tamanho"]:checked')).map(cb => cb.value);
    
    if (selecionados.length === 0) {
        return Swal.fire('Atenção!', 'Selecione pelo menos um tamanho para o tênis.', 'warning');
    }
    formData.append('tamanhos', selecionados.join(','));

    const url = idProdutoEmEdicao ? `${API_BASE}/api/produtos/${idProdutoEmEdicao}` : `${API_BASE}/api/produtos`;
    const metodo = idProdutoEmEdicao ? 'PUT' : 'POST';

    Swal.fire({ title: 'Salvando produto...', text: 'Aguarde um momento.', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

    try {
        const res = await fetch(url, { method: metodo, body: formData });
        
        if (res.ok) {
            Swal.fire({
                icon: 'success',
                title: idProdutoEmEdicao ? 'Modificação feita com sucesso!' : 'Produto cadastrado!',
                text: idProdutoEmEdicao ? 'As novas informações já estão na vitrine.' : 'O produto foi adicionado ao estoque.',
                showConfirmButton: false,
                timer: 2000,
                timerProgressBar: true
            });
            
            form.reset();
            idProdutoEmEdicao = null;
            
            const btnSubmit = form.querySelector('button[type="submit"]');
            if (btnSubmit) btnSubmit.innerText = 'Publicar na Vitrine';
            
            const inputFoto = document.getElementById('foto-produto');
            if (inputFoto) inputFoto.setAttribute('required', 'required');
            
            await carregarProdutos();
            if (document.getElementById('lista-produtos')) carregarProdutosVitrine();

        } else {
            const data = await res.json();
            throw new Error(data.erro || "Erro na resposta do servidor");
        }
    } catch (err) { 
        console.error("Erro ao salvar produto:", err); 
        Swal.fire('Ops! Algo deu errado', err.message || 'Não foi possível salvar as alterações.', 'error');
    }
}

function prepararEdicao(id) {
    const produto = produtosLocais.find(p => p._id === id);
    if (!produto) return;

    idProdutoEmEdicao = id;

    const inputNome = document.getElementById('form-nome');
    const inputPreco = document.getElementById('form-preco');
    
    if (inputNome) inputNome.value = produto.nome;
    if (inputPreco) inputPreco.value = produto.preco;

    const inputFoto = document.getElementById('foto-produto');
    if (inputFoto) inputFoto.removeAttribute('required');

    document.querySelectorAll('input[name="tamanho"]').forEach(cb => cb.checked = false);
    if (Array.isArray(produto.tamanhos)) {
        produto.tamanhos.forEach(t => {
            const cb = document.querySelector(`input[name="tamanho"][value="${t}"]`);
            if (cb) cb.checked = true;
        });
    }

    const btnSubmit = document.querySelector('#form-produto button[type="submit"]');
    if (btnSubmit) btnSubmit.innerText = '💾 Salvar Alterações';
    
    document.getElementById('form-produto')?.scrollIntoView({ behavior: 'smooth' });
}

// ==========================================================================
// 🛒 CARRINHO
// ==========================================================================
function adicionarAoCarrinho(id, nome, preco) {
    const radio = document.querySelector(`input[name="tam-${id}"]:checked`);
    const tamanho = radio ? radio.value : 'U';

    const existe = carrinho.find(i => i.id === id && i.tamanho === tamanho);

    if (existe) {
        existe.qtd++;
    } else {
        carrinho.push({ id, nome, preco, tamanho, qtd: 1 });
    }

    localStorage.setItem('carrinho', JSON.stringify(carrinho));
    Swal.fire({ icon: 'success', title: 'Produto adicionado' });
}

// ==========================================================================
// 💳 CHECKOUT
// ==========================================================================
async function finalizarCompra() {
    try {
        if (carrinho.length === 0) {
            return Swal.fire({ icon: 'warning', title: 'Carrinho vazio' });
        }

        const subtotal = carrinho.reduce((acc, item) => acc + item.preco * item.qtd, 0);
        const frete = subtotal > 300 ? 0 : 20;

        const res = await fetch(`${API_BASE}/api/pagamentos/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itens: carrinho, frete })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.erro);

        window.location.href = data.init_point;

    } catch (err) {
        console.error(err);
        Swal.fire({ icon: 'error', title: 'Erro checkout', text: err.message });
    }
}

// ==========================================================================
// 🗑️ EXCLUIR PRODUTO
// ==========================================================================
async function excluirProduto(id) {
    try {
        const confirmar = await Swal.fire({
            icon: 'warning',
            title: 'Excluir produto?',
            showCancelButton: true
        });

        if (!confirmar.isConfirmed) return;

        const res = await fetch(`${API_BASE}/api/produtos/${id}`, { method: 'DELETE' });
        const data = await res.json();

        if (!res.ok) throw new Error(data.erro);

        carregarProdutos();

    } catch (err) {
        console.error(err);
        Swal.fire({ icon: 'error', title: 'Erro', text: err.message });
    }
}

// ==========================================================================
// 📂 URL IMAGEM
// ==========================================================================
function formatarUrlImagem(caminho) {
    if (!caminho) return 'placeholder.jpg';
    if (caminho.startsWith('http')) return caminho;
    return `${API_BASE}${caminho}`;
}

// ==========================================================================
// ✨ COMPLEMENTOS EXTRAS (Garante que as tabelas/vitrines funcionem se chamadas)
// ==========================================================================
// ==========================================================================
// ✨ COMPLEMENTOS EXTRAS (Garante que as tabelas/vitrines funcionem se chamadas)
// ==========================================================================
async function carregarProdutos() {
    try {
        const res = await fetch(`${API_BASE}/api/produtos`);
        if (!res.ok) throw new Error("Erro ao buscar produtos");
        produtosLocais = await res.json();
        
        const tbody = document.getElementById('tabela-admin-produtos');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (produtosLocais.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Nenhum produto cadastrado ainda.</td></tr>';
            return;
        }

        produtosLocais.forEach(p => {
            tbody.innerHTML += `
                <tr>
                    <td><img src="${formatarUrlImagem(p.foto)}" width="50" style="border-radius:5px; object-fit: cover; height:50px;"></td>
                    <td><strong>${p.nome}</strong></td>
                    <td>R$ ${Number(p.preco).toFixed(2)}</td>
                    <td>${Array.isArray(p.tamanhos) ? p.tamanhos.join(', ') : p.tamanhos}</td>
                    <td>
                        <button onclick="prepararEdicao('${p._id}')" class="btn-edit" style="background:#3498db; color:white; border:none; padding:5px 10px; border-radius:3px; cursor:pointer; margin-right:5px;">Editar</button>
                        <button onclick="excluirProduto('${p._id}')" class="btn-delete" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:3px; cursor:pointer;">Excluir</button>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Erro na tabela:", err);
    }
}

async function carregarProdutosVitrine() {
    try {
        const res = await fetch(`${API_BASE}/api/produtos`);
        if (!res.ok) throw new Error("Erro ao buscar vitrine");
        const produtos = await res.json();
        
        const grid = document.getElementById('lista-produtos');
        if (!grid) return;
        
        grid.innerHTML = '';

        if (produtos.length === 0) {
            grid.innerHTML = '<p style="text-align:center; color:var(--text-muted); grid-column: 1/-1;">Nenhum tênis disponível na vitrine no momento.</p>';
            return;
        }

        produtos.forEach(p => {
            // Gera as opções de botões de tamanho de forma dinâmica para cada tênis
            const tamanhosHtml = Array.isArray(p.tamanhos) 
                ? p.tamanhos.map(t => `<label class="radio-tamanho"><input type="radio" name="tam-${p._id}" value="${t}"><span>${t}</span></label>`).join('')
                : '';

            grid.innerHTML += `
                <div class="product-card">
                    <div class="product-image">
                        <img src="${formatarUrlImagem(p.foto)}" alt="${p.nome}">
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">${p.nome}</h3>
                        <p class="product-price">R$ ${Number(p.preco).toFixed(2)}</p>
                        
                        <div class="product-sizes">
                            <span class="sizes-label">Tamanhos:</span>
                            <div class="sizes-grid">
                                ${tamanhosHtml}
                            </div>
                        </div>
                        
                        <button onclick="adicionarAoCarrinho('${p._id}', '${p.nome}', ${p.preco})" class="btn-add-carrinho">
                            🛒 Adicionar ao Carrinho
                        </button>
                    </div>
                </div>
            `;
        });
    } catch (err) {
        console.error("Erro na vitrine:", err);
    }
}

// ==========================================================================
// 🌍 GLOBAL
// ==========================================================================
window.fazerLogin = fazerLogin;
window.cadastrarUsuario = cadastrarUsuario;
window.adicionarAoCarrinho = adicionarAoCarrinho;
window.finalizarCompra = finalizarCompra;
window.excluirProduto = excluirProduto;
window.prepararEdicao = prepararEdicao;
window.salvarProduto = salvarProduto;
window.carregarProdutosVitrine = carregarProdutosVitrine;
window.carregarProdutos = carregarProdutos;