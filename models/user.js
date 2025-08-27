// models/user.js
const db = require('../config/config');
const bcrypt = require('bcrypt');

const User = {};

// ---------- GET by ID ----------
User.findById = (id, result) => {
const sql = `
  SELECT 
      u.id, 
      u.email, 
      u.name, 
      u.rut, 
      u.last_name AS lastName, 
      u.phone, 
      u.photo,
      l.password AS passwordHash,
      CONCAT(
        '[', 
        GROUP_CONCAT(
          CONCAT('{',
                '"id":', CONVERT(ro.id, char),
                ',"name":"', ro.name, '"',
                ',"image":"', IFNULL(ro.image,''), '"',
                ',"route":"', ro.route, '"',
                '}'
          )
        ),
        ']'
      ) AS roles
    FROM users u
    JOIN login l ON l.id_users = u.id
    LEFT JOIN user_has_roles uhr ON uhr.id_user = u.id
    LEFT JOIN roles ro ON ro.id = uhr.id_rol
    WHERE u.id = ?
      AND l.login = u.email
    GROUP BY u.id
  `;
  db.query(sql, [id], (err, rows) => (err ? result(err) : result(null, rows[0] || null)));
};

// ---------- GET by Email con hash de tabla login ----------
User.findByEmail = (email, result) => {
  const sql = `
   SELECT 
        u.id, 
        u.email, 
        u.name, 
        u.rut, 
        u.last_name AS lastName, 
        u.phone, 
        u.photo,
        l.password AS passwordHash,
        CONCAT(
          '[', 
          GROUP_CONCAT(
            CONCAT('{',
                  '"id":', CONVERT(ro.id, char),
                  ',"name":"', ro.name, '"',
                  ',"image":"', IFNULL(ro.image,''), '"',
                  ',"route":"', ro.route, '"',
                  '}'
            )
          ),
          ']'
        ) AS roles
    FROM users u
    JOIN login l ON l.id_users = u.id
    LEFT JOIN user_has_roles uhr ON uhr.id_user = u.id
    LEFT JOIN roles ro ON ro.id = uhr.id_rol
    WHERE u.email = ?
      AND l.login = u.email
    GROUP BY u.id;`;
  db.query(sql, [email], (err, rows) => (err ? result(err) : result(null, rows[0] || null)));
};

// ---------- Roles ----------
User.findRolesByUserId = (userId, result) => {
  const sql = `
    SELECT r.name
    FROM user_has_roles uhr
    JOIN roles r ON r.id = uhr.id_rol
    WHERE uhr.id_user = ?
  `;
  db.query(sql, [userId], (err, rows) => (err ? result(err) : result(null, rows.map(r => r.name))));
};

// ---------- CREATE (users + login + client en TX) ----------
User.create = (user, result) => {
  const ln = user.lastName ?? user.last_name ?? null;

  db.query('START TRANSACTION', (err) => {
    if (err) return result(err);

    db.query(
      `INSERT INTO users (email, rut, name, last_name, phone, photo)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user.email, user.rut || null, user.name || null, ln, user.phone || null, user.photo || null],
      async (e1, resUser) => {
        if (e1) return db.query('ROLLBACK', () => result(e1));

        const userId = resUser.insertId;

        try {
          const hash = await bcrypt.hash(user.password, 10);

          db.query(
            `INSERT INTO login (login, password, id_users, status, created_at)
             VALUES (?, ?, ?, ?, NOW())`,
            [user.email, hash, userId, null],
            (e2) => {
              if (e2) return db.query('ROLLBACK', () => result(e2));

              db.query(
                `INSERT INTO client (user_id, created_at, end_date)
                 VALUES (?, NOW(), NULL)`,
                [userId],
                (e3) => {
                  if (e3) return db.query('ROLLBACK', () => result(e3));
                  db.query('COMMIT', (e4) => (e4 ? result(e4) : result(null, userId)));
                }
              );
            }
          );
        } catch (e) {
          return db.query('ROLLBACK', () => result(e));
        }
      }
    );
  });
};

// ---------- Rol por defecto ----------
User.assignDefaultRole = (userId, roleName, result) => {
  const sql = `
    INSERT INTO user_has_roles (id_user, id_rol)
    SELECT ?, r.id
    FROM roles r
    WHERE r.name = ?
    ON DUPLICATE KEY UPDATE id_user = id_user
  `;
  db.query(sql, [userId, roleName], (err) => (err ? result(err) : result(null, true)));
};

module.exports = User;
