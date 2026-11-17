/**
 * Lumina Slide - Database Connection & Management Module
 * 
 * Provides MySQL connection pooling via mysql2/promise, query helpers,
 * transaction support, and database/table initialization.
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Attempt to load environment variables from .env if dotenv is present
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not required in environments where variables are already set
}

// Database configuration loaded from environment variables with sensible defaults
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lumina_slide',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  multipleStatements: true,
  dateStrings: true
};

// Create connection pool with promise support
const pool = mysql.createPool(dbConfig);

/**
 * Execute an SQL query using connection pooling
 * 
 * @param {string} sql - SQL query string with optional placeholder ? marks
 * @param {Array|Object} [params] - Query parameters for prepared statement
 * @returns {Promise<any>} Query results (rows, OkPacket, or ResultSetHeader)
 */
async function query(sql, params = []) {
  try {
    const [results] = await pool.query(sql, params);
    return results;
  } catch (error) {
    console.error('[Database Error] Query execution failed:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sql: sql.length > 200 ? `${sql.substring(0, 200)}...` : sql
    });
    throw error;
  }
}

/**
 * Execute a sequence of queries within an ACID transaction
 * Automatically commits on success and rolls back on error.
 * 
 * @param {Function} callback - Async function that receives a transaction connection: async (conn) => { ... }
 * @returns {Promise<any>} Result returned by the callback
 */
async function transaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    console.error('[Database Error] Transaction rolled back due to error:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Test the database connection pool
 * 
 * @returns {Promise<boolean>} True if connection was successful
 */
async function testConnection() {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.ping();
    console.log(`[Database] Connection pool established successfully to MySQL (${dbConfig.host}:${dbConfig.port}/${dbConfig.database})`);
    return true;
  } catch (error) {
    console.error(`[Database Error] Failed to connect to MySQL database '${dbConfig.database}':`, error.message);
    return false;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Initialize the database by creating the database (if needed)
 * and executing table creation and achievement seed statements from schema.sql.
 * 
 * @param {string} [customSchemaPath] - Optional override path to schema.sql
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function initializeDatabase(customSchemaPath) {
  const schemaPath = customSchemaPath || path.join(__dirname, 'schema.sql');
  console.log(`[Database Init] Starting initialization using schema at: ${schemaPath}`);

  // Step 1: Ensure database exists by connecting without DB specified first
  try {
    const serverConnection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      port: dbConfig.port
    });

    await serverConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await serverConnection.end();
    console.log(`[Database Init] Database '${dbConfig.database}' verified/created.`);
  } catch (err) {
    console.warn(`[Database Init] Warning while verifying database existence: ${err.message}. Continuing with pool connection...`);
  }

  // Step 2: Read schema file
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`[Database Init Error] Schema file not found at: ${schemaPath}`);
  }
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Step 3: Execute schema queries using pool connection
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('[Database Init] Executing schema table definitions and seed data...');
    await connection.query(schemaSql);
    console.log('[Database Init] Database schema initialized successfully.');
    return {
      success: true,
      message: `Database '${dbConfig.database}' initialized successfully with all tables and seed data.`
    };
  } catch (err) {
    console.error('[Database Init Error] Failed to execute schema script:', err.message);
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Gracefully close the connection pool
 */
async function closePool() {
  try {
    await pool.end();
    console.log('[Database] Connection pool closed gracefully.');
  } catch (error) {
    console.error('[Database Error] Error closing connection pool:', error.message);
  }
}

module.exports = {
  pool,
  query,
  transaction,
  initializeDatabase,
  testConnection,
  closePool,
  dbConfig
};
