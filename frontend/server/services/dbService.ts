import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

// Default path to the traces db file
let DB_PATH = 'traces.db';

// Singleton database connection
let db: Database | null = null;

/**
 * Set the database path
 */
export const setDbPath = (newPath: string): string => {
  // Close existing connection if any
  if (db) {
    closeDb().catch(err => console.error('Error closing database:', err));
  }
  
  DB_PATH = newPath;
  db = null; // Reset the connection so it will be recreated with the new path
  console.log(`Database path updated to: ${DB_PATH}`);
  return DB_PATH;
};

/**
 * Get the current database path
 */
export const getDbPath = (): string => {
  return DB_PATH;
};

/**
 * Initialize the database connection
 */
export const initDb = async (): Promise<Database> => {
  if (db) return db;

  try {
    console.log(`Connecting to database at: ${DB_PATH}`);
    db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database,
    });
    
    console.log('Database connection established');
    return db;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};

/**
 * Get the database connection
 */
export const getDb = async (): Promise<Database> => {
  if (!db) {
    return await initDb();
  }
  return db;
};

/**
 * Close the database connection
 */
export const closeDb = async (): Promise<void> => {
  if (db) {
    await db.close();
    db = null;
    console.log('Database connection closed');
  }
}; 