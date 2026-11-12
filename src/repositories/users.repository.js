
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

async function getAllUsers({ page, limit, name, sortBy, order }) {
  const offset = (page - 1) * limit;

  // Whitelisted column names prevent SQL injection
  const sortColumns = {
    id: 'id',
    name: 'name',
    created_at: 'created_at'
  };

  const sortColumn = sortColumns[sortBy];
  const sortDirection = order === 'desc' ? 'DESC' : 'ASC';

  const filters = [];
  const values = [];

  if (name) {
    values.push(`%${name}%`);
    filters.push(`name ILIKE $${values.length}`);
  }

  const whereClause = filters.length
    ? `WHERE ${filters.join(' AND ')}`
    : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) AS total FROM users ${whereClause}`,
    values
  );

  const total = Number(countResult.rows[0].total);

  const query = `
    SELECT id, name, email, created_at
    FROM users
    ${whereClause}
    ORDER BY ${sortColumn} ${sortDirection}, id ASC
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2}
  `;

  const result = await pool.query(query, [
    ...values,
    limit,
    offset
  ]);

  return {
    users: result.rows,
    total
  };
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
