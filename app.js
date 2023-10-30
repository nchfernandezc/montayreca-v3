const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
require('dotenv').config();

const bcrypt = require('bcrypt');
const mysql = require('mysql');
const connection = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, 'public')));

connection.connect((err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err);
    return;
  }
  console.log('Conectado a la base de datos MySQL'); 
});

app.post('/register', async (req, res) => {
    const { name, username, password } = req.body;
  
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const sql = 'INSERT INTO user (name, username, password) VALUES (?, ?, ?)';
      connection.query(sql, [name, username, hashedPassword], (err, result) => {
        if (err) {
          console.error('Error al registrar al usuario:', err);
          //res.status(500).send('Error al registrar al usuario');
        } else {
          console.log('Usuario registrado');
          res.status(200).send({ message: 'Registro completado' });
        }
      });
    } catch (error) {
      console.error('Error al registrar al usuario:', error);
      res.status(500).send('Error al registrar al usuario');
    }
  });
  

  app.post('/authenticate', async (req, res) => {
    const { username, password } = req.body;
  
    try {
      const sql = 'SELECT * FROM user WHERE username = ?';
      connection.query(sql, [username], async (err, results) => {
        if (err) {
          return res.sendStatus(500); 
        }
        if (results.length === 0) {
          return res.sendStatus(404); 
        }
  
        const user = results[0];
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (isPasswordCorrect) {
          return res.sendStatus(200);
        } else {
          return res.sendStatus(401); 
        }
      });
    } catch (error) {
      console.error('Error:', error);
      return res.sendStatus(500); 
    }
  });
  

app.listen(3000, () => {
  console.log('Servidor iniciado en el puerto 3000...');
});

module.exports = app;
