// produtos.js
const el = {
    formProduto: document.getElementById("form-produto"),
    modalProdutoInfo: document.getElementById("modal-produto"),
    modalProdutoTitulo: document.getElementById("modal-produto-titulo"),
    inputId: document.getElementById("prod-id"),
    inputNome: document.getElementById("prod-nome"),
    inputPreco: document.getElementById("prod-preco"),
    inputImagem: document.getElementById("prod-imagem"),
    btnAbrirModal: document.getElementById("abrirModalProduto"),
    btnFecharModal: document.getElementById("btn-fechar-modal"),
    listaProdutos: document.getElementById("lista-produtos"),
    templateCard: document.getElementById("template-card-produto"),
};

let produtos = [];
let carrinho = [];
const fretePadrao = 7.00;

function carregarProdutos() {
    const data = localStorage.getItem("produtos");
    if (data) {
        try {
            produtos = JSON.parse(data);
        } catch (erro) {
            produtos = [];
            console.error("Erro ao carregar produtos:", erro);
        }
    }
}

function carregarCarrinho() {
    const data = localStorage.getItem("carrinho");
    if (data) {
        try {
            carrinho = JSON.parse(data);
        } catch (erro) {
            carrinho = [];
            console.error("Erro ao carregar carrinho:", erro);
        }
    }
}

function salvarProdutos() {
    localStorage.setItem("produtos", JSON.stringify(produtos));
}

function salvarCarrinho() {
    localStorage.setItem("carrinho", JSON.stringify(carrinho));
}

function abrirModalCadastro() {
    if (!el.modalProdutoInfo) return;
    el.modalProdutoTitulo.textContent = "Novo Produto";
    if (el.inputId) el.inputId.value = "";
    if (el.inputNome) el.inputNome.value = "";
    if (el.inputPreco) el.inputPreco.value = "";
    if (el.inputImagem) el.inputImagem.value = "";
    el.modalProdutoInfo.showModal();
}

function abrirModalEdicao(produto) {
    if (!el.modalProdutoInfo || !produto) return;
    el.modalProdutoTitulo.textContent = "Editar Produto";
    if (el.inputId) el.inputId.value = produto.id;
    if (el.inputNome) el.inputNome.value = produto.nome;
    if (el.inputPreco) el.inputPreco.value = produto.preco;
    if (el.inputImagem) el.inputImagem.value = "";
    el.modalProdutoInfo.showModal();
}

function fecharModal() {
    if (!el.modalProdutoInfo) return;
    el.modalProdutoInfo.close();
}

function lerImagemSelecionada() {
    return new Promise((resolve) => {
        if (!el.inputImagem || !el.inputImagem.files || el.inputImagem.files.length === 0) {
            return resolve(null);
        }
        const arquivo = el.inputImagem.files[0];
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(arquivo);
    });
}

async function salvarProduto(event) {
    event.preventDefault();
    if (!el.formProduto) return;

    const nome = el.inputNome?.value.trim() || "";
    const preco = parseFloat(el.inputPreco?.value.replace(",", "."));
    const imagem = await lerImagemSelecionada();
    const id = el.inputId?.value || null;

    if (!nome) {
        Swal.fire({
            icon: 'error',
            title: 'Campo obrigatório',
            text: 'O nome do produto é obrigatório.',
        });
        return;
    }

    if (isNaN(preco) || preco <= 0) {
        Swal.fire({
            icon: 'error',
            title: 'Preço inválido',
            text: 'Informe um preço válido.',
        });
        return;
    }

    if (id) {
        const indice = produtos.findIndex((item) => String(item.id) === String(id));
        if (indice === -1) {
            Swal.fire({
                icon: 'error',
                title: 'Produto não encontrado',
                text: 'Não foi possível encontrar o produto para edição.',
            });
            return;
        }
        produtos[indice].nome = nome;
        produtos[indice].preco = preco;
        if (imagem) {
            produtos[indice].imagem = imagem;
        }
    } else {
        produtos.push({
            id: Date.now(),
            nome,
            preco,
            imagem: imagem || "",
            criadoEm: new Date().toISOString(),
        });
    }

    salvarProdutos();
    exibirProdutos();
    fecharModal();
}

