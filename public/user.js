const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const saltRounds = 10;

const UserSchema = {
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
};

async function connectToDB() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });
    console.log('Conectado a la base de datos MySQL');

    return connection;
  } catch (error) {
    throw new Error('Error al conectar a la base de datos:', error);
  }
}

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const connection = await connectToDB();
    const hashedPassword = await bcrypt.hash(this.password, saltRounds);
    this.password = hashedPassword;
    return next();
  } catch (error) {
    return next(error);
  }
});

UserSchema.methods.isCorrectPassword = async function (password) {
  try {
    const connection = await connectToDB();
    const [rows] = await connection.execute('SELECT * FROM usuarios WHERE username = ?', [this.username]);
    if (rows.length === 0) {
      throw new Error('Usuario no registrado');
    }

    const isPasswordCorrect = await bcrypt.compare(password, rows[0].password);
    return isPasswordCorrect;
  } catch (error) {
    throw new Error('Error al comparar contraseñas');
  }
};

module.exports = UserSchema;