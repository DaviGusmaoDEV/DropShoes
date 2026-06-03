/**
 * SISTEMA INTEGRADO DELICIAS DA LUCY - VERSÃO CORRIGIDA
 */

// Objeto DOM para busca segura de elementos
const DOM = {
    get: () => ({
        corpoTabela: document.getElementById('corpo-tabela-fluxo-caixa'),
        modalAdicionar: document.getElementById('modalTransacao'),
        modalEditar: document.getElementById('modalEditar'),
        modalExclusao: document.getElementById('modalExclusao'),
        formAdicionar: document.getElementById('form-transacao')
    })
};

const App = {
    state: {
        transacoes: JSON.parse(localStorage.getItem('mock_transacoes')) || [],
        usuario: JSON.parse(localStorage.getItem("usuario_logado")) || { nome: "Visitante", email: "", regra: "cliente" },
        categorias: JSON.parse(localStorage.getItem("lucy_categorias")) || ["Hype Running", "Retro Classic"]
    },

    init() {
        this.initPerfil();
        this.initFluxoCaixa();
        this.initCategorias();
        this.initAuthHandlers();
    },

    // MÉTODOS DE MODAL (Agora acessíveis pelo HTML)
    abrirModal(nome) {
        const dom = DOM.get();
        if (nome === 'Adicionar') dom.modalAdicionar?.showModal();
        if (nome === 'Editar') dom.modalEditar?.showModal();
        if (nome === 'Exclusao') dom.modalExclusao?.showModal();
    },

    fecharModal(nome) {
        const dom = DOM.get();
        if (nome === 'Adicionar') dom.modalAdicionar?.close();
        if (nome === 'Editar') dom.modalEditar?.close();
        if (nome === 'Exclusao') dom.modalExclusao?.close();
    },

    // FLUXO DE CAIXA
    initFluxoCaixa() {
        const dom = DOM.get();
        dom.formAdicionar?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.state.transacoes.unshift({
                descricao: document.getElementById('descricao').value,
                tipo: document.getElementById('tipo').value,
                valor: parseFloat(document.getElementById('valor').value),
                data: document.getElementById('data').value
            });
            this.salvar();
            this.renderTabela(this.state.transacoes);
            dom.modalAdicionar?.close();
            dom.formAdicionar.reset();
        });
        this.renderTabela(this.state.transacoes);
    },

    renderTabela(lista) {
        const corpo = document.getElementById('corpo-tabela-fluxo-caixa');
        if (!corpo) return;
        corpo.innerHTML = lista.map((t, i) => `
            <tr>
                <td>${t.data}</td>
                <td>${t.descricao}</td>
                <td>R$ ${Number(t.valor).toFixed(2)}</td>
                <td><button onclick="App.deletar(${i})">Excluir</button></td>
            </tr>
        `).join('');
    },

    filtrarFluxoCaixa() {
        const inicio = document.getElementById('data-inicial').value;
        const fim = document.getElementById('data-final').value;
        if (!inicio || !fim) return this.renderTabela(this.state.transacoes);
        
        const filtradas = this.state.transacoes.filter(t => t.data >= inicio && t.data <= fim);
        this.renderTabela(filtradas);
    },

    deletar(i) {
        this.state.transacoes.splice(i, 1);
        this.salvar();
        this.renderTabela(this.state.transacoes);
    },

    salvar() {
        localStorage.setItem('mock_transacoes', JSON.stringify(this.state.transacoes));
        localStorage.setItem('lucy_categorias', JSON.stringify(this.state.categorias));
    },

    // Outros métodos necessários...
    initPerfil() { /* ... */ },
    initCategorias() { /* ... */ },
    initAuthHandlers() { /* ... */ }
};

// Vinculação Global
document.addEventListener("DOMContentLoaded", () => App.init());
window.App = App;
window.filtrarFluxoCaixa = () => App.filtrarFluxoCaixa();