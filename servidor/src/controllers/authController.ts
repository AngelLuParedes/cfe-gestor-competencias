import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import pool from "../database.js";
import { esIdentificadorValido } from '../utils/validators.js';

const JWT_SECRET = process.env.JWT_SECRET || "tu_clave_secreta_muy_segura_cambiar_en_produccion";
const JWT_EXPIRES_IN = "24h";

interface TokenPayload {
  id_usuario: number;
  email: string;
  rol: string;
}

class AuthController {
  
  public async register(req: Request, res: Response) {
    const { nombre_usuario, email, password, nombre_completo, rol } = req.body;

    if (!nombre_usuario || !email || !password || !nombre_completo) {
      return res.status(400).json({ 
        message: "Todos los campos son obligatorios" 
      });
    }

    if (!esIdentificadorValido(email)) {
      return res.status(400).json({
        message: "El campo debe ser un correo válido o una clave de 5 caracteres alfanuméricos"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        message: "La contraseña debe tener al menos 6 caracteres" 
      });
    }

    try {
      const verificarExistente = `
        SELECT id_usuario 
        FROM usuarios 
        WHERE email = ? OR nombre_usuario = ?
      `;
      const [existente]: any = await pool.query(verificarExistente, [email, nombre_usuario]);

      if (existente.length > 0) {
        return res.status(409).json({ 
          message: "El correo o nombre de usuario ya está registrado" 
        });
      }

      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      const nuevoUsuario = {
        nombre_usuario,
        email,
        password_hash: passwordHash,
        nombre_completo,
        rol: rol || 'usuario'
      };

      const [resultado]: any = await pool.query(
        'INSERT INTO usuarios SET ?', 
        [nuevoUsuario]
      );

      res.status(201).json({ 
        message: "Usuario registrado exitosamente",
        id_usuario: resultado.insertId
      });

    } catch (error) {
      console.error("Error al registrar usuario:", error);
      res.status(500).json({ message: "Error al registrar usuario" });
    }
  }

