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
let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
let usuarioLogado = JSON.parse(localStorage.getItem('usuario')) || null;
let idProdutoEmEdicao = null;
let produtosLocais = [];

// ==========================================================================
// 🚀 INIT
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    inicializarAuth();

    if (document.getElementById('lista-produtos')) carregarProdutosVitrine();
    if (document.getElementById('tabela-admin-produtos')) carregarProdutos();
    if (document.getElementById('itens-carrinho')) atualizarCarrinho();
    if (document.getElementById('detalhe-produto')) carregarEspecificoProduto();

    const formCadastro = document.getElementById('form-cadastro');
    if (formCadastro) formCadastro.addEventListener('submit', cadastrarUsuario);

    const formLogin = document.getElementById('form-login');
    if (formLogin) formLogin.addEventListener('submit', fazerLogin);

    const formProduto = document.getElementById('form-produto');
    if (formProduto) formProduto.addEventListener('submit', salvarProduto);
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
            Swal.fire({ icon: 'success', title: 'Logout realizado' }).then(() => {
                window.location.href = 'index.html';
            });
        };

        if (usuarioLogado.role === 'admin' && !document.getElementById('btn-admin')) {
            const nav = btnAuth.parentElement;
            const adminLink = document.createElement('a');
            adminLink.id = 'btn-admin';
            adminLink.href = 'admin.html';
            adminLink.innerText = '⚙️ Painel Admin';
            adminLink.style.marginRight = '15px';
            nav.insertBefore(adminLink, btnAuth);
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

        if (!email || !senha) return Swal.fire({ icon: 'warning', title: 'Preencha todos os campos' });

        Swal.fire({ title: 'Entrando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const res = await fetch(`${API_BASE}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });

        let data = await res.json();
        if (!res.ok) throw new Error(data.erro);

        localStorage.setItem('usuario', JSON.stringify(data));
        Swal.fire({ icon: 'success', title: 'Login realizado' });

        setTimeout(() => {
            window.location.href = data.role === 'admin' ? 'admin.html' : 'index.html',  'souvenue.html';
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

        if (!nome || !email || !senha) return Swal.fire({ icon: 'warning', title: 'Preencha tudo' });

        Swal.fire({ title: 'Criando conta...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const res = await fetch(`${API_BASE}/api/registro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha })
        });

        let data = await res.json();
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
// 📦 PRODUTOS (CRUD)
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
                showConfirmButton: false,
                timer: 2000,
                timerProgressBar: true
            });
            
            form.reset();
            idProdutoEmEdicao = null;
            
            const btnSubmit = form.querySelector('button[type="submit"]');
            if (btnSubmit) btnSubmit.innerText = 'Publicar na Vitrine';
            
            await carregarProdutos();
            if (document.getElementById('lista-produtos')) carregarProdutosVitrine();

        } else {
            const data = await res.json();
            throw new Error(data.erro || "Erro na resposta do servidor");
        }
    } catch (err) { 
        console.error("Erro ao salvar produto:", err); 
        Swal.fire('Ops! Algo deu errado', err.message, 'error');
    }
}

function prepararEdicao(id) {
    const produto = produtosLocais.find(p => p._id === id);
    if (!produto) return;

    idProdutoEmEdicao = id;

    document.getElementById('form-nome').value = produto.nome;
    document.getElementById('form-preco').value = produto.preco;
    document.getElementById('foto-produto').removeAttribute('required');

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
// 🛒 LÓGICA DO CARRINHO (Processamento Limpo Baseado em Templates)
// ==========================================================================
function adicionarAoCarrinho(id, nome, preco) {
    const radio = document.querySelector(`input[name="tam-${id}"]:checked`);
    
    if (!radio) {
        return Swal.fire('Selecione o Tamanho', 'Por favor, escolha um tamanho antes de adicionar ao carrinho.', 'warning');
    }
    
    const tamanho = radio.value;
    const existe = carrinho.find(i => i.id === id && i.tamanho === tamanho);

    if (existe) {
        existe.qtd++;
    } else {
        carrinho.push({ id, nome, preco: Number(preco), tamanho, qtd: 1 });
    }

    localStorage.setItem('carrinho', JSON.stringify(carrinho));
    
    Swal.fire({
        icon: 'success',
        title: 'Adicionado ao carrinho!',
        text: `${nome} (Tam: ${tamanho}) foi adicionado com sucesso.`,
        showCancelButton: true,
        confirmButtonText: 'Ver Carrinho',
        cancelButtonText: 'Continuar Comprando'
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = 'carrinho.html';
        }
    });
}

