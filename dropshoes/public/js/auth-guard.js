// js/auth-guard.js
document.addEventListener("DOMContentLoaded", () => {
    const usuario = JSON.parse(localStorage.getItem('usuario'));

    // Se não estiver logado OU se não for administrador, chuta de volta para o login
    if (!usuario || usuario.role !== 'admin') {
        alert("Acesso negado! Esta área é exclusiva para administradores.");
        window.location.href = 'login.html';
    }
});