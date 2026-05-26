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
// 🚀 INIT
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

    const formCadastro =
        document.getElementById('form-cadastro');

    if (formCadastro) {
        formCadastro.addEventListener(
            'submit',
            cadastrarUsuario
        );
    }

    const formLogin =
        document.getElementById('form-login');

    if (formLogin) {
        formLogin.addEventListener(
            'submit',
            fazerLogin
        );
    }

    const formProduto =
        document.getElementById('form-produto');

    if (formProduto) {
        formProduto.addEventListener(
            'submit',
            salvarProduto
        );
    }
});

// ==========================================================================
// 👤 AUTH
// ==========================================================================
function inicializarAuth() {

    const btnAuth =
        document.getElementById('btn-auth');

    if (!btnAuth) return;

    if (usuarioLogado) {

        btnAuth.innerText =
            `Olá, ${usuarioLogado.nome} (Sair)`;

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

                const adminLink =
                    document.createElement('a');

                adminLink.id = 'btn-admin';

                adminLink.href = 'admin.html';

                adminLink.innerText =
                    '⚙️ Painel Admin';

                adminLink.style.marginRight = '15px';

                nav.insertBefore(
                    adminLink,
                    btnAuth
                );
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

        const email =
            form.querySelector('[name="email"]').value.trim();

        const senha =
            form.querySelector('[name="senha"]').value.trim();

        if (!email || !senha) {

            return Swal.fire({
                icon: 'warning',
                title: 'Preencha todos os campos'
            });
        }

        Swal.fire({
            title: 'Entrando...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        const res = await fetch(
            `${API_BASE}/api/login`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    senha
                })
            }
        );

        let data = {};

        try {
            data = await res.json();
        } catch {
            throw new Error('JSON inválido');
        }

        if (!res.ok) {
            throw new Error(data.erro);
        }

        localStorage.setItem(
            'usuario',
            JSON.stringify(data)
        );

        Swal.fire({
            icon: 'success',
            title: 'Login realizado'
        });

        setTimeout(() => {

            if (data.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'index.html';
            }

        }, 1000);

    } catch (err) {

        console.error(err);

        Swal.fire({
            icon: 'error',
            title: 'Erro login',
            text: err.message
        });
    }
}

// ==========================================================================
// 📝 CADASTRO
// ==========================================================================
async function cadastrarUsuario(e) {

    e.preventDefault();

    try {

        const form = e.target;

        const nome =
            form.querySelector('[name="nome"]').value.trim();

        const email =
            form.querySelector('[name="email"]').value.trim();

        const senha =
            form.querySelector('[name="senha"]').value.trim();

        if (!nome || !email || !senha) {

            return Swal.fire({
                icon: 'warning',
                title: 'Preencha tudo'
            });
        }

        Swal.fire({
            title: 'Criando conta...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        const res = await fetch(
            `${API_BASE}/api/registro`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nome,
                    email,
                    senha
                })
            }
        );

        let data = {};

        try {
            data = await res.json();
        } catch {
            throw new Error('JSON inválido');
        }

        if (!res.ok) {
            throw new Error(data.erro);
        }

        Swal.fire({
            icon: 'success',
            title: 'Conta criada'
        }).then(() => {

            window.location.href = 'login.html';
        });

    } catch (err) {

        console.error(err);

        Swal.fire({
            icon: 'error',
            title: 'Erro cadastro',
            text: err.message
        });
    }
}

// ==========================================================================
// 📦 PRODUTOS
// ==========================================================================
async function carregarProdutos() {

    try {

        const res = await fetch(
            `${API_BASE}/api/produtos`
        );

        produtosLocais = await res.json();

        const tabela =
            document.getElementById(
                'tabela-admin-produtos'
            );

        if (!tabela) return;

        tabela.innerHTML =
            produtosLocais.map(p => `
            <tr>
                <td>
                    <img src="${formatarUrlImagem(p.foto)}"
                    width="70">
                </td>

                <td>${p.nome}</td>

                <td>
                    R$ ${Number(p.preco).toFixed(2)}
                </td>

                <td>
                    ${p.tamanhos.join(', ')}
                </td>

                <td>
                    <button onclick="prepararEdicao('${p._id}')">
                        Editar
                    </button>

                    <button onclick="excluirProduto('${p._id}')">
                        Excluir
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (err) {

        console.error(err);
    }
}
function prepararEdicao(id) {
    console.log('Editar produto:', id);
}

// ==========================================================================
// 🛒 CARRINHO
// ==========================================================================
function adicionarAoCarrinho(id, nome, preco) {

    const radio =
        document.querySelector(
            `input[name="tam-${id}"]:checked`
        );

    const tamanho =
        radio ? radio.value : 'U';

    const existe =
        carrinho.find(
            i =>
                i.id === id &&
                i.tamanho === tamanho
        );

    if (existe) {

        existe.qtd++;

    } else {

        carrinho.push({
            id,
            nome,
            preco,
            tamanho,
            qtd: 1
        });
    }

    localStorage.setItem(
        'carrinho',
        JSON.stringify(carrinho)
    );

    Swal.fire({
        icon: 'success',
        title: 'Produto adicionado'
    });
}

// ==========================================================================
// 💳 CHECKOUT
// ==========================================================================
async function finalizarCompra() {

    try {

        if (carrinho.length === 0) {

            return Swal.fire({
                icon: 'warning',
                title: 'Carrinho vazio'
            });
        }

        const subtotal =
            carrinho.reduce(
                (acc, item) =>
                    acc + item.preco * item.qtd,
                0
            );

        const frete =
            subtotal > 300 ? 0 : 20;

        const res = await fetch(
            `${API_BASE}/api/pagamentos/checkout`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    itens: carrinho,
                    frete
                })
            }
        );

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.erro);
        }

        window.location.href =
            data.init_point;

    } catch (err) {

        console.error(err);

        Swal.fire({
            icon: 'error',
            title: 'Erro checkout',
            text: err.message
        });
    }
}

// ==========================================================================
// 🗑️ EXCLUIR PRODUTO
// ==========================================================================
async function excluirProduto(id) {

    try {

        const confirmar =
            await Swal.fire({
                icon: 'warning',
                title: 'Excluir produto?',
                showCancelButton: true
            });

        if (!confirmar.isConfirmed) return;

        const res = await fetch(
            `${API_BASE}/api/produtos/${id}`,
            {
                method: 'DELETE'
            }
        );

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.erro);
        }

        carregarProdutos();

    } catch (err) {

        console.error(err);

        Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: err.message
        });
    }
}

// ==========================================================================
// 📂 URL IMAGEM
// ==========================================================================
function formatarUrlImagem(caminho) {

    if (!caminho) {
        return 'placeholder.jpg';
    }

    if (caminho.startsWith('http')) {
        return caminho;
    }

    return `${API_BASE}${caminho}`;
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