// connection to MySQL database

const mysql = require("mysql");

const sqlConection = mysql.createConnection({
    host: 'localhost',
    database: 'sharedatas',
    user: 'root',
    password: 'password'
})

module.exports = sqlConection;