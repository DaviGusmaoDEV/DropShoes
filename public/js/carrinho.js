// carrinho.js
const carrinho = [];

export function adicionarAoCarrinho(produto) {
    try {
        if (produto.validar()) {
            carrinho.push(produto);
            console.log(`Sucesso: ${produto.nome} adicionado!`);
        }
    } catch (erro) {
        Swal.fire({
            icon: 'error',
            title: 'Erro no carrinho',
            text: erro.message,
        });
        console.error(erro.message);
    }
}