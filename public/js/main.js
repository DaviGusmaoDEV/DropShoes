// ==========================================================================
// 🛒 CONFIGURAÇÕES GERAIS E AMBIENTE
// ==========================================================================
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000' 
    : 'https://dropshoes-repd.onrender.com';

let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
let usuarioLogado = JSON.parse(localStorage.getItem('usuario')) || null;
let freteValor = 0;
let idProdutoEmEdicao = null; 
let produtosLocais = []; 

// ==========================================================================
// 🎬 INICIALIZAÇÃO UNIFICADA E ESCUTADORES
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    inicializarAuth();
    
    // Renderização de Telas Específicas
    if (document.getElementById('lista-produtos')) carregarProdutosVitrine();
    if (document.getElementById('tabela-admin-produtos')) carregarProdutos();
    if (document.getElementById('itens-carrinho')) atualizarCarrinho();
    
    // Vinculação de Formulários de Forma Segura (Prevenção de Erros de Elemento Nulo)
    const formProduto = document.getElementById('form-produto');
    if (formProduto) formProduto.addEventListener('submit', salvarProduto);

    const formCadastro = document.getElementById('form-cadastro') || document.querySelector('.form-cadastro');
    if (formCadastro) formCadastro.addEventListener('submit', cadastrarUsuario);

    const formLogin = document.getElementById('form-login') || document.querySelector('.form-login');
    if (formLogin) formLogin.addEventListener('submit', fazerLogin);
});

// ==========================================================================
// 👤 SEÇÃO: AUTENTICAÇÃO (LOGIN, LOGOUT, REGISTRO)
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
    
    const form = e.target;
    const email = form.querySelector('[name="email"], #login-email, #email')?.value;
    const senha = form.querySelector('[name="senha"], #login-senha, #senha')?.value;

    if (!email || !senha) {
        return Swal.fire('Atenção', 'Por favor, preencha todos os campos de login.', 'warning');
    }

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
            Swal.fire('Falha no Login', data.erro || 'Credenciais incorretas.', 'error');
        }
    } catch (err) { 
        console.error("Erro no fetch de login:", err);
        Swal.fire('Erro de Conexão', 'Não foi possível estabelecer contato com o servidor.', 'error');
    }
}

async function cadastrarUsuario(e) {
    if (e) e.preventDefault();

    const form = e.target;
    const nome = form.querySelector('[name="nome"], #registro-nome, #nome')?.value;
    const email = form.querySelector('[name="email"], #registro-email, #email')?.value;
    const senha = form.querySelector('[name="senha"], #registro-senha, #senha')?.value;

    if (!nome || !email || !senha) {
        return Swal.fire('Ops!', 'Por favor, preencha todos os campos do formulário.', 'warning');
    }

    Swal.fire({
        title: 'Criando sua conta...',
        text: 'Aguarde enquanto registramos seus dados no banco.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const res = await fetch(`${API_BASE}/api/registro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha })
        });

        const data = await res.json();

        if (res.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Usuário Cadastrado!',
                text: 'Sua conta foi criada e armazenada com sucesso.',
                confirmButtonColor: '#2ecc71',
                confirmButtonText: 'Ir para o Login'
            }).then(() => {
                window.location.href = 'login.html'; 
            });
        } else {
            throw new Error(data.erro || "Erro interno ao processar cadastro.");
        }
    } catch (err) {
        console.error("Erro na requisição de cadastro:", err);
        Swal.fire({ icon: 'error', title: 'Falha no cadastro', text: err.message, confirmButtonColor: '#e74c3c' });
    }
}

// ==========================================================================
// 📦 SEÇÃO: GESTÃO DE PRODUTOS (CRUD & VITRINE)
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
            
            carregarProdutos();
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

