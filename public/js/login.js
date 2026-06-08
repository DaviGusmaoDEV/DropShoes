document.addEventListener("DOMContentLoaded", () => {
    const formLogin = document.getElementById("form-login");
    if (formLogin) {
        formLogin.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("email").value;
            const senha = document.getElementById("senha").value;
            await realizarLogin(email, senha);
        });
    }

    const formPaciente = document.getElementById("form-cadastro-paciente");
    const formCliente = document.getElementById("form-cadastro-cliente");

    if (formPaciente) {
        formPaciente.addEventListener("submit", (e) => handleCadastro(e, 'paciente'));
    }
    if (formCliente) {
        formCliente.addEventListener("submit", (e) => handleCadastro(e, 'cliente'));
    }
});

async function handleCadastro(e, role) {
    e.preventDefault();
    
    // Captura os dados básicos
    const dados = {
        nome: document.getElementById("nome").value,
        email: document.getElementById("email").value || null,
        senha: document.getElementById("senha").value || null,
        role: role
    };

    // Tenta capturar telefone se existir na página
    const telInput = document.getElementById("telefoneCliente");
    dados.telefone = telInput ? telInput.value : "00000000000"; // Valor padrão se não existir

    try {
        // CORREÇÃO: Usar http, não https
        const resposta = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const resDados = await resposta.json();
        if (!resposta.ok) throw new Error(resDados.erro || "Erro ao cadastrar.");

        Swal.fire({ icon: 'success', title: 'Sucesso!', text: 'Cadastro realizado!', timer: 2000 });
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Erro', text: err.message });
    }
}

async function realizarLogin(email, senha) {
    try {
        // CORREÇÃO: Usar http
        const resposta = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });

        const dados = await resposta.json();
        if (!resposta.ok) throw new Error(dados.erro || "Falha na autenticação.");

        localStorage.setItem('token', dados.token);
        localStorage.setItem('role', dados.role);
        window.location.href = dados.role === 'admin' ? '../tela admin/principal.html' : '../tela cliente/principal.html';
    } catch (erro) {
        Swal.fire({ icon: 'error', title: 'Erro', text: erro.message });
    }
}