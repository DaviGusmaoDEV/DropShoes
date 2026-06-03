const API_BASE =
    window.location.hostname === 'localhost'
        ? 'http://localhost:3000'
        : 'https://dropshoes-repd.onrender.com';

const usuario =
    JSON.parse(localStorage.getItem('usuario'));

if (!usuario || usuario.role !== 'admin') {

    window.location.href = 'login.html';
}

async function cadastrarProduto(event) {

    event.preventDefault();

    try {

        const formData = new FormData();

        formData.append(
            'nome',
            document.getElementById('nome').value
        );

        formData.append(
            'preco',
            document.getElementById('preco').value
        );

        formData.append(
            'tamanhos',
            document.getElementById('tamanhos').value
        );

        const foto =
            document.getElementById('foto').files[0];

        if (foto) {
            formData.append('foto', foto);
        }

        const res = await fetch(
            `${API_BASE}/api/produtos`,
            {
                method: 'POST',
                body: formData
            }
        );

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.erro);
        }

        Swal.fire({
            icon: 'success',
            title: 'Produto cadastrado'
        });

        document
            .getElementById('form-produto')
            .reset();

    } catch (err) {

        console.error(err);

        Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: err.message
        });
    }
}

function logout() {

    localStorage.removeItem('usuario');

    window.location.href = 'index.html';
}