async function carregarProdutos() {
    try {
        const res = await fetch(`${API_BASE}/api/produtos`);
        produtosLocais = await res.json(); 
        const tabela = document.getElementById('tabela-admin-produtos');
        if (!tabela) return;

        tabela.innerHTML = produtosLocais.map(p => `
            <tr>
                <td><img src="${formatarUrlImagem(p.foto)}" width="70" style="object-fit: cover; border-radius: 4px;"></td>
                <td>${p.nome}</td>
                <td>R$ ${Number(p.preco).toFixed(2)}</td>
                <td>${Array.isArray(p.tamanhos) ? p.tamanhos.join(', ') : p.tamanhos}</td>
                <td>
                    <button onclick="prepararEdicao('${p._id}')" style="color:white; background-color:blue; padding: 5px 10px; border:none; border-radius:3px; cursor:pointer; margin-right:5px;">Editar</button>
                    <button onclick="excluirProduto('${p._id}')" style="color:white; background-color:red; padding: 5px 10px; border:none; border-radius:3px; cursor:pointer;">Excluir</button>
                </td>
            </tr>
        `).join('');
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
        
        container.innerHTML = produtos.map(p => {
            const temTamanhos = Array.isArray(p.tamanhos) && p.tamanhos.length > 0;
            const seletorTamanhos = temTamanhos
                ? p.tamanhos.map(t => `
                    <label class="checkbox-tamanho-label">
                        <input type="radio" name="tam-${p._id}" value="${t}">
                        <span>${t}</span>
                    </label>`).join('')
                : `
                    <label class="checkbox-tamanho-label">
                        <input type="radio" name="tam-${p._id}" value="U" checked>
                        <span>U</span>
                    </label>`;

            return `
                <div class="produto-card">
                    <div class="produto-imagem-wrapper">
                        <img src="${formatarUrlImagem(p.foto)}" alt="${p.nome}" class="produto-imagem" onerror="this.src='placeholder.jpg'">
                    </div>
                    <div class="produto-info">
                        <h3 class="produto-titulo">${p.nome}</h3>
                        <p class="produto-preco">R$ ${Number(p.preco).toFixed(2)}</p>
                        
                        <div class="produto-opcoes-checkboxes">
                            <span class="produto-label">Tamanhos disponíveis:</span>
                            <div class="tamanhos-grid">
                                ${seletorTamanhos}
                            </div>
                        </div>
                        
                        <button class="btn btn-primary btn-produto" onclick="adicionarAoCarrinho('${p._id}', '${p.nome}', ${p.preco})">
                            Adicionar ao Carrinho
                        </button>
                    </div>
                </div>`;
        }).join('');
    } catch (err) {
        console.error("Erro ao carregar vitrine de produtos:", err);
    }
}

async function excluirProduto(id) {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
        try {
            const res = await fetch(`${API_BASE}/api/produtos/${id}`, { method: 'DELETE' });
            if (res.ok) {
                carregarProdutos();
            } else {
                Swal.fire('Erro', 'Não foi possível remover o produto.', 'error');
            }
        } catch (err) {
            console.error("Erro ao excluir:", err);
        }
    }
}

function formatarUrlImagem(caminho) {
    if (!caminho) return 'placeholder.jpg';
    if (caminho.startsWith('http')) return caminho;
    return `${API_BASE}${caminho}`;
}

// ==========================================================================
// 🛒 SEÇÃO: OPERAÇÕES DO CARRINHO DE COMPRAS
// ==========================================================================
function adicionarAoCarrinho(id, nome, preco) {
    // Busca inteligente: verifica o botão de rádio selecionado para a vitrine
    const radioSelecionado = document.querySelector(`input[name="tam-${id}"]:checked`);
    const tamanhoEscolhido = radioSelecionado ? radioSelecionado.value : "U";
    
    if (!radioSelecionado && document.getElementsByName(`tam-${id}`).length > 0) {
        Swal.fire('Aviso', 'Por favor, selecione um tamanho antes de adicionar ao carrinho!', 'warning');
        return;
    }

    const itemExistente = carrinho.find(i => i.id === id && i.tamanho === tamanhoEscolhido);
    if (itemExistente) { 
        itemExistente.qtd += 1; 
    } else { 
        // Preserva o espelhamento de ID e _id exigido pelo Checkout do back-end
        carrinho.push({ id, _id: id, nome, preco: Number(preco), tamanho: tamanhoEscolhido, qtd: 1 }); 
    }

    localStorage.setItem('carrinho', JSON.stringify(carrinho));
    window.location.href = 'carrinho.html';
}

