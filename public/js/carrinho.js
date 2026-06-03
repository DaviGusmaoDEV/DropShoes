// carrinho.js
const carrinho = [];

export function adicionarAoCarrinho(produto) {
    try {
        if (produto.validar()) {
            carrinho.push(produto);
            console.log(`Sucesso: ${produto.nome} adicionado!`);
        }
    } catch (erro) {
        alert(erro.message); // Alerta visual se estiver no navegador
        console.error(erro.message);
    }
}