import { Injectable } from '@angular/core';
import { createClient, Client, Transaction } from '@libsql/client/web';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CoreDbService {
  private db!: Client;
  public readyPromise: Promise<void>;

  constructor() {
    this.readyPromise = this.initDb();
  }

  private async initDb(): Promise<void> {
    try {
      this.db = createClient({
        url: environment.tursoUrl,
        authToken: environment.tursoToken,
      });

      console.log('Connected to Turso successfully.');

      await this.createTables();
    } catch (err) {
      console.error('Turso initialization failed', err);
      throw err;
    }
  }

  private async createTables() {
    const schema = `
      CREATE TABLE IF NOT EXISTS material_defaults (name TEXT PRIMARY KEY, price REAL);

      CREATE TABLE IF NOT EXISTS app_migrations (name TEXT PRIMARY KEY);

      CREATE TABLE IF NOT EXISTS builders (
        name TEXT PRIMARY KEY,
        deliveryCharge REAL NOT NULL DEFAULT 0 CHECK(deliveryCharge >= 0)
      );

      CREATE TABLE IF NOT EXISTS contractors (
        name TEXT PRIMARY KEY,
        sqftRate REAL NOT NULL DEFAULT 0 CHECK(sqftRate >= 0)
      );
      
      CREATE TABLE IF NOT EXISTS materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, qty REAL, unitPrice REAL, totalPrice REAL,
        deliveryDate TEXT, builderName TEXT, deliveryCharge REAL DEFAULT 0, projectId INTEGER DEFAULT NULL
      );
      
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT, amount REAL, dateTime TEXT, provider TEXT, receiver TEXT, projectId INTEGER DEFAULT NULL
      );
      
      CREATE TABLE IF NOT EXISTS contractor_bills (
        id INTEGER PRIMARY KEY AUTOINCREMENT, contractorName TEXT, projectDesc TEXT, qty REAL, rate REAL, totalAmount REAL, billDate TEXT, projectId INTEGER DEFAULT NULL
      );
      
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, contractorName TEXT, serviceType TEXT, serviceRate REAL, serviceQty REAL, totalServiceCharge REAL
      );
      
      CREATE TABLE IF NOT EXISTS project_estimations (
        id INTEGER PRIMARY KEY AUTOINCREMENT, projectId INTEGER, materialName TEXT, qty REAL, unit TEXT, unitPrice REAL DEFAULT 0, totalCost REAL DEFAULT 0,
        FOREIGN KEY(projectId) REFERENCES projects(id) ON DELETE CASCADE
      );
    `;
    await this.db.executeMultiple(schema);

    const needsDirectorySeed = `NOT EXISTS (
      SELECT 1 FROM app_migrations WHERE name = 'directory-defaults-v1'
    )`;
    await this.db.batch([`
      INSERT OR IGNORE INTO builders (name, deliveryCharge)
      SELECT column1, column2 FROM (VALUES ('SS', 160), ('Nice', 150), ('KGN', 300))
      WHERE ${needsDirectorySeed}
    `, `
      INSERT OR IGNORE INTO builders (name, deliveryCharge)
      SELECT DISTINCT TRIM(builderName), 0 FROM materials
      WHERE TRIM(COALESCE(builderName, '')) <> '' AND ${needsDirectorySeed}
    `, `
      INSERT OR IGNORE INTO contractors (name, sqftRate)
      SELECT DISTINCT TRIM(p.contractorName),
        COALESCE((
          SELECT serviceRate FROM projects latest
          WHERE TRIM(latest.contractorName) = TRIM(p.contractorName)
            AND latest.serviceType = 'Sq Ft' AND latest.serviceRate >= 0
          ORDER BY latest.id DESC LIMIT 1
        ), 0)
      FROM projects p
      WHERE TRIM(COALESCE(p.contractorName, '')) <> '' AND ${needsDirectorySeed}
    `, `
      INSERT OR IGNORE INTO contractors (name, sqftRate)
      SELECT DISTINCT TRIM(contractorName), 0 FROM contractor_bills
      WHERE TRIM(COALESCE(contractorName, '')) <> '' AND ${needsDirectorySeed}
    `, `
      INSERT OR IGNORE INTO contractors (name, sqftRate)
      SELECT 'Sukhchand', 0 WHERE ${needsDirectorySeed}
    `, `
      INSERT OR IGNORE INTO app_migrations (name) VALUES ('directory-defaults-v1')
    `], 'write');

    // Seed Material Defaults if empty
    const res = await this.db.execute(
      'SELECT COUNT(*) as c FROM material_defaults',
    );
    const count = Number(res.rows[0]['c']);

    if (count === 0) {
      const initial = [
        ['Cement', 370],
        ['Bricks', 12.5],
        ['Sand', 1900],
        ['Stone', 1900],
        ['8 Bar', 336],
        ['10 Bar', 520],
        ['12 Bar', 742],
        ['7x7 Ring', 12.5],
      ];
      for (const [name, price] of initial) {
        await this.db.execute({
          sql: 'INSERT INTO material_defaults (name, price) VALUES (?, ?)',
          args: [name, price], // Turso uses 'args' instead of 'bind'
        });
      }
    }
  }

  // --- CLEAN HELPER METHODS FOR FEATURE SERVICES ---

  async transaction<T>(work: (transaction: Transaction) => Promise<T>): Promise<T> {
    await this.readyPromise;
    const transaction = await this.db.transaction('write');
    try {
      const result = await work(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      if (!transaction.closed) await transaction.rollback();
      throw error;
    } finally {
      transaction.close();
    }
  }

  async query<T = any>(sql: string, args: any[] = []): Promise<T[]> {
    await this.readyPromise;
    const result = await this.db.execute({ sql, args });
    return result.rows as unknown as T[];
  }

  async run(sql: string, args: any[] = []): Promise<void> {
    await this.readyPromise;
    await this.db.execute({ sql, args });
  }

  async insert(sql: string, args: any[] = []): Promise<number> {
    await this.readyPromise;
    const result = await this.db.execute({ sql, args });
    // Turso natively provides the inserted ID, making this perfectly clean
    return Number(result.lastInsertRowid);
  }
}