function excluirProduto(id) {
    Swal.fire({
        title: 'Excluir produto?',
        text: 'Essa ação não pode ser desfeita.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sim, excluir',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            produtos = produtos.filter((produto) => String(produto.id) !== String(id));
            salvarProdutos();
            exibirProdutos();
            Swal.fire({
                icon: 'success',
                title: 'Produto excluído',
                timer: 1500,
                showConfirmButton: false
            });
        }
    });
}

function adicionarAoCarrinho(produto) {
    if (!produto || typeof produto.preco !== 'number' || produto.preco <= 0) {
        Swal.fire({
            icon: 'error',
            title: 'Erro ao adicionar',
            text: 'Produto inválido ou preço incorreto.',
        });
        return;
    }

    const valorProduto = produto.preco;
    const total = valorProduto + fretePadrao;
    carrinho.push({
        id: produto.id,
        nome: produto.nome,
        preco: valorProduto,
        frete: fretePadrao,
        total: total,
        imagem: produto.imagem || ""
    });
    salvarCarrinho();

    Swal.fire({
        icon: 'success',
        title: 'Adicionado ao carrinho',
        html: `Produto: <strong>${produto.nome}</strong><br>
               Valor: <strong>R$ ${valorProduto.toFixed(2).replace('.', ',')}</strong><br>
               Taxa de entrega: <strong>R$ ${fretePadrao.toFixed(2).replace('.', ',')}</strong><br>
               Total: <strong>R$ ${total.toFixed(2).replace('.', ',')}</strong>`,
        confirmButtonText: 'Continuar comprando',
    });
}

function exibirProdutos() {
    if (!el.listaProdutos || !el.templateCard) return;
    el.listaProdutos.innerHTML = "";

    if (produtos.length === 0) {
        el.listaProdutos.innerHTML = `<div style="width:100%; text-align:center; color:#666; padding: 48px 0;">Nenhum produto cadastrado ainda.</div>`;
        return;
    }

    produtos.forEach((produto) => {
        const clone = el.templateCard.content.cloneNode(true);
        const imagemEl = clone.querySelector(".img-vitrine");
        const tituloEl = clone.querySelector(".titulo-vitrine");
        const precoEl = clone.querySelector(".preco-vitrine");
        const btnEditar = clone.querySelector(".btn-editar");
        const btnExcluir = clone.querySelector(".btn-excluir");

        if (imagemEl) {
            imagemEl.src = produto.imagem || "https://via.placeholder.com/300x200?text=Produto";
            imagemEl.alt = produto.nome;
        }
        if (tituloEl) tituloEl.textContent = produto.nome;
        if (precoEl) precoEl.textContent = `R$ ${produto.preco.toFixed(2).replace(".", ",")}`;

        const btnAdicionarCarrinho = clone.querySelector(".btn-add-cart");
        if (btnAdicionarCarrinho) {
            btnAdicionarCarrinho.addEventListener("click", () => adicionarAoCarrinho(produto));
        }
        if (btnEditar) {
            btnEditar.addEventListener("click", () => abrirModalEdicao(produto));
        }
        if (btnExcluir) {
            btnExcluir.addEventListener("click", () => excluirProduto(produto.id));
        }

        el.listaProdutos.appendChild(clone);
    });
}

function inicializarProdutos() {
    carregarProdutos();
    carregarCarrinho();
    exibirProdutos();

    if (el.btnAbrirModal) {
        el.btnAbrirModal.addEventListener("click", abrirModalCadastro);
    }

    if (el.btnFecharModal) {
        el.btnFecharModal.addEventListener("click", fecharModal);
    }

    if (el.modalProdutoInfo) {
        el.modalProdutoInfo.addEventListener("click", (event) => {
            if (event.target === el.modalProdutoInfo) {
                fecharModal();
            }
        });
    }

    if (el.formProduto) {
        el.formProduto.addEventListener("submit", salvarProduto);
    }
}

document.addEventListener("DOMContentLoaded", inicializarProdutos);