  public async login(req: Request, res: Response) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        message: "Email y contraseña son obligatorios" 
      });
    }

    if (!esIdentificadorValido(email)) {
      return res.status(401).json({
        message: "Credenciales incorrectas"
      });
    }

    try {
      const consultaUsuario = `
        SELECT 
          id_usuario,
          nombre_usuario,
          email,
          password_hash,
          nombre_completo,
          rol,
          activo
        FROM usuarios 
        WHERE email = ?
      `;
      const [usuarios]: any = await pool.query(consultaUsuario, [email]);

      if (usuarios.length === 0) {
        return res.status(401).json({ 
          message: "Credenciales incorrectas" 
        });
      }

      const usuario = usuarios[0];

      if (!usuario.activo) {
        return res.status(403).json({ 
          message: "Tu cuenta está desactivada. Contacta al administrador" 
        });
      }

      const passwordValido = await bcrypt.compare(password, usuario.password_hash);

      if (!passwordValido) {
        return res.status(401).json({ 
          message: "Credenciales incorrectas" 
        });
      }

      const payload: TokenPayload = {
        id_usuario: usuario.id_usuario,
        email: usuario.email,
        rol: usuario.rol
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

      await pool.query(
        'UPDATE usuarios SET ultimo_acceso = NOW() WHERE id_usuario = ?',
        [usuario.id_usuario]
      );

      const tokenExpiracion = new Date();
      tokenExpiracion.setHours(tokenExpiracion.getHours() + 24);

      await pool.query(
        `INSERT INTO sesiones (id_usuario, token, ip_address, user_agent, fecha_expiracion) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          usuario.id_usuario,
          token,
          req.ip,
          req.get('user-agent') || 'Unknown',
          tokenExpiracion
        ]
      );

      const usuarioRespuesta = {
        id_usuario: usuario.id_usuario,
        nombre_usuario: usuario.nombre_usuario,
        email: usuario.email,
        nombre_completo: usuario.nombre_completo,
        rol: usuario.rol
      };

      res.json({
        token,
        usuario: usuarioRespuesta,
        mensaje: "Login exitoso"
      });

    } catch (error) {
      console.error("Error en login:", error);
      res.status(500).json({ message: "Error al procesar login" });
    }
  }

  public async logout(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];

      if (token) {
        await pool.query(
          'UPDATE sesiones SET activa = FALSE WHERE token = ?',
          [token]
        );
      }

      res.json({ message: "Sesión cerrada correctamente" });
    } catch (error) {
      console.error("Error en logout:", error);
      res.status(500).json({ message: "Error al cerrar sesión" });
    }
  }

  public async verificarToken(req: Request, res: Response) {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: "Token no proporcionado" });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;

      const [sesiones]: any = await pool.query(
        'SELECT activa FROM sesiones WHERE token = ? AND activa = TRUE',
        [token]
      );

      if (sesiones.length === 0) {
        return res.status(401).json({ message: "Sesión inválida o expirada" });
      }

      res.json({ 
        valido: true,
        usuario: decoded 
      });

    } catch (error) {
      res.status(401).json({ message: "Token inválido" });
    }
  }

  public async cambiarPassword(req: Request, res: Response) {
    const { password_actual, password_nueva } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: "No autorizado" });
    }

    if (!password_actual || !password_nueva) {
      return res.status(400).json({ 
        message: "Contraseña actual y nueva son requeridas" 
      });
    }

    if (password_nueva.length < 6) {
      return res.status(400).json({ 
        message: "La nueva contraseña debe tener al menos 6 caracteres" 
      });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;

      const [usuarios]: any = await pool.query(
        'SELECT password_hash FROM usuarios WHERE id_usuario = ?',
        [decoded.id_usuario]
      );

      if (usuarios.length === 0) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      const passwordValido = await bcrypt.compare(
        password_actual, 
        usuarios[0].password_hash
      );

      if (!passwordValido) {
        return res.status(401).json({ 
          message: "La contraseña actual es incorrecta" 
        });
      }

      const nuevoHash = await bcrypt.hash(password_nueva, 10);

      await pool.query(
        'UPDATE usuarios SET password_hash = ? WHERE id_usuario = ?',
        [nuevoHash, decoded.id_usuario]
      );

      await pool.query(
        'UPDATE sesiones SET activa = FALSE WHERE id_usuario = ? AND token != ?',
        [decoded.id_usuario, token]
      );

      res.json({ message: "Contraseña actualizada correctamente" });

    } catch (error) {
      console.error("Error al cambiar contraseña:", error);
      res.status(500).json({ message: "Error al cambiar contraseña" });
    }
  }

  /**
   * Recuperación de contraseña vía email o clave de 5 caracteres.
   * Genera una contraseña temporal, la hashea con bcrypt y la guarda.
   * Responde de forma genérica siempre (exista o no el usuario) para
   * evitar enumeración de cuentas.
   */
  public async forgotPassword(req: Request, res: Response) {
    const { identificador } = req.body;

    if (!identificador || !esIdentificadorValido(identificador)) {
      return res.status(400).json({ message: "Identificador inválido" });
    }

    try {
      const [usuarios]: any = await pool.query(
        'SELECT id_usuario, email FROM usuarios WHERE email = ? AND activo = 1',
        [identificador]
      );

      if (usuarios.length === 0) {
        return res.status(200).json({
          message: "Si el usuario existe, se enviaron instrucciones"
        });
      }

      const usuario = usuarios[0];
      const passwordTemporal = crypto.randomBytes(6).toString('hex'); // 12 caracteres
      const nuevoHash = await bcrypt.hash(passwordTemporal, 10);

      await pool.query(
        'UPDATE usuarios SET password_hash = ?, fecha_modificacion = NOW() WHERE id_usuario = ?',
        [nuevoHash, usuario.id_usuario]
      );

      await pool.query(
        'UPDATE sesiones SET activa = FALSE WHERE id_usuario = ?',
        [usuario.id_usuario]
      );

      // TODO: reemplazar por envío real (nodemailer/SendGrid) cuando el identificador sea email.
      // Si es una "clave" de 5 caracteres (sin bandeja de correo), definir el canal de entrega
      // de la temporal (pantalla de soporte, aprobación de admin, etc.)
      console.log(`[DEV] Password temporal para ${usuario.email}: ${passwordTemporal}`);

      res.status(200).json({ message: "Si el usuario existe, se enviaron instrucciones" });

    } catch (error) {
      console.error("Error en forgotPassword:", error);
      res.status(500).json({ message: "Error al procesar la solicitud" });
    }
  }

  public async actualizarPerfil(req: Request, res: Response) {
    const { nombre_completo, nombre_usuario } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: "No autorizado" });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;

      const datosActualizar: any = {};
      if (nombre_completo) datosActualizar.nombre_completo = nombre_completo;
      if (nombre_usuario) datosActualizar.nombre_usuario = nombre_usuario;

      if (Object.keys(datosActualizar).length === 0) {
        return res.status(400).json({ message: "No hay datos para actualizar" });
      }

      await pool.query(
        'UPDATE usuarios SET ? WHERE id_usuario = ?',
        [datosActualizar, decoded.id_usuario]
      );

      const [usuarioActualizado]: any = await pool.query(
        'SELECT id_usuario, nombre_usuario, email, nombre_completo, rol FROM usuarios WHERE id_usuario = ?',
        [decoded.id_usuario]
      );

      res.json({ 
        message: "Perfil actualizado correctamente",
        usuario: usuarioActualizado[0]
      });

    } catch (error) {
      console.error("Error al actualizar perfil:", error);
      res.status(500).json({ message: "Error al actualizar perfil" });
    }
  }

  public async listarUsuarios(req: Request, res: Response) {
    try {
      const query = `
        SELECT 
          id_usuario,
          nombre_usuario,
          email,
          nombre_completo,
          rol,
          activo,
          ultimo_acceso,
          fecha_creacion
        FROM usuarios
        ORDER BY fecha_creacion DESC
      `;
      
      const [usuarios] = await pool.query(query);
      res.json(usuarios);
    } catch (error) {
      console.error("Error al listar usuarios:", error);
      res.status(500).json({ message: "Error al obtener usuarios" });
    }
  }
}

const authController = new AuthController();
export default authController;