function alterarQuantidade(index, mudanca) {
    carrinho[index].qtd += mudanca;
    if (carrinho[index].qtd <= 0) {
        carrinho.splice(index, 1);
    }
    localStorage.setItem('carrinho', JSON.stringify(carrinho));
    atualizarCarrinho();
}

function atualizarCarrinho() {
    const container = document.getElementById('itens-carrinho');
    const templateItem = document.getElementById('template-item-carrinho');
    const msgVazio = document.getElementById('carrinho-vazio-mensagem');
    if (!container) return;

    container.innerHTML = '';

    if (carrinho.length === 0) {
        if (msgVazio) msgVazio.style.display = 'block';
        if (document.getElementById('cart-subtotal')) document.getElementById('cart-subtotal').innerText = 'R$ 0,00';
        if (document.getElementById('cart-frete')) document.getElementById('cart-frete').innerText = 'R$ 0,00';
        if (document.getElementById('cart-total')) document.getElementById('cart-total').innerText = 'R$ 0,00';
        return;
    }

    if (msgVazio) msgVazio.style.display = 'none';
    let subtotal = 0;

    carrinho.forEach((item, index) => {
        subtotal += item.preco * item.qtd;
        
        if (templateItem) {
            const clone = templateItem.content.cloneNode(true);
            
            const nome = clone.querySelector('.carrinho-item-nome');
            if (nome) nome.innerText = item.nome;

            const detalhes = clone.querySelector('.carrinho-item-detalhes');
            if (detalhes) detalhes.innerText = `Tamanho: ${item.tamanho} | R$ ${item.preco.toFixed(2)} un`;

            const qtd = clone.querySelector('.carrinho-item-qtd');
            if (qtd) qtd.innerText = item.qtd;

            const totalItem = clone.querySelector('.carrinho-item-total');
            if (totalItem) totalItem.innerText = `R$ ${(item.preco * item.qtd).toFixed(2)}`;

            const btnMenos = clone.querySelector('.btn-qtd-menos');
            if (btnMenos) btnMenos.setAttribute('onclick', `alterarQuantidade(${index}, -1)`);

            const btnMais = clone.querySelector('.btn-qtd-mais');
            if (btnMais) btnMais.setAttribute('onclick', `alterarQuantidade(${index}, 1)`);

            container.appendChild(clone);
        }
    });

    // 🚚 Regra de entrega base: Frete grátis acima de R$ 300,00, senão R$ 20,00
    const taxaFrete = subtotal > 300 ? 0 : 20;
    const totalGeral = subtotal + taxaFrete;

    if (document.getElementById('cart-subtotal')) document.getElementById('cart-subtotal').innerText = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    if (document.getElementById('cart-frete')) document.getElementById('cart-frete').innerText = taxaFrete === 0 ? 'Grátis' : `R$ ${taxaFrete.toFixed(2).replace('.', ',')}`;
    if (document.getElementById('cart-total')) document.getElementById('cart-total').innerText = `R$ ${totalGeral.toFixed(2).replace('.', ',')}`;
}

