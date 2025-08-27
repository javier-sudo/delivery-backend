// controllers/userController.js prueba 2 mejore el controller para prueba
const User = require('../models/user');
const Rol = require('../models/rol');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const keys = require('../config/keys');
const { uploadFile } = require('../utils/storage_supabase'); // IMPORTANTE

module.exports = {
  async login(req, res) {
    try {
      const { login, password } = req.body;

      User.findByEmail(login, async (err, myUser) => {
        if (err) return res.status(500).json({ success: false, message: 'Error interno', error: err });
        if (!myUser) return res.status(401).json({ success: false, message: 'El email no fue encontrado' });

        const isPasswordValid = await bcrypt.compare(password, myUser.passwordHash || '');
        if (!isPasswordValid) return res.status(401).json({ success: false, message: 'Contraseña incorrecta' });

        User.findRolesByUserId(myUser.id, (rErr, roles) => {
          const rolesArr = !rErr && roles ? roles : [];

          const token = jwt.sign(
            { id: myUser.id, email: myUser.email, roles: rolesArr },
            keys.secretOrKey,
            { expiresIn: '8h' }
          );

          const data = {
            id: `${myUser.id}`,
            name: myUser.name,
            lastName: myUser.lastName,
            email: myUser.email,
            phone: myUser.phone,
            photo: myUser.photo,
            rut: myUser.rut,
            roles: rolesArr,
            session_token: `JWT ${token}`
          };

          return res.status(200).json({ success: true, message: 'Usuario autenticado correctamente', data });
        });
      });
    } catch (e) {
      return res.status(500).json({ success: false, message: 'Error interno', error: e.message });
    }
  },

  async register(req, res) {
    try {
      const {
        email,
        rut,
        name,
        last_name,
        lastName,
        phone,
        password
      } = req.body || {};

      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email y password son obligatorios' });
      }

      // 1) Subir imagen si viene archivo
      let photoUrl = null;
      if (req.file && req.file.buffer) {
        const { publicUrl } = await uploadFile(req.file.buffer, req.file.originalname, 'users');
        photoUrl = publicUrl;
      }

      // 2) Normalizar last_name
      const ln = last_name ?? lastName ?? null;

      // 3) Crear usuario
      const user = { email, rut, name, lastName: ln, phone, photo: photoUrl, password };

      User.create(user, (err, newId) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'Email o teléfono ya registrado' });
          }
          return res.status(400).json({ success: false, message: 'Error en registro', error: err });
        }

        const ROLE_CLIENTE_ID = 3; // recuerda poblar la tabla roles

        // ✅ Respondemos SOLO aquí (una sola vez)
        Rol.create(newId, ROLE_CLIENTE_ID, (rErr) => {
          if (rErr) console.warn('No se pudo asignar rol:', rErr);
          return res.status(201).json({
            success: true,
            message: 'El registro se realizó correctamente',
            data: { id: newId, photo: photoUrl }
          });
        });

        // ❌ Eliminado para evitar doble respuesta:
        // User.assignDefaultRole(newId, 'CLIENT', (roleErr) => {
        //   if (roleErr) console.warn('No se pudo asignar rol por defecto:', roleErr);
        //   return res.status(201).json({
        //     success: true,
        //     message: 'El registro se realizó correctamente',
        //     data: { id: newId, photo: photoUrl }
        //   });
        // });
      });
    } catch (e) {
      return res.status(500).json({ success: false, message: 'Error interno', error: e.message });
    }
  }
};


// cambio de prueba para verificar push