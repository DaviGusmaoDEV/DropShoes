// login.js
const el ={
    inputNome: document.getElementById("nomeCompleto"),
    inputEmail: document.getElementById("emailCadastro"),
    inputTelefone: document.getElementById("telefoneCadastro"),
    inputSenha: document.getElementById("senhaCadastro")
}
function maskEmail(emailCadastro) {
  // Regex para capturar: 1ª letra, restante do nome, o @, e o domínio
  return emailCadastro.replace(/^(.)(.*)(.@.*)$/, (_, a, b, c) => {
    return a + b.replace(/./g, '*') + c;
  });
}

const original = "usuarioexemplo@dominio.com";
const masked = maskEmail(original); 
// Resultado: u***********o@dominio.com






export function realizarLogin(usuario, senha) {
    try {
        if (!usuario || !senha) {
            throw new Error("Erro: Usuário e senha são obrigatórios.");
        }
        
        if (usuario !== "admin") {
            throw new Error("Erro: Credenciais inválidas.");
        }

        console.log("Login realizado com sucesso!");
        return true;
    } catch (erro) {
        Swal.fire({
            icon: 'error',
            title: 'Erro de login',
            text: erro.message,
        });
        return false;
    }
}