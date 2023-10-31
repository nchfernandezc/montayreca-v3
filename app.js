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

app.post('/register', async (req, res, next) => {
  try {
    const { name, username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO user (name, username, password) VALUES (?, ?, ?)';
    connection.query(sql, [name, username, hashedPassword], (err, result) => {
      if (err) {
        console.error('Error al registrar al usuario:', err);
        res.status(500).json({ error: 'Error al registrar al usuario. Por favor, inténtelo de nuevo más tarde.' });
      } else {
        console.log('Usuario registrado');
        res.status(200).json({ message: 'Registro completado' });
      }
    });
  } catch (error) {
    console.error('Error al registrar al usuario:', error);
    res.status(500).json({ error: 'Error al registrar al usuario. Por favor, inténtelo de nuevo más tarde.' });
  }
});

app.post('/authenticate', async (req, res, next) => {
    try {
      const { username, password } = req.body;
      const sql = 'SELECT * FROM user WHERE username = ?';
      connection.query(sql, [username], async (err, results) => {
        if (err) {
          return res.status(500).json({ error: 'Error en la autenticación del usuario. Por favor, inténtelo de nuevo más tarde.' });
        }
        if (results.length === 0) {
          return res.status(404).json({ error: 'Usuario no encontrado.' });
        }
  
        const user = results[0];
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (isPasswordCorrect) {
            console.log("usuario autenticado");
          // No envíes el mensaje de autenticación exitosa si no quieres mostrarlo al usuario
          return res.status(200).end();
        } else {
          return res.status(401).json({ error: 'Credenciales incorrectas. Por favor, inténtelo de nuevo.' });
        }
      });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: 'Error en la autenticación del usuario. Por favor, inténtelo de nuevo más tarde.' });
    }
  });
  
  app.post('/submit_request', (req, res) => {
    try {
      const { id, fecha, tipo_de_requerimiento, descripcion, nota } = req.body;
      const sql = 'INSERT INTO solicitud (id, fecha, tipo_de_requerimiento, descripcion, nota) VALUES (?, ?, ?, ?, ?)';
      connection.query(sql, [id, fecha, tipo_de_requerimiento, descripcion, nota], (err, result) => {
        if (err) {
          console.error('Error al insertar los datos en la tabla de solicitud:', err);
          res.status(500).json({ error: 'Error al enviar el formulario de requerimientos. Por favor, inténtelo de nuevo más tarde.' });
        } else {
          console.log('Datos insertados correctamente en la tabla de solicitud');
          res.status(200).json({ message: 'El formulario de requerimientos se ha enviado correctamente' });
        }
      });
    } catch (error) {
      console.error('Error al manejar el formulario de requerimientos:', error);
      res.status(500).json({ error: 'Error al manejar el formulario de requerimientos. Por favor, inténtelo de nuevo más tarde.' });
    }
  });
  

app.listen(3000, () => {
  console.log('Servidor iniciado en el puerto 3000...');
});
