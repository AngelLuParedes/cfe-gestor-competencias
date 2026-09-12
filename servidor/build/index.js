import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './database.js';
import authRoutes from './rutas/authRoutes.js';
import indexRoutes from './rutas/indexRoutes.js';
import cursoRoutes from './rutas/cursoRoutes.js';
import trabajadoresRoutes from './rutas/trabajadoresRoutes.js';
import constanciasRoutes from './rutas/constanciasRoutes.js';
import catalogosRoutes from './rutas/catalogosRoutes.js';
import cargaExcelRoutes from './rutas/cargaExcelRoutes.js';
import { setPool } from './controllers/cargaExcelController.js';
import vigenciaRoutes from './rutas/vigenciaRoutes.js';
class Server {
    app;
    constructor() {
        // Cargar variables de entorno
        dotenv.config();
        this.app = express();
        this.config();
        this.configurarBaseDeDatos(); // <-- Inicializamos el pool para Excel
        this.rutas();
    }
    config() {
        this.app.set('port', process.env.PORT || 3000);
        // Middlewares
        this.app.use(morgan('dev'));
        this.app.use(cors({
            origin: 'http://localhost:4200',
            credentials: true
        }));
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
    }
    // ✅ MÉTODO PARA COMPARTIR EL POOL CON EL CONTROLADOR DE EXCEL
    configurarBaseDeDatos() {
        setPool(pool);
    }
    rutas() {
        // Endpoint para autenticación
        this.app.use('/api/auth', authRoutes);
        // ✅ NUEVA RUTA DE CARGA MASIVA EXCEL
        this.app.use('/api/carga-excel', cargaExcelRoutes);
        // Resto de rutas de la aplicación
        this.app.use(indexRoutes);
        this.app.use('/app/curso', cursoRoutes);
        this.app.use('/app/trabajadores', trabajadoresRoutes);
        this.app.use('/app/constancias', constanciasRoutes);
        this.app.use('/app/catalogos', catalogosRoutes);
        this.app.use('/app/vigencia', vigenciaRoutes);
    }
    start() {
        this.app.listen(this.app.get('port'), () => {
            console.log('Servidor corriendo en puerto', this.app.get('port'));
        });
    }
}
const server = new Server();
server.start();
//# sourceMappingURL=index.js.map