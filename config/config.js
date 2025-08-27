// db.js
const mysql = require('mysql');

const db = mysql.createConnection({
  host: '201.148.104.102',              // o 'gessof.cl'
  user: 'gessofcl_niko',
  password: 'kteap2D,qJv$',
  database: 'gessofcl_prueba_udemy_delivery',
  port: 3306
});

db.connect(err => {
  if (err) {
    console.error('❌ Error de conexión:', err.code, err.message);
    return;
  }
  console.log('✅ Conectado a MySQL remoto');
});

module.exports = db;
