// login.js
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
        alert(erro.message);
        return false;
    }
}