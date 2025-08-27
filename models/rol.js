// models/rol.js
const db = require('../config/config');
const Rol = {};

Rol.create = (id_user, id_rol, result) => {
  const sql = `
    INSERT INTO user_has_roles (id_user, id_rol, created_at, updated_at)
    VALUES (?, ?, NOW(), NOW())
  `;
  db.query(sql, [id_user, id_rol], (err, res) => {
    if (err) return result(err);
    return result(null, res.insertId);
  });
};

module.exports = Rol;
