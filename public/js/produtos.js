// produto.js
class Produto {
    constructor(id, nome, preco) {
        this.id = id;
        this.nome = nome;
        this.preco = preco;
    }

    validar() {
        if (!this.nome || this.preco <= 0) {
            throw new Error(`Erro: Dados do produto '${this.nome || 'desconhecido'}' inválidos.`);
        }
        return true;
    }
}

export default Produto;