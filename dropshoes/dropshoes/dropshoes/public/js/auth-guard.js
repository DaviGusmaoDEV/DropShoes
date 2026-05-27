document.addEventListener(
    'DOMContentLoaded',
    () => {

        const usuario =
            JSON.parse(
                localStorage.getItem('usuario')
            );

        if (!usuario) {

            Swal.fire({
                icon: 'warning',
                title: 'Faça login'
            }).then(() => {

                window.location.href =
                    'login.html';
            });

            return;
        }

        if (usuario.role !== 'admin') {

            Swal.fire({
                icon: 'error',
                title: 'Acesso negado'
            }).then(() => {

                window.location.href =
                    'index.html';
            });
        }
    }
);