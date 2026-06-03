// fluxo-caixa.js
const el = {
    modalTransacao: document.getElementById("modalTransacao"),
    formTransacao: document.getElementById("form-transacao"),
    btnAbrirTransacao: document.getElementById("btnAbrirModalTransacao"),
    btnFecharTransacao: document.getElementById("btnFecharModalTransacao-add"),
    btnFecharModalEdicao: document.getElementById("btn-edicao-fechar"),
    btnSalvarEdicao: document.getElementById("btnSalvarTransacao"),
    btnAbrirEdicao: document.getElementById("btn-edicao"),
    dialogEdicao: document.getElementById("modalEditar"),
    btnExcluirTransacao: document.getElementById("btnExcluirTransacao"),
    inputDescricao: document.getElementById("descricao"),
    selectTipo: document.getElementById("tipo"),
    inputValor: document.getElementById("valor"),
    inputData: document.getElementById("data"),
};

let transacoes = [];

// Carregar transações do localStorage se existirem
if (localStorage.getItem("transacoes")) {
    transacoes = JSON.parse(localStorage.getItem("transacoes"));
}

// Abrir modal
if (el.btnAbrirTransacao) {
    el.btnAbrirTransacao.addEventListener("click", () => {
        if (el.modalTransacao) {
            el.modalTransacao.showModal();
        }
    });
}

// Fechar modal
if (el.btnFecharTransacao) {
    el.btnFecharTransacao.addEventListener("click", () => {
        if (el.modalTransacao) {
            el.modalTransacao.close();
        }
    });
}

// Fechar modal quando clicar no backdrop
if (el.modalTransacao) {
    el.modalTransacao.addEventListener("click", (e) => {
        if (e.target === el.modalTransacao) {
            el.modalTransacao.close();
        }
    });
}
if (el.btnAbrirEdicao) {
    el.btnAbrirEdicao.addEventListener("click", () => {
        if (el.modalTransacao) {
            el.modalTransacao.showModal();
        }
    });
}
if (el.btnFecharModalEdicao) {
    el.btnFecharModalEdicao.addEventListener("click", () => {
        if (el.modalTransacao) {
            el.modalTransacao.close();
        }
    });
}
if (el.btnExcluirTransacao) {
    el.btnExcluirTransacao.addEventListener("click", () => {
        Swal.fire({
            title: 'Excluir transação?',
            text: 'Essa ação não pode ser desfeita.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sim, excluir',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                const id = parseInt(el.btnExcluirTransacao.dataset.id);
                transacoes = transacoes.filter(t => t.id !== id);
                localStorage.setItem("transacoes", JSON.stringify(transacoes));
                exibirTransacoes();
                if (el.modalTransacao) {
                    el.modalTransacao.close();
                }
                Swal.fire({
                    icon: 'success',
                    title: 'Excluída',
                    text: 'Transação excluída com sucesso.',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        });
    });
}

// Registrar transação ao submeter form
if (el.formTransacao) {
    el.formTransacao.addEventListener("submit", (e) => {
        e.preventDefault();
        
        try {
            const descricao = el.inputDescricao?.value.trim();
            const tipo = el.selectTipo?.value;
            const valor = parseFloat(el.inputValor?.value);
            const data = el.inputData?.value;
            
            // Validações
            if (!descricao) throw new Error("Descrição é obrigatória.");
            if (!tipo) throw new Error("Tipo é obrigatório.");
            if (isNaN(valor) || valor <= 0) throw new Error("Valor deve ser um número positivo.");
            if (!data) throw new Error("Data é obrigatória.");
            
            // Criar transação
            const novaTransacao = {
                id: Date.now(),
                descricao,
                tipo,
                valor,
                data,
                dataCriacao: new Date().toISOString()
            };
            
            // Adicionar ao array
            transacoes.push(novaTransacao);
            
            // Salvar no localStorage
            localStorage.setItem("transacoes", JSON.stringify(transacoes));
            
            console.log("Transação registrada:", novaTransacao);
            console.log("Total de transações:", transacoes);
            Swal.fire({
                icon: 'success',
                title: 'Transação salva',
                text: 'Sua transação foi registrada com sucesso.',
                timer: 1800,
                showConfirmButton: false,
            });
            
            // Limpar formulário
            el.formTransacao.reset();
            
            // Fechar modal
            if (el.modalTransacao) {
                el.modalTransacao.close();
            }
            
            // Atualizar tabela
            exibirTransacoes();
        } catch (erro) {
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: erro.message,
            });
            console.error(erro.message);
        }
    });
}

