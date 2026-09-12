<div align="center">

# ⚙️ Sistema Integral de Capacitación y Escalafón

[![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.io/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MariaDB](https://img.shields.io/badge/MariaDB-003545?style=for-the-badge&logo=mariadb&logoColor=white)](https://mariadb.org/)

Plataforma web para la centralización, administración y análisis de competencias del personal operativo en **CFE**.

</div>

---

## 📌 Descripción General

Plataforma web desarrollada para administrar el historial de capacitación y desarrollo profesional de más de **700 trabajadores**. El sistema optimiza el control de vigencias y automatiza la carga administrativa mediante la importación masiva de datos y la generación dinámica de constancias oficiales.

> [!IMPORTANT]
> **Impacto Operativo:** Diseñado para sustituir la gestión manual de documentos, automatizando la evaluación de competencias para ascensos y reduciendo tiempos en la emisión de certificados oficiales (DC-3 y CCHL).

---

## 🚀 Características Principales

- [x] **Trazabilidad y Escalafón:** Historial completo del trabajador con comparador de puestos para identificar brechas de capacitación hacia ascensos.
- [x] **Procesamiento Masivo (Excel):** Módulo de data entry que extrae e integra cientos de registros automáticamente mediante la carga de archivos formateados.
- [x] **Automatización Documental:** Emisión masiva o individual de certificados en PDF maquetados sobre plantillas gubernamentales oficiales (DC-3 / CCHL).
- [x] **Gestión de Alertas y Vigencias:** Monitor inteligente con contador de caducidades para prevenir la expiración de licencias o cursos.
- [x] **Seguridad y Control de Acceso:** Autenticación con contraseñas encriptadas, recuperación de credenciales y administración CRUD de usuarios, cursos y trabajadores.

---

## 🛠️ Tecnologías y Herramientas

| Capa | Tecnologías |
| :--- | :--- |
| **Frontend** | Angular, TypeScript, HTML5, CSS3 |
| **Backend** | Node.js, Express |
| **Base de Datos** | MariaDB |
| **Herramientas** | Multer, SheetJS (xlsx), PDFKit / PDF-lib |

---

## 🎓 Contexto del Proyecto

* **Autor:** Angel Luis Pérez Paredes
* **Perfil:** Full Stack Developer | Ingeniero en Computación (UAEM Valle de Chalco)
* **Repositorio:** https://github.com/AngelLuParedes/cfe-gestor-competencias.git

---

## 💡 Instalación y Uso

> [!TIP]
> Asegúrate de tener instalado **Node.js** (v18+) y un servidor activo de **MariaDB** antes de continuar.

1. **Clonar el repositorio:**
   ```bash
   git clone [https://github.com/AngelLuParedes/cfe-gestor-competencias.git](https://github.com/AngelLuParedes/cfe-gestor-competencias.git)
   cd cfe-gestor-competencias
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configuración de Variables de Entorno:**
   Crea o edita el archivo `.env` en la raíz del backend con tus credenciales de MariaDB:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_USER=tu_usuario
   DB_PASSWORD=tu_contraseña
   DB_NAME=cfe_capacitacion
   JWT_SECRET=tu_clave_secreta
   ```

### 🚀 Ejecución del Proyecto

#### 🖥️ Backend (Servidor)
```bash
# Entorno de desarrollo
npm run dev

# Compilación para producción
npm run build
```

#### 💻 Frontend (Cliente)
```bash
npm start
```
