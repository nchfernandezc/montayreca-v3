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
    const { cedula_rif, nombre_razon_social, telefono, direccion, email, password, itip, username } = req.body;

    // Imprime en la consola los datos que se están recibiendo
    console.log('Datos recibidos en el servidor:', {
      cedula_rif: typeof cedula_rif,
      nombre_razon_social: typeof nombre_razon_social,
      telefono: typeof telefono,
      direccion: typeof direccion,
      email: typeof email,
      password: typeof password,
      itip: typeof itip,
      username: typeof username,
    });

    const sql = 'INSERT INTO usuarios (cedula_rif, nombre_razon_social, telefono, direccion, email, password, itip, username) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    connection.query(sql, [cedula_rif, nombre_razon_social, telefono, direccion, email, password, itip, username], (err, result) => {
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

// Ruta para verificar correo electrónico
app.get('/checkEmail', (req, res) => {
  try {
      const { email } = req.query;
      
      // Ejecutar consulta SQL
      connection.query('SELECT * FROM usuarios WHERE email = ?', [email], (error, results) => {
          if (error) {
              console.error('Error en la consulta de correo electrónico:', error);
              res.status(500).json({ error: 'Error en el servidor' });
          } else {
              res.json({ exists: results.length > 0 });
          }
      });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Ruta para verificar nombre de usuario
app.get('/checkUsername', (req, res) => {
  try {
      const { username } = req.query;
      
      // Ejecutar consulta SQL
      connection.query('SELECT * FROM usuarios WHERE username = ?', [username], (error, results) => {
          if (error) {
              console.error('Error en la consulta de nombre de usuario:', error);
              res.status(500).json({ error: 'Error en el servidor' });
          } else {
              res.json({ exists: results.length > 0 });
          }
      });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error en el servidor' });
  }
});


// ... Código existente ...

let authenticatedUserId; // Variable para almacenar el ID del usuario autenticado

// ... Código existente ...

app.post('/authenticate', async (req, res, next) => {
  try {
      const { email, password } = req.body;
      const sql = 'SELECT id, password, itip FROM usuarios WHERE email = ?';
      connection.query(sql, [email], async (err, results) => {
          if (err) {
              return res.status(500).json({ error: 'Error en la autenticación del usuario. Por favor, inténtelo de nuevo más tarde.' });
          }
          if (results.length === 0) {
              return res.status(404).json({ error: 'Usuario no encontrado.' });
          }

          const user = results[0];
          const storedPassword = user.password;

          // Compare entered password with the stored password
          if (password !== storedPassword) {
              return res.status(401).json({ error: 'Contraseña incorrecta.' });
          }

          authenticatedUserId = user.id;
          const itip = user.itip;

          console.log(`usuario autenticado - email: ${email}, password: ${password}, itip: ${itip}, userId: ${authenticatedUserId}`);

          if (itip === 1) {
              res.status(200).json({ success: true, itip: 1, userId: authenticatedUserId });
          } else {
              connection.query('SELECT * FROM solicitudes WHERE id_usuario = ?', [authenticatedUserId], (err, results) => {
                  if (err) {
                      console.error('Error al obtener los formularios del usuario:', err);
                      res.status(500).json({ error: 'Error al obtener los formularios del usuario. Por favor, inténtelo de nuevo más tarde.' });
                  } else {
                      const formIds = results.map(result => result.id);
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


app.post('/fetch_request_details', (req, res) => {
  try {
    const { formId } = req.body;

    // Buscar en la tabla 'solicitudes'
    connection.query(
      'SELECT id, DATE_FORMAT(fecha, "%d %b %Y") AS fecha, tipo_de_requerimiento, descripcion, nota, istatus FROM solicitudes WHERE id = ? ORDER BY id',
      [formId],
      (err, solicitudesResult) => {
        if (err) {
          console.error('Error al obtener los detalles del formulario de solicitudes:', err);
          res.status(500).json({
            error: 'Error al obtener los detalles del formulario de solicitudes. Por favor, inténtelo de nuevo más tarde.',
          });
        } else {
          const responseData = { user: authenticatedUserId };

          if (solicitudesResult.length > 0) {
            responseData.solicitudes = solicitudesResult.map(solicitud => ({
              formId: solicitud.id,
              fecha: solicitud.fecha,
              tipo_de_requerimiento: solicitud.tipo_de_requerimiento,
              descripcion: solicitud.descripcion,
              nota: solicitud.nota,
              istatus: solicitud.istatus,
            }));
          }

          // Buscar en la tabla 'cotizaciones'
          connection.query(
            'SELECT id AS id, DATE_FORMAT(fecha, "%d %b %Y") AS fecha, tipo, descripcion, condiciones_pago, garantia, tiempo_entrega, monto_total, istatus, id_cliente FROM cotizaciones WHERE id = ? ORDER BY id',
            [formId],
            (err, cotizacionesResult) => {
              if (err) {
                console.error('Error al obtener los detalles de la cotización:', err);
                res.status(500).json({
                  error: 'Error al obtener los detalles de la cotización. Por favor, inténtelo de nuevo más tarde.',
                });
              } else {
                if (cotizacionesResult.length > 0) {
                  responseData.cotizaciones = cotizacionesResult.map(cotizacion => ({
                    formId: cotizacion.id,
                    fecha: cotizacion.fecha,
                    tipo_de_requerimiento: cotizacion.tipo,
                    descripcion: cotizacion.descripcion,
                    condiciones_pago: cotizacion.condiciones_pago,
                    garantia: cotizacion.garantia,
                    tiempo_entrega: cotizacion.tiempo_entrega,
                    monto_total: cotizacion.monto_total,
                    istatus: cotizacion.istatus,
                    usuario: cotizacion.id_cliente,
                  }));
                }

                console.log('Datos enviados:', responseData);
                res.status(200).json(responseData);
              }
            }
          );
        }
      }
    );
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'Error al obtener los detalles del formulario. Por favor, inténtelo de nuevo más tarde.',
    });
  }
});

app.get('/fetch_request_details', (req, res) => {
  try {
    const { formId } = req.body;

    // Buscar en la tabla 'solicitudes'
    connection.query(
      'SELECT id, DATE_FORMAT(fecha, "%d %b %Y") AS fecha, tipo_de_requerimiento, descripcion, nota, istatus FROM solicitudes WHERE id = ? ORDER BY id',
      [formId],
      (err, solicitudesResult) => {
        if (err) {
          console.error('Error al obtener los detalles del formulario de solicitudes:', err);
          res.status(500).json({
            error: 'Error al obtener los detalles del formulario de solicitudes. Por favor, inténtelo de nuevo más tarde.',
          });
        } else {
          const responseData = { user: authenticatedUserId };

          if (solicitudesResult.length > 0) {
            responseData.solicitudes = solicitudesResult.map(solicitud => ({
              formId: solicitud.id,
              fecha: solicitud.fecha,
              tipo_de_requerimiento: solicitud.tipo_de_requerimiento,
              descripcion: solicitud.descripcion,
              nota: solicitud.nota,
              istatus: solicitud.istatus,
            }));
          }

          // Buscar en la tabla 'cotizaciones'
          connection.query(
            'SELECT id AS id, DATE_FORMAT(fecha, "%d %b %Y") AS fecha, tipo, descripcion, condiciones_pago, garantia, tiempo_entrega, monto_total, istatus, id_cliente FROM cotizaciones WHERE id = ? ORDER BY id',
            [formId],
            (err, cotizacionesResult) => {
              if (err) {
                console.error('Error al obtener los detalles de la cotización:', err);
                res.status(500).json({
                  error: 'Error al obtener los detalles de la cotización. Por favor, inténtelo de nuevo más tarde.',
                });
              } else {
                if (cotizacionesResult.length > 0) {
                  responseData.cotizaciones = cotizacionesResult.map(cotizacion => ({
                    formId: cotizacion.id,
                    fecha: cotizacion.fecha,
                    tipo_de_requerimiento: cotizacion.tipo,
                    descripcion: cotizacion.descripcion,
                    condiciones_pago: cotizacion.condiciones_pago,
                    garantia: cotizacion.garantia,
                    tiempo_entrega: cotizacion.tiempo_entrega,
                    monto_total: cotizacion.monto_total,
                    istatus: cotizacion.istatus,
                    usuario: cotizacion.id_cliente,
                  }));
                }

                console.log('Datos enviados:', responseData);
                res.status(200).json(responseData);
              }
            }
          );
        }
      }
    );
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'Error al obtener los detalles del formulario. Por favor, inténtelo de nuevo más tarde.',
    });
  }
});

/*
app.post('/fetch_request_details', (req, res) => {
  try {
    const { formId } = req.body;
    // Consulta para obtener detalles de solicitudes
    const sqlSolicitudes = `
      SELECT id, DATE_FORMAT(fecha, "%d %b %Y") AS fecha, tipo_de_requerimiento, descripcion, nota, istatus
      FROM solicitudes
      WHERE id = ? AND id_usuario = ?
      ORDER BY id
    `;

    connection.query(sqlSolicitudes, [formId, authenticatedUserId], (errSolicitudes, solicitudesResult) => {
      if (errSolicitudes) {
        console.error('Error al obtener los detalles del formulario de solicitudes:', errSolicitudes);
        return res.status(500).json({
          error: 'Error al obtener los detalles del formulario de solicitudes. Por favor, inténtelo de nuevo más tarde.',
        });
      }

      if (solicitudesResult.length > 0) {
        // Validar que id_usuario en cada solicitud sea igual a authenticatedUserId
        const validSolicitudes = solicitudesResult.every(solicitud => solicitud.id_usuario === authenticatedUserId);

        if (!validSolicitudes) {
          return res.status(403).json({
            error: 'Acceso no autorizado a los detalles de la solicitud.',
          });
        }

        responseData.solicitudes = solicitudesResult.map(solicitud => ({
          formId: solicitud.id,
          fecha: solicitud.fecha,
          tipo_de_requerimiento: solicitud.tipo_de_requerimiento,
          descripcion: solicitud.descripcion,
          nota: solicitud.nota,
          istatus: solicitud.istatus,
        }));
      }

      // Consulta para obtener detalles de cotizaciones
      const sqlCotizaciones = `
        SELECT id AS id, DATE_FORMAT(fecha, "%d %b %Y") AS fecha, tipo, descripcion, condiciones_pago, garantia, tiempo_entrega, monto_total, istatus, id_cliente
        FROM cotizaciones
        WHERE id = ? AND id_cliente = ?
        ORDER BY id
      `;

      connection.query(sqlCotizaciones, [formId, authenticatedUserId], (errCotizaciones, cotizacionesResult) => {
        if (errCotizaciones) {
          console.error('Error al obtener los detalles de la cotización:', errCotizaciones);
          return res.status(500).json({
            error: 'Error al obtener los detalles de la cotización. Por favor, inténtelo de nuevo más tarde.',
          });
        }

        if (cotizacionesResult.length > 0) {
          // Validar que id_cliente en cada cotización sea igual a authenticatedUserId
          const validCotizaciones = cotizacionesResult.every(cotizacion => cotizacion.id_cliente === authenticatedUserId);

          if (!validCotizaciones) {
            return res.status(403).json({
              error: 'Acceso no autorizado a los detalles de la cotización.',
            });
          }

          responseData.cotizaciones = cotizacionesResult.map(cotizacion => ({
            formId: cotizacion.id,
            fecha: cotizacion.fecha,
            tipo_de_requerimiento: cotizacion.tipo,
            descripcion: cotizacion.descripcion,
            condiciones_pago: cotizacion.condiciones_pago,
            garantia: cotizacion.garantia,
            tiempo_entrega: cotizacion.tiempo_entrega,
            monto_total: cotizacion.monto_total,
            istatus: cotizacion.istatus,
            usuario: cotizacion.id_cliente,
          }));
        }

        console.log('Datos enviados:', responseData);
        res.status(200).json(responseData);
      });
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'Error al obtener los detalles del formulario. Por favor, inténtelo de nuevo más tarde.',
    });
  }
});
*/

app.post('/update_form_status', (req, res) => {
  try {
      const { formId, istatus } = req.body;
      // Actualiza el estado del formulario en base al ID del formulario
      connection.query('UPDATE cotizaciones SET istatus = ? WHERE id = ?', [istatus, formId], (err, result) => {
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


app.get('/fetch_requests_admin', (req, res) => {
  try {
      // Obtén las solicitudes con istatus igual a 0
      connection.query(
          'SELECT id, DATE_FORMAT(fecha, "%d %b %Y") AS fecha, tipo_de_requerimiento, descripcion, nota, istatus ' +
          'FROM solicitudes ' +
          'WHERE istatus = 0 ' +
          'ORDER BY id',
          (err, result) => {
              if (err) {
                  console.error('Error al obtener las solicitudes para el administrador:', err);
                  res.status(500).json({ error: 'Error al obtener las solicitudes para el administrador. Por favor, inténtelo de nuevo más tarde.' });
              } else {
                  const responseData = result.map(request => ({
                      formId: request.id,
                      fecha: request.fecha,
                      tipo_de_requerimiento: request.tipo_de_requerimiento,
                      descripcion: request.descripcion,
                      nota: request.nota,
                  }));

                  res.status(200).json(responseData);
              }
          }
      );
  } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Error al obtener las solicitudes para el administrador. Por favor, inténtelo de nuevo más tarde.' });
  }
});

app.post('/guardar_cotizacion', (req, res) => {
  try {
      const { fecha, tipo, descripcion, condiciones_pago, garantia, tiempo_entrega, monto_total, id_cliente } = req.body;
      const id_usuario = authenticatedUserId; // Obtén el ID del usuario autenticado desde la variable authenticatedUserId

      // Agrega los console.log para imprimir los datos
      console.log('Datos recibidos para cotización:');
      console.log('Fecha:', fecha);
      console.log('Tipo:', tipo);
      console.log('Descripción:', descripcion);
      console.log('Condiciones de pago:', condiciones_pago);
      console.log('Garantía:', garantia);
      console.log('Fecha de entrega:', tiempo_entrega);
      console.log('Monto total:', monto_total);
      console.log('ID de cliente:', id_cliente);

      const sql = 'INSERT INTO cotizaciones (id_usuario, fecha, tipo, descripcion, condiciones_pago, garantia, tiempo_entrega, monto_total, id_cliente) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
      connection.query(sql, [id_usuario, fecha, tipo, descripcion, condiciones_pago, garantia, tiempo_entrega, monto_total, id_cliente], (err, result) => {
          if (err) {
              console.error('Error al insertar los datos en la tabla de cotizaciones:', err);
              res.status(500).json({ error: 'Error al enviar el formulario de requerimientos. Por favor, inténtelo de nuevo más tarde.' });
          } else {
              console.log('Datos insertados correctamente en la tabla de cotizaciones');

              // Aquí obtenemos otros detalles del formulario y los mostramos junto con el ID del formulario
              const formId = result.insertId; // Usamos el ID del formulario insertado directamente desde el resultado

              // Puedes mostrar estos datos junto con el ID del formulario
              const formDetails = `
                  <p class="categoria-texto" id="formularioID">
                      Id de cliente ${id_cliente}<br>
                      ID de formulario: ${formId}<br> 
                      Fecha: ${fecha}<br>
                      Tipo: ${tipo}<br>
                      Descripción: ${descripcion}<br>
                      Condiciones de pago: ${condiciones_pago}<br>
                      Garantía: ${garantia}<br>
                      Fecha de entrega: ${tiempo_entrega}<br>
                      Monto total: ${monto_total}
                  </p>`;

              res.status(200).json({ formId: formId, message: 'El formulario de requerimientos se ha enviado correctamente', formDetails: formDetails });
          }
      });
  } catch (error) {
      console.error('Error al manejar el formulario de requerimientos:', error);
      res.status(500).json({ error: 'Error al manejar el formulario de requerimientos. Por favor, inténtelo de nuevo más tarde.' });
  }
});


// Endpoint para obtener cotizaciones enviadas
app.get('/fetch_requests_enviados', (req, res) => { 
  const id_usuario = authenticatedUserId; // Obtén el ID del usuario autenticado desde la variable authenticatedUserId
  console.log('ID de usuario autenticado:', id_usuario); // Agrega un console.log para imprimir el ID de usuario

  const sql = 'SELECT * FROM cotizaciones WHERE id_usuario = ? AND istatus = 3';
  connection.query(sql, [id_usuario], (err, result) => {
    if (err) {
      console.error('Error al obtener cotizaciones enviadas:', err);
      res.status(500).json({ error: 'Error al obtener cotizaciones enviadas. Por favor, inténtelo de nuevo más tarde.' });
    } else {
      console.log('Datos de cotizaciones enviadas:', result); // Agrega un console.log para imprimir los datos obtenidos
      res.status(200).json(result);
    }
  });
});

/*
app.get('/fetch_request_details', (req, res) => {
  // Lógica para obtener solicitudes desde la base de datos con istatus específico
  const istatusSolicitudes = 1; // Ajusta esto según tu lógica
  console.log('Istatus utilizado para solicitudes:', istatusSolicitudes);

  // Realiza la consulta a la base de datos para obtener solicitudes con istatus específico
  const sqlSolicitudes = 'SELECT * FROM solicitudes WHERE istatus = ?';
  connection.query(sqlSolicitudes, [istatusSolicitudes], (errSolicitudes, solicitudes) => {
    if (errSolicitudes) {
      console.error('Error al obtener solicitudes:', errSolicitudes);
      return res.status(500).json({ error: 'Error al obtener solicitudes.' });
    }

    console.log('Datos de solicitudes:', solicitudes);

    // Lógica para obtener cotizaciones desde la base de datos con istatus específico
    const istatusCotizaciones = [1, 2, 3]; // Ajusta esto según tu lógica, aquí se filtran cotizaciones con istatus 1, 2 y 3
    console.log('Istatus utilizados para cotizaciones:', istatusCotizaciones);

    // Realiza la consulta a la base de datos para obtener cotizaciones con ciertos istatus
    const sqlCotizaciones = 'SELECT * FROM cotizaciones WHERE istatus IN (?)';
    connection.query(sqlCotizaciones, [istatusCotizaciones], (errCotizaciones, cotizaciones) => {
      if (errCotizaciones) {
        console.error('Error al obtener cotizaciones:', errCotizaciones);
        return res.status(500).json({ error: 'Error al obtener cotizaciones.' });
      }

      console.log('Datos de cotizaciones:', cotizaciones);

      // Combina los resultados de solicitudes y cotizaciones en una respuesta única
      const combinedResults = { solicitudes, cotizaciones };
      res.json(combinedResults);
    });
  });
});
*/

// Función para obtener datos de clientes
function obtenerDatosDeClientes(callback) {
  const query = 'SELECT * FROM usuarios';
  connection.query(query, (error, results) => {
    if (error) {
      console.error('Error al obtener datos de clientes:', error);
      callback(error, null);
    } else {
      console.log('Datos de clientes obtenidos con éxito:', results);
      callback(null, results);
    }
  });
}

// Función para obtener datos de solicitudes
function obtenerDatosDeSolicitudes(callback) {
  const query = 'SELECT * FROM solicitudes';
  connection.query(query, (error, results) => {
    if (error) {
      console.error('Error al obtener datos de solicitudes:', error);
      callback(error, null);
    } else {
      console.log('Datos de solicitudes obtenidos con éxito:', results);
      callback(null, results);
    }
  });
}

// Función para obtener datos de cotizaciones
function obtenerDatosDeCotizaciones(callback) {
  const query = 'SELECT * FROM cotizaciones';
  connection.query(query, (error, results) => {
    if (error) {
      console.error('Error al obtener datos de cotizaciones:', error);
      callback(error, null);
    } else {
      console.log('Datos de cotizaciones obtenidos con éxito:', results);
      callback(null, results);
    }
  });
}

// Ruta para obtener datos de reporte
app.get('/api/reporte', (req, res) => {
  const tipoReporte = req.query.tipoReporte;

  switch (tipoReporte) {
    case 'clientes':
      obtenerDatosDeClientes((error, datos) => {
        if (error) {
          console.error('Error al obtener datos de clientes:', error);
          res.status(500).json({ error: 'Error interno del servidor al obtener datos de clientes' });
        } else {
          res.json(datos);
        }
      });
      break;
    case 'solicitudes':
      obtenerDatosDeSolicitudes((error, datos) => {
        if (error) {
          console.error('Error al obtener datos de solicitudes:', error);
          res.status(500).json({ error: 'Error interno del servidor al obtener datos de solicitudes' });
        } else {
          res.json(datos);
        }
      });
      break;
    case 'cotizaciones':
      obtenerDatosDeCotizaciones((error, datos) => {
        if (error) {
          console.error('Error al obtener datos de cotizaciones:', error);
          res.status(500).json({ error: 'Error interno del servidor al obtener datos de cotizaciones' });
        } else {
          res.json(datos);
        }
      });
      break;
    default:
      res.status(400).json({ error: 'Tipo de informe no válido' });
  }
});


// Endpoint para obtener solicitudes
app.get('/fetch_requests_solicitudes', (req, res) => {
  // Lógica para obtener solicitudes desde la base de datos con istatus específico
  const istatus = 0; // Ajusta esto según tu lógica
  console.log('Istatus utilizado para solicitudes:', istatus); // Agrega un console.log para imprimir el istatus

  // Realiza la consulta a la base de datos para obtener solicitudes con istatus específico
  const sql = 'SELECT * FROM solicitudes WHERE istatus = 0';
  connection.query(sql, [istatus], (err, results) => {
    if (err) {
      console.error('Error al obtener solicitudes:', err);
      res.status(500).json({ error: 'Error al obtener solicitudes.' });
    } else {
      console.log('Datos de solicitudes:', results); // Agrega un console.log para imprimir los datos obtenidos
      res.json(results);
    }
  });
});

// Endpoint para obtener cotizaciones aceptadas
app.get('/fetch_requests_aceptados', (req, res) => {
  const id_usuario = authenticatedUserId; // Obtén el ID del usuario autenticado desde la variable authenticatedUserId
  const sql = 'SELECT * FROM cotizaciones WHERE id_usuario = ? AND istatus = 1';
  connection.query(sql, [id_usuario], (err, result) => {
      if (err) {
          console.error('Error al obtener cotizaciones aceptadas:', err);
          res.status(500).json({ error: 'Error al obtener cotizaciones aceptadas. Por favor, inténtelo de nuevo más tarde.' });
      } else {
          res.status(200).json(result);
      }
  });
});

// Endpoint para obtener cotizaciones rechazadas
app.get('/fetch_requests_rechazados', (req, res) => {
  const id_usuario = authenticatedUserId; // Obtén el ID del usuario autenticado desde la variable authenticatedUserId
  const sql = 'SELECT * FROM cotizaciones WHERE id_usuario = ? AND istatus = 2';
  connection.query(sql, [id_usuario], (err, result) => {
      if (err) {
          console.error('Error al obtener cotizaciones rechazadas:', err);
          res.status(500).json({ error: 'Error al obtener cotizaciones rechazadas. Por favor, inténtelo de nuevo más tarde.' });
      } else {
          res.status(200).json(result);
      }
  });
});

app.post('/fetch_request_details', (req, res) => {
  const formId = req.body.formId;
  const authenticatedUserId = req.user.id; // Asumiendo que el usuario está autenticado y el ID está disponible en req.user

  // Consulta para obtener detalles de solicitudes
  const sqlSolicitudes = 'SELECT * FROM solicitudes WHERE formId = ? AND id_usuario = ?';
  connection.query(sqlSolicitudes, [formId, authenticatedUserId], (errSolicitudes, solicitudes) => {
    if (errSolicitudes) {
      console.error('Error al obtener detalles de solicitudes:', errSolicitudes);
      res.status(500).json({ error: 'Error al obtener detalles de solicitudes.' });
    } else {
      // Consulta para obtener detalles de cotizaciones
      const sqlCotizaciones = 'SELECT * FROM cotizaciones WHERE formId = ? AND id_usuario = ?';
      connection.query(sqlCotizaciones, [formId, authenticatedUserId], (errCotizaciones, cotizaciones) => {
        if (errCotizaciones) {
          console.error('Error al obtener detalles de cotizaciones:', errCotizaciones);
          res.status(500).json({ error: 'Error al obtener detalles de cotizaciones.' });
        } else {
          // Enviar detalles de solicitudes y cotizaciones
          const details = { solicitudes, cotizaciones };
          res.json(details);
        }
      });
    }
  });
});
        



// ... Resto del código ...



  

app.listen(3000, () => {
  console.log('Servidor iniciado en el puerto 3000...');
});