// Função para exibir transações na tabela
function exibirTransacoes() {
    const corpoTabela = document.getElementById("corpo-tabela-fluxo-caixa");
    const template = document.getElementById("template-linha-transacao");
    
    if (!corpoTabela || !template) return;
    
    // Limpar tabela
    corpoTabela.innerHTML = "";
    
    // Se não há transações, mostrar mensagem
    if (transacoes.length === 0) {
        corpoTabela.innerHTML = '<tr><td colspan="5" style="text-align:center; color: #999;">Nenhuma transação registrada</td></tr>';
        return;
    }
    
    // Adicionar cada transação à tabela
    transacoes.forEach((transacao) => {
        const clone = template.content.cloneNode(true);
        
        // Formatar data (DD/MM/YYYY)
        const data = new Date(transacao.data + "T00:00:00");
        const dataFormatada = data.toLocaleDateString("pt-BR");
        
        // Preencher campos
        clone.querySelector(".col-data").textContent = dataFormatada;
        clone.querySelector(".txt-descricao").textContent = transacao.descricao;
        clone.querySelector(".badge-tipo").textContent = transacao.tipo.charAt(0).toUpperCase() + transacao.tipo.slice(1);
        clone.querySelector(".col-valor").textContent = `R$ ${transacao.valor.toFixed(2).replace(".", ",")}`;
        
        // Adicionar classe de cor baseada no tipo
        if (transacao.tipo === "receita") {
            clone.querySelector(".col-valor").classList.add("status-receita");
            clone.querySelector(".badge-tipo").classList.add("status-receita");
        } else if (transacao.tipo === "despesa") {
            clone.querySelector(".col-valor").classList.add("status-despesa");
            clone.querySelector(".badge-tipo").classList.add("status-despesa");
        }
        else if (transacao.tipo === "total-despesa-funcionario") {
            clone.querySelector(".col-valor").classList.add("status-despesa-funcionario");
            clone.querySelector(".badge-tipo").classList.add("status-despesa-funcionario");
        }
        
        // Adicionar listeners aos botões de editar e excluir
        clone.querySelector(".btn-edicao").addEventListener("click", () => {
            console.log("Editar transação:", transacao);
            // TODO: Implementar edição
                if (el.dialogEdicao) {
                    el.dialogEdicao.showModal();
                }

        });
        
        clone.querySelector(".btn-exclusao").addEventListener("click", () => {
            Swal.fire({
                title: 'Excluir transação?',
                text: 'Essa ação não pode ser desfeita.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sim, excluir',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    transacoes = transacoes.filter(t => t.id !== transacao.id);
                    localStorage.setItem("transacoes", JSON.stringify(transacoes));
                    exibirTransacoes();
                    Swal.fire({
                        icon: 'success',
                        title: 'Excluída',
                        text: 'Transação excluída com sucesso.',
                        timer: 1500,
                        showConfirmButton: false
                    });
                }
            });
        });
        
        corpoTabela.appendChild(clone);
    });
    
    // Calcular e exibir totais após atualizar a tabela
    calcularTotais();
}

// Função para calcular totais de faturamento e despesa
function calcularTotais() {
    let totalFaturamento = 0;
    let totalDespesa = 0;
    let totalDespesaFuncionario = 0;
    
    // Somar receitas e despesas
    transacoes.forEach((transacao) => {
        if (transacao.tipo === "receita") {
            totalFaturamento += transacao.valor;
        } 
        else if (transacao.tipo === "despesa") {
            totalDespesa += transacao.valor;
        }
        else if (transacao.tipo === "total-despesa-funcionario") {
            totalDespesaFuncionario += transacao.valor;
        }
    });
    
    // Calcular saldo líquido
    const saldoLiquido = totalFaturamento - totalDespesa - totalDespesaFuncionario;
    
    // Atualizar elementos do HTML
    const elFaturamento = document.getElementById("total-faturamento");
    const elDespesa = document.getElementById("total-despesa");
    const elDespesaFuncionario = document.getElementById("total-despesa-funcionario");
    const elSaldo = document.getElementById("saldo-liquido");

    if (elFaturamento) {
        elFaturamento.textContent = `R$ ${totalFaturamento.toFixed(2).replace(".", ",")}`;
    }
    
    if (elDespesa) {
        elDespesa.textContent = `R$ ${totalDespesa.toFixed(2).replace(".", ",")}`;
    }
    
    if (elDespesaFuncionario) {
        elDespesaFuncionario.textContent = `R$ ${totalDespesaFuncionario.toFixed(2).replace(".", ",")}`;
    }

    if (elSaldo) {
        elSaldo.textContent = `R$ ${saldoLiquido.toFixed(2).replace(".", ",")}`;
        // Colorir saldo: verde se positivo, vermelho se negativo
        if (saldoLiquido >= 0) {
            elSaldo.style.color = "var(--success)";
        } else {
            elSaldo.style.color = "var(--danger)";
        }
    }
    
    console.log(`Faturamento: R$ ${totalFaturamento.toFixed(2)} | Despesa: R$ ${totalDespesa.toFixed(2)} | Saldo: R$ ${saldoLiquido.toFixed(2)} | Despesa Funcionario: R$ ${totalDespesaFuncionario.toFixed(2)}`);
}

// Carregar e exibir transações ao inicializar a página
document.addEventListener("DOMContentLoaded", () => {
    exibirTransacoes();
});