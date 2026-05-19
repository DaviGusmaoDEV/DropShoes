const user = JSON.parse(localStorage.getItem('usuario'));
if (!user || user.role !== 'admin') {
    window.location.href = '/index.html';
}

async function cadastrarProduto(event) {
    event.preventDefault();

    const formData = new FormData();
    formData.append('nome', document.getElementById('nome').value);
    formData.append('preco', document.getElementById('preco').value);
    formData.append('tamanhos', document.getElementById('tamanhos').value);
    formData.append('foto', document.getElementById('foto').files[0]);

    const res = await fetch('/api/produtos', {
        method: 'POST',
        body: formData
    });

    if (res.ok) {
        alert('Tênis cadastrado com sucesso na DropShoes!');
        document.getElementById('form-produto').reset();
    } else {
        alert('Erro ao cadastrar produto.');
    }
}

function logout() {
    localStorage.removeItem('usuario');
    window.location.href = '/index.html';
}
