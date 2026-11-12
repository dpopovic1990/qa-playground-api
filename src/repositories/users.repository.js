
const pool = require('../config/database');

async function createUser({ name, email }) {
  const query = `
    INSERT INTO users (name, email)
    VALUES ($1, $2)
    RETURNING id, name, email
  `;

  const values = [name, email];

  const result = await pool.query(query, values);

  return result.rows[0];
}


async function getAllUsers() {
  const result = await pool.query(`
    SELECT id, name, email, created_at
    FROM users
    ORDER BY id ASC
  `);

  return result.rows;
}

async function getUserById(id) {
  const result = await pool.query(
    `SELECT id, name, email, created_at
     FROM users
     WHERE id = $1`,
    [id]
  );

  return result.rows[0] ?? null;
}


module.exports = {
  createUser,
  getAllUsers,
  getUserById
};
