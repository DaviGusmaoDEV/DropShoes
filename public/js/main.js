import { realizarLogin } from './login.js';
import { adicionarAoCarrinho } from './carrinho.js';
import Produto from './produto.js';

// Exemplo de execução
if (realizarLogin("admin", "123")) {
    const p1 = new Produto(1, "Notebook", 3500);
    adicionarAoCarrinho(p1);
}