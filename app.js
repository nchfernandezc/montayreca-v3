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
    const { cedula_rif, nombre_razon_social, telefono, direccion, email, password, itip } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO usuarios (cedula_rif, nombre_razon_social, telefono, direccion, email, password, itip) VALUES (?, ?, ?, ?, ?, ?, ?)';
    connection.query(sql, [cedula_rif, nombre_razon_social, telefono, direccion, email, hashedPassword, itip], (err, result) => {
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

// ... Código existente ...

let authenticatedUserId; // Variable para almacenar el ID del usuario autenticado

// ... Código existente ...

app.post('/authenticate', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        const sql = 'SELECT id, password, itip FROM usuarios WHERE username = ?'; // Selecciona el ID del usuario en la consulta
        connection.query(sql, [username], async (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Error en la autenticación del usuario. Por favor, inténtelo de nuevo más tarde.' });
            }
            if (results.length === 0) {
                return res.status(404).json({ error: 'Usuario no encontrado.' });
            }

            const user = results[0];
            authenticatedUserId = user.id; // Almacena el ID del usuario en la variable authenticatedUserId

            const itip = user.itip;
            console.log(`usuario autenticado - username: ${username}, password: ${password}, itip: ${itip}, userId: ${authenticatedUserId}`); // Agrega el ID del usuario al console.log

            if (itip === 1) {
                res.status(200).json({ success: true, itip: 1, userId: authenticatedUserId }); // Agrega el ID del usuario al JSON de respuesta
            } else {
                // Obtén los formularios relacionados con el ID del usuario
                connection.query('SELECT * FROM solicitudes WHERE id_usuario = ?', [authenticatedUserId], (err, results) => {
                    if (err) {
                        console.error('Error al obtener los formularios del usuario:', err);
                        res.status(500).json({ error: 'Error al obtener los formularios del usuario. Por favor, inténtelo de nuevo más tarde.' });
                    } else {
                        const formIds = results.map(result => result.id); // Obtén los IDs de los formularios del usuario
                        // Envía los IDs de los formularios al cliente
                        res.status(200).json({ success: true, itip: 0, userId: authenticatedUserId, formIds: formIds });
                    }
                });
            }
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Error en la autenticación del usuario. Por favor, inténtelo de nuevo más tarde.' });
    }
});

// ... Código existente ...



  
app.post('/submit_request', (req, res) => {
  try {
      const { fecha, tipo_de_requerimiento, descripcion, nota } = req.body;
      const id_usuario = authenticatedUserId; // Obtén el ID del usuario autenticado desde la variable authenticatedUserId
      const sql = 'INSERT INTO solicitudes (fecha, tipo_de_requerimiento, descripcion, nota, id_usuario) VALUES (?, ?, ?, ?, ?)';
      connection.query(sql, [fecha, tipo_de_requerimiento, descripcion, nota, id_usuario], (err, result) => {
          if (err) {
              console.error('Error al insertar los datos en la tabla de solicitudes:', err);
              res.status(500).json({ error: 'Error al enviar el formulario de requerimientos. Por favor, inténtelo de nuevo más tarde.' });
          } else {
              console.log('Datos insertados correctamente en la tabla de solicitudes');

              // Ahora obtenemos el ID del formulario insertado y lo asignamos a formId
              connection.query('SELECT LAST_INSERT_ID() as formId', (err, result) => {
                  if (err) {
                      console.error('Error al obtener el ID del formulario:', err);
                  } else {
                      const formId = result[0].formId; // Suponiendo que 'result' es un array con un solo elemento

                      // Aquí obtenemos otros detalles del formulario y los mostramos junto con el ID del formulario
                      connection.query('SELECT * FROM solicitudes WHERE id = ?', [formId], (err, result) => {
                          if (err) {
                              console.error('Error al obtener los datos del formulario:', err);
                              res.status(500).json({ error: 'Error al obtener los datos del formulario. Por favor, inténtelo de nuevo más tarde.' });
                          } else {
                              const { fecha, tipo_de_requerimiento, descripcion, nota } = result[0];
                              // Puedes mostrar estos datos junto con el ID del formulario
                              const formDetails = `
                                  <p class="categoria-texto" id="formularioID">
                                      ID de formulario: ${formId}<br>
                                      Fecha: ${fecha}<br>
                                      Tipo de requerimiento: ${tipo_de_requerimiento}<br>
                                      Descripción: ${descripcion}<br>
                                      Nota: ${nota}
                                  </p>`;
                              res.status(200).json({ formId: formId, message: 'El formulario de requerimientos se ha enviado correctamente', formDetails: formDetails });
                          }
                      });
                  }
              });
          }
      });
  } catch (error) {
      console.error('Error al manejar el formulario de requerimientos:', error);
      res.status(500).json({ error: 'Error al manejar el formulario de requerimientos. Por favor, inténtelo de nuevo más tarde.' });
  }
});

// ... Código existente ...

app.post('/fetch_request_details', (req, res) => {
  try {
      const { formId } = req.body;
      // Obtén los detalles del formulario en base al ID del formulario y formatea la fecha en el formato deseado
      connection.query('SELECT id, DATE_FORMAT(fecha, "%d %b %Y") AS fecha, tipo_de_requerimiento, descripcion, nota, istatus FROM solicitudes WHERE id = ? ORDER BY id', [formId], (err, result) => {
          if (err) {
              console.error('Error al obtener los detalles del formulario:', err);
              res.status(500).json({ error: 'Error al obtener los detalles del formulario. Por favor, inténtelo de nuevo más tarde.' });
          } else {
              const { id, fecha, tipo_de_requerimiento, descripcion, nota, istatus } = result[0];
              // Enviar los detalles del formulario al cliente
              const responseData = { 
                  formId: id, 
                  fecha: fecha, 
                  tipo_de_requerimiento: tipo_de_requerimiento, 
                  descripcion: descripcion, 
                  nota: nota,
                  istatus: istatus,
              };
              console.log('Datos del formulario enviados:', responseData); // Agregar un console.log aquí
              res.status(200).json(responseData);
          }
      });
  } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Error al obtener los detalles del formulario. Por favor, inténtelo de nuevo más tarde.' });
  }
});