// ==========================================================================
// 💳 CHECKOUT MERCADO PAGO
// ==========================================================================
async function finalizarCompra() {
    try {
        if (carrinho.length === 0) return Swal.fire({ icon: 'warning', title: 'Carrinho vazio', text: 'Adicione algum produto antes de finalizar.' });

        const subtotal = carrinho.reduce((acc, item) => acc + item.preco * item.qtd, 0);
        const frete = subtotal > 300 ? 0 : 20;

        Swal.fire({ title: 'Gerando checkout...', text: 'Conectando ao Mercado Pago.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const res = await fetch(`${API_BASE}/api/pagamentos/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itens: carrinho, frete })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.erro || 'Erro ao processar o checkout');

        window.location.href = data.init_point;

    } catch (err) {
        console.error(err);
        Swal.fire({ icon: 'error', title: 'Erro no checkout', text: err.message });
    }
}

// ==========================================================================
// 🗑️ EXCLUIR PRODUTO (Painel Admin)
// ==========================================================================
async function excluirProduto(id) {
    try {
        const confirmar = await Swal.fire({ icon: 'warning', title: 'Excluir produto?', showCancelButton: true });
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
// 📂 FORMATADORES
// ==========================================================================
function formatarUrlImagem(caminho) {
    if (!caminho) return 'placeholder.jpg';
    return caminho.startsWith('http') ? caminho : `${API_BASE}${caminho}`;
}

// ==========================================================================
// ✨ IMPRESSÃO DINÂMICA (Ajustada para os Templates HTML)
// ==========================================================================
async function carregarProdutos() {
    try {
        const res = await fetch(`${API_BASE}/api/produtos`);
        if (!res.ok) throw new Error();
        produtosLocais = await res.json();
        
        const tbody = document.getElementById('tabela-admin-produtos');
        const template = document.getElementById('template-linha-tabela');
        if (!tbody || !template) return;
        
        tbody.innerHTML = '';
        if (produtosLocais.length === 0) return;

        produtosLocais.forEach(p => {
            const clone = template.content.cloneNode(true);
            
            const img = clone.querySelector('.img-produto') || clone.querySelector('img');
            if (img) img.src = formatarUrlImagem(p.foto);

            const nome = clone.querySelector('.nome-produto') || clone.querySelector('strong');
            if (nome) nome.innerText = p.nome;

            const tds = clone.querySelectorAll('td');
            if (tds.length >= 4) {
                tds[2].innerText = `R$ ${Number(p.preco).toFixed(2)}`;
                tds[3].innerText = Array.isArray(p.tamanhos) ? p.tamanhos.join(', ') : p.tamanhos;
            }
            
            const btnEditar = clone.querySelector('.btn-editar') || clone.querySelector('button:first-of-type');
            const btnExcluir = clone.querySelector('.btn-excluir') || clone.querySelector('button:last-of-type');
            
            if (btnEditar) btnEditar.setAttribute('onclick', `prepararEdicao('${p._id}')`);
            if (btnExcluir) btnExcluir.setAttribute('onclick', `excluirProduto('${p._id}')`);
            
            tbody.appendChild(clone);
        });
    } catch (err) { console.error("Erro na tabela admin:", err); }
}

async function carregarProdutosVitrine() {
    try {
        const res = await fetch(`${API_BASE}/api/produtos`);
        if (!res.ok) throw new Error();
        const produtos = await res.json();
        
        const grid = document.getElementById('lista-produtos');
        const templateCard = document.getElementById('template-card-produto');
        const templateTamanho = document.getElementById('template-radio-tamanho');
        if (!grid || !templateCard || !templateTamanho) return;
        
        grid.innerHTML = '';
        if (produtos.length === 0) {
            grid.innerHTML = '<p style="text-align:center; grid-column:1/-1; color:gray;">Nenhum produto encontrado.</p>';
            return;
        }

        produtos.forEach(p => {
            const cardClone = templateCard.content.cloneNode(true);
            
            const img = cardClone.querySelector('img');
            if (img) {
                img.src = formatarUrlImagem(p.foto);
                img.alt = p.nome;
            }
            
            const titulo = cardClone.querySelector('.product-title') || cardClone.querySelector('h3');
            if (titulo) titulo.innerText = p.nome;
            
            const preco = cardClone.querySelector('.product-price') || cardClone.querySelector('p');
            if (preco) preco.innerText = `R$ ${Number(p.preco).toFixed(2)}`;
            
            const containerTamanhos = cardClone.querySelector('.container-tamanhos-dinamicos') || cardClone.querySelector('.sizes-grid');
            if (containerTamanhos && Array.isArray(p.tamanhos)) {
                p.tamanhos.forEach(t => {
                    const tamClone = templateTamanho.content.cloneNode(true);
                    const input = tamClone.querySelector('input');
                    if (input) {
                        input.name = `tam-${p._id}`;
                        input.value = t;
                    }
                    const span = tamClone.querySelector('span');
                    if (span) span.innerText = t;
                    
                    containerTamanhos.appendChild(tamClone);
                });
            }
            
            const btnComprar = cardClone.querySelector('.btn-add-carrinho') || cardClone.querySelector('button');
            if (btnComprar) {
                btnComprar.setAttribute('onclick', `adicionarAoCarrinho('${p._id}', '${p.nome}', ${p.preco})`);
            }
            
            grid.appendChild(cardClone);
        });
    } catch (err) { console.error("Erro na vitrine:", err); }
}

async function carregarEspecificoProduto() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const produtoId = urlParams.get('id');
        
        if (!produtoId) {
            document.getElementById('detalhe-produto').innerHTML = '<p style="text-align:center; color:gray;">Produto não especificado.</p>';
            return;
        }

        const res = await fetch(`${API_BASE}/api/produtos/${produtoId}`);
        if (!res.ok) throw new Error();
        const p = await res.json();

        const container = document.getElementById('detalhe-produto');
        const templateCard = document.getElementById('template-detalhe-produto');
        const templateTamanho = document.getElementById('template-radio-tamanho-detalhe');
        if (!container || !templateCard || !templateTamanho) return;

        container.innerHTML = '';
        const clone = templateCard.content.cloneNode(true);

        const img = clone.querySelector('img');
        if (img) {
            img.src = formatarUrlImagem(p.foto);
            img.alt = p.nome;
        }

        const titulo = clone.querySelector('.product-detail-title') || clone.querySelector('h1');
        if (titulo) titulo.innerText = p.nome;

        const preco = clone.querySelector('.product-detail-price') || clone.querySelector('.preco-detalhe');
        if (preco) preco.innerText = `R$ ${Number(p.preco).toFixed(2)}`;

        const containerTamanhos = clone.querySelector('.container-tamanhos-detalhe') || clone.querySelector('.sizes-grid');
        if (containerTamanhos && Array.isArray(p.tamanhos)) {
            p.tamanhos.forEach(t => {
                const tamClone = templateTamanho.content.cloneNode(true);
                const input = tamClone.querySelector('input');
                if (input) {
                    input.name = `tam-${p._id}`;
                    input.value = t;
                }
                const span = tamClone.querySelector('span');
                if (span) span.innerText = t;

                containerTamanhos.appendChild(tamClone);
            });
        }

        const btnComprar = clone.querySelector('.btn-add-carrinho') || clone.querySelector('button');
        if (btnComprar) {
            btnComprar.setAttribute('onclick', `adicionarAoCarrinho('${p._id}', '${p.nome}', ${p.preco})`);
        }

        container.appendChild(clone);
    } catch (err) {
        console.error("Erro ao carregar os detalhes do produto:", err);
        document.getElementById('detalhe-produto').innerHTML = '<p style="text-align:center; color:gray;">Erro ao carregar as informações deste tênis.</p>';
    }
}

// ==========================================================================
// 🌍 GLOBAL (Exposição das Funções do Fluxo)
// ==========================================================================
window.fazerLogin = fazerLogin;
window.cadastrarUsuario = cadastrarUsuario;
window.adicionarAoCarrinho = adicionarAoCarrinho;
window.alterarQuantidade = alterarQuantidade;
window.finalizarCompra = finalizarCompra;
window.excluirProduto = excluirProduto;
window.prepararEdicao = prepararEdicao;
window.salvarProduto = salvarProduto;
window.carregarProdutosVitrine = carregarProdutosVitrine;
window.carregarProdutos = carregarProdutos;
window.carregarEspecificoProduto = carregarEspecificoProduto;