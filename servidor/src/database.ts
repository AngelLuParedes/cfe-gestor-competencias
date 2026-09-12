import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import data from './data.js';

// Lee el .env si existe. Si no existe, usa data.ts (tu desarrollo normal)
dotenv.config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || data.database.host,
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || data.database.user,
  password: process.env.DB_PASSWORD || data.database.password,
  database: process.env.DB_NAME     || data.database.database,
});

pool.getConnection()
  .then(connection => {
    pool.releaseConnection(connection);
    console.log('Conexión exitosa a MariaDB');
  })
  .catch(err => {
    console.error('ERROR al conectar con MariaDB:', err.message);
    console.error('Verifica el archivo .env o data.ts');
  });

export default pool;