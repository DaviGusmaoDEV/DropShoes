document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const prodId = params.get('id');
    const container = document.getElementById('detalhe-produto');

    try {
        const res = await fetch('/api/produtos');
        const produtos = await res.json();
        const p = produtos.find(item => item.id == prodId);

        if (p) {
            // Tratamento de tamanhos (Array ou String separada por vírgula)
            const listaTamanhos = Array.isArray(p.tamanhos) ? p.tamanhos : (p.tamanhos ? p.tamanhos.split(',') : []);
            let opcoes = listaTamanhos.map(t => `<option value="${t.trim()}">${t.trim()}</option>`).join('');

            container.innerHTML = `
                <div class="produto-detalhe-imagem">
                    <img src="${p.foto}" alt="${p.nome}" style="width: 100%; height: auto; border-radius: var(--radius-lg);">
                </div>
                <div class="produto-detalhe-info">
                    <h1 style="font-size: 2.5rem; letter-spacing: -1px; margin-bottom: 10px;">${p.nome}</h1>
                    <div class="preco-grande" style="font-size: 2rem; color: var(--dark); font-weight: 800; margin-bottom: 25px;">
                        R$ ${Number(p.preco).toFixed(2)}
                    </div>
                    
                    <div class="form-group">
                        <label>Tamanho Disponível</label>
                        <select id="tamanho-selecionado" class="form-control" style="font-size: 1rem; padding: 15px;">
                            ${opcoes}
                        </select>
                    </div>

                    <button class="btn btn-dark" style="padding: 18px; font-size: 1rem; margin-top: 10px;" 
                            onclick="adicionarDetalheAoCarrinho(${p.id}, '${p.nome}', ${p.preco})">
                        ADICIONAR AO CARRINHO
                    </button>
                </div>
            `;
        } else {
            container.innerHTML = `<p>Produto não encontrado.</p>`;
        }
    } catch (err) {
        container.innerHTML = `<p>Erro ao carregar detalhes. Verifique a conexão com o servidor.</p>`;
    }
});

// A função de adicionar já está definida no main.js, mas o botão chama esta ponte:
function adicionarDetalheAoCarrinho(id, nome, preco) {
    const tamanho = document.getElementById('tamanho-selecionado').value;
    salvarNoCarrinho(id, nome, preco, tamanho); // Função que criamos no seu main.js
}