import mysql from 'mysql2/promise'

export function getDbConfig() {
  const rawHost = process.env.DB_HOST || '127.0.0.1'
  const host = rawHost === 'localhost' ? '127.0.0.1' : rawHost

  return {
    host,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'aus-booking',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: 'Z',
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    connectTimeout: 15000,
  }
}

let pool

export function dbPool() {
  if (!pool) {
    pool = mysql.createPool(getDbConfig())
  }
  return pool
}
