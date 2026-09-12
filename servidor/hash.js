import bcrypt from 'bcrypt';

const password = 'Admin123!'; 

bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
        console.error('Error al generar el hash:', err);
        return;
    }
    console.log('==================================================');
    console.log('HOLA! AQUÍ TIENES TU HASH PARA MARIADB:');
    console.log('==================================================');
    console.log(hash);
    console.log('==================================================');
    console.log('EJECUTA ESTE SQL EN TU BASE DE DATOS:');
    console.log(`UPDATE usuarios SET password_hash = '${hash}' WHERE email = 'admin@cfe.gob.mx';`);
    console.log('==================================================');
});