function atualizarCarrinho() {
    const container = document.getElementById('itens-carrinho');
    if (!container) return;
    
    if (carrinho.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding: 20px; color: var(--text-muted);">Seu carrinho está vazio.</p>';
        const zeros = 'R$ 0,00';
        if (document.getElementById('cart-subtotal')) document.getElementById('cart-subtotal').innerText = zeros;
        if (document.getElementById('cart-frete')) document.getElementById('cart-frete').innerText = zeros;
        if (document.getElementById('cart-total')) document.getElementById('cart-total').innerText = zeros;
        return;
    }

    container.innerHTML = carrinho.map((item, index) => `
        <div class="item-carrinho" style="display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid #eee;">
            <div>
                <h4 style="margin: 0 0 5px 0;">${item.nome} (x${item.qtd})</h4>
                <p style="margin: 0; font-size: 13px; color: #666;">Tamanho: ${item.tamanho}</p>
            </div>
            <div style="text-align: right;">
                <b style="display: block; margin-bottom: 5px;">R$ ${(Number(item.preco) * item.qtd).toFixed(2)}</b>
                <button class="btn btn-remover" onclick="removerDoCarrinho(${index})">Remover</button>
            </div>
        </div>`).join('');

    const subtotal = carrinho.reduce((acumulador, item) => acumulador + (Number(item.preco) * item.qtd), 0);
    freteValor = subtotal > 300 ? 0 : 20.00; 
    const totalGeral = subtotal + freteValor;

    const elSubtotal = document.getElementById('cart-subtotal');
    const elFrete = document.getElementById('cart-frete');
    const elTotal = document.getElementById('cart-total');

    if (elSubtotal) elSubtotal.innerText = `R$ ${subtotal.toFixed(2)}`;
    if (elFrete) elFrete.innerText = freteValor === 0 ? 'Grátis' : `R$ ${freteValor.toFixed(2)}`;
    if (elTotal) elTotal.innerText = `R$ ${totalGeral.toFixed(2)}`;
}

function removerDoCarrinho(index) {
    carrinho.splice(index, 1);
    localStorage.setItem('carrinho', JSON.stringify(carrinho));
    atualizarCarrinho();
}

// ==========================================================================
// 💳 SEÇÃO: INTEGRAÇÃO MERCADO PAGO (CHECKOUT)
// ==========================================================================
async function finalizarCompra() {
    if (carrinho.length === 0) {
        return Swal.fire('Ops!', 'Seu carrinho está vazio.', 'warning');
    }

    Swal.fire({
        title: 'Preparando seu checkout...',
        text: 'Você será redirecionado para a tela de pagamento seguro.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    const subtotal = carrinho.reduce((acc, item) => acc + (Number(item.preco) * item.qtd), 0);
    const freteCalculado = subtotal > 300 ? 0 : 20.00;

    try {
        const urlFormatada = `${API_BASE}/api/pagamentos/checkout`.replace(/([^:]\/)\/+/g, "$1");

        const res = await fetch(urlFormatada, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                itens: carrinho,
                frete: freteCalculado
            })
        });

        const data = await res.json();
        const linkPagamento = data.init_point || (data.body && data.body.init_point);

        if (res.ok && linkPagamento) {
            localStorage.removeItem('carrinho');
            carrinho = [];
            window.location.href = linkPagamento;
        } else {
            throw new Error(data.erro || "O servidor recusou a criação do link de pagamento.");
        }
    } catch (err) {
        console.error("Erro no checkout:", err);
        Swal.fire({
            icon: 'error',
            title: 'Não foi possível gerar o link para pagamento',
            text: err.message || 'Falha ao conectar com o gateway de pagamento.'
        });
    }
}

// ==========================================================================
// 🌍 EXPOSIÇÃO GLOBAL PARA EXECUÇÃO EM ATRIBUTOS INLINE (HTML)
// ==========================================================================
window.fazerLogin = fazerLogin;
window.cadastrarUsuario = cadastrarUsuario;
window.prepararEdicao = prepararEdicao;
window.excluirProduto = excluirProduto;
window.adicionarAoCarrinho = adicionarAoCarrinho;
window.removerDoCarrinho = removerDoCarrinho;
window.finalizarCompra = finalizarCompra;