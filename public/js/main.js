// ==========================================================================
// 🛒 CONFIGURAÇÕES GERAIS
// ==========================================================================
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000' 
    : 'https://dropshoes-repd.onrender.com';

let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
let usuarioLogado = JSON.parse(localStorage.getItem('usuario')) || null;
let freteValor = 0;
let idProdutoEmEdicao = null; 
let produtosLocais = []; // Guarda a lista vinda do banco para a edição ler instantaneamente

// ==========================================================================
// 🎬 INICIALIZAÇÃO UNIFICADA
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    inicializarAuth();
    
    if (document.getElementById('lista-produtos')) carregarProdutosVitrine();
    if (document.getElementById('tabela-admin-produtos')) carregarProdutos();
    if (document.getElementById('itens-carrinho')) atualizarCarrinho();
    
    // Vincula o evento de submit do formulário de forma segura se ele existir na página
    const formProduto = document.getElementById('form-produto');
    if (formProduto) {
        formProduto.addEventListener('submit', salvarProduto);
    }
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
// 📦 GESTÃO DE PRODUTOS (CRUD completo)
// ==========================================================================

async function salvarProduto(e) {
    if (e) e.preventDefault(); 
    
    const form = document.getElementById('form-produto');
    if (!form) return;

    const formData = new FormData(form);
    
    const selecionados = Array.from(document.querySelectorAll('input[name="tamanho"]:checked')).map(cb => cb.value);
    if (selecionados.length === 0) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning',
                title: 'Atenção!',
                text: 'Selecione pelo menos um tamanho para o tênis.',
                confirmButtonColor: '#2980b9'
            });
        } else {
            alert("Selecione pelo menos um tamanho!");
        }
        return;
    }
    formData.append('tamanhos', selecionados.join(','));

    const url = idProdutoEmEdicao ? `${API_BASE}/api/produtos/${idProdutoEmEdicao}` : `${API_BASE}/api/produtos`;
    const metodo = idProdutoEmEdicao ? 'PUT' : 'POST';

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Salvando produto...',
            text: 'Aguarde um momento.',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });
    }

    try {
        const res = await fetch(url, { method: metodo, body: formData });
        
        if (res.ok) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'success',
                    title: idProdutoEmEdicao ? 'Modificação feita com sucesso!' : 'Produto cadastrado!',
                    text: idProdutoEmEdicao ? 'As novas informações já estão na vitrine.' : 'O produto foi adicionado ao estoque.',
                    showConfirmButton: false,
                    timer: 2000,
                    timerProgressBar: true
                });
            } else {
                alert(idProdutoEmEdicao ? 'Seu produto foi atualizado com sucesso!' : 'Produto cadastrado com sucesso!');
            }
            
            form.reset();
            idProdutoEmEdicao = null;
            
            const btnSubmit = form.querySelector('button[type="submit"]');
            if (btnSubmit) btnSubmit.innerText = 'Publicar na Vitrine';
            
            carregarProdutos();
            if (document.getElementById('lista-produtos')) carregarProdutosVitrine();

        } else {
            const data = await res.json();
            throw new Error(data.erro || "Erro na resposta do servidor");
        }
    } catch (err) { 
        console.error("Erro no salvamento:", err); 
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Ops! Algo deu errado',
                text: 'Não foi possível salvar as alterações. Verifique sua conexão.',
                confirmButtonColor: '#e74c3c'
            });
        } else {
            alert("Falha de conexão ao tentar salvar.");
        }
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

function formatarUrlImagem(caminho) {
    if (!caminho) return 'placeholder.jpg';
    if (caminho.startsWith('http')) return caminho;
    return `${API_BASE}${caminho}`;
}

async function carregarProdutos() {
    try {
        const res = await fetch(`${API_BASE}/api/produtos`);
        produtosLocais = await res.json(); 
        const tabela = document.getElementById('tabela-admin-produtos');
        if (tabela) {
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
        
        container.innerHTML = produtos.map(p => {
            const temTamanhos = Array.isArray(p.tamanhos) && p.tamanhos.length > 0;
            const seletorTamanhos = temTamanhos
                ? p.tamanhos.map(t => `
                    <label class="checkbox-tamanho-label">
                        <input type="radio" name="tam-${p._id}" value="${t}">
                        <span>${t}</span>
                    </label>
                  `).join('')
                : `
                    <label class="checkbox-tamanho-label">
                        <input type="radio" name="tam-${p._id}" value="U" checked>
                        <span>U</span>
                    </label>
                  `;

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
                        
                        <button class="btn btn-primary btn-produto" onclick="adicionarAoCarrinhoComCheckbox('${p._id}', '${p.nome}', ${p.preco})">
                            Adicionar ao Carrinho
                        </button>
                    </div>
                </div>
            `;
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
                alert("Erro ao excluir the produto.");
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
        // CORREÇÃO: Garante o mapeamento tanto de 'id' quanto de '_id' para compatibilidade com o checkout
        carrinho.push({ id, _id: id, nome, preco: Number(preco), tamanho, qtd }); 
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
        container.innerHTML = '<p style="text-align:center; padding: 20px; color: var(--text-muted);">Seu carrinho está vazio.</p>';
        if (document.getElementById('cart-subtotal')) document.getElementById('cart-subtotal').innerText = 'R$ 0,00';
        if (document.getElementById('cart-frete')) document.getElementById('cart-frete').innerText = 'R$ 0,00';
        if (document.getElementById('cart-total')) document.getElementById('cart-total').innerText = 'R$ 0,00';
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

function adicionarAoCarrinhoComCheckbox(id, nome, preco) {
    const radioSelecionado = document.querySelector(`input[name="tam-${id}"]:checked`);
    
    if (!radioSelecionado) {
        alert("Por favor, selecione um tamanho antes de adicionar ao carrinho!");
        return;
    }
    
    const tamanhoEscolhido = radioSelecionado.value;
    salvarNoCarrinho(id, nome, preco, tamanhoEscolhido);
}

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
        
        // Captura o link de forma flexível
        const linkPagamento = data.init_point || (data.body && data.body.init_point);

        if (res.ok && linkPagamento) {
            localStorage.removeItem('carrinho');
            carrinho = [];
            
            // Redireciona com segurança para o Mercado Pago
            window.location.href = linkPagamento;
        } else {
            // Joga a mensagem exata do erro vinda do backend para o bloco catch
            throw new Error(data.erro || "O servidor não retornou um link de pagamento válido.");
        }

    } catch (err) {
        console.error("Erro capturado no front:", err);
        Swal.fire({
            icon: 'error',
            title: 'Não foi possível gerar o link para pagamento',
            text: err.message
        });
    }
}