import mysql from 'mysql2/promise'

export function getDbConfig() {
  return {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'aus-booking',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: 'Z',
  }
}

let pool

export function dbPool() {
  if (!pool) {
    pool = mysql.createPool(getDbConfig())
  }
  return pool
}