app.post('/update_form_status', (req, res) => {
  try {
      const { formId, istatus } = req.body;
      // Actualiza el estado del formulario en base al ID del formulario
      connection.query('UPDATE solicitudes SET istatus = ? WHERE id = ?', [istatus, formId], (err, result) => {
          if (err) {
              console.error('Error al actualizar el estado del formulario:', err);
              res.status(500).json({ error: 'Error al actualizar el estado del formulario. Por favor, inténtelo de nuevo más tarde.' });
          } else {
              console.log('Estado del formulario actualizado correctamente');
              res.status(200).json({ message: 'Estado del formulario actualizado correctamente' });
          }
      });
  } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Error al actualizar el estado del formulario. Por favor, inténtelo de nuevo más tarde.' });
  }
});

app.get('/fetch_bandeja_data', (req, res) => { 
  try {
    // Realiza la consulta a la base de datos para obtener los datos de la bandeja de formularios
    connection.query('SELECT * FROM solicitudes', (err, result) => {
      if (err) {
        console.error('Error al obtener los datos de la bandeja de formularios:', err);
        res.status(500).json({ error: 'Error al obtener los datos de la bandeja de formularios. Por favor, inténtelo de nuevo más tarde.' });
      } else {
        // Agrega un console log aquí para verificar los datos obtenidos
        console.log('Datos de la bandeja de formularios:', result);

        // Envía los datos de la bandeja de formularios al cliente
        res.status(200).json(result);
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al obtener los datos de la bandeja de formularios. Por favor, inténtelo de nuevo más tarde.' });
  }
});




// ... Resto del código ...



  

app.listen(3000, () => {
  console.log('Servidor iniciado en el puerto 3000...');
});
