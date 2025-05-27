// js/db.js
const mysql = require('mysql2/promise'); // Sử dụng promise API để dễ làm việc với async/await

// KHÔNG cần require('dotenv').config() ở đây nữa
// vì server.js đã load các biến môi trường rồi.
// Các biến này sẽ có sẵn trong process.env khi db.js được require.

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;