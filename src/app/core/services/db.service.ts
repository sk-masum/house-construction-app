import { Injectable } from '@angular/core';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

export interface Material {
  id?: number;
  name: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
  deliveryDate: string | Date;
  builderName: string;
}

export interface Transaction {
  id?: number;
  amount: number;
  dateTime: string | Date;
  provider: string;
  receiver: string;
}

export interface MaterialFilters {
  materials?: string[];
  builders?: string[];
  startDate?: string;
  endDate?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TransactionFilters {
  providers?: string[];
  receivers?: string[];
  startDate?: string;
  endDate?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable({
  providedIn: 'root',
})
export class DbService {
  private db: any;
  private readyPromise: Promise<void>;

  constructor() {
    this.readyPromise = this.initDb();
  }

  private async initDb(): Promise<void> {
    try {
      const sqlite3 = await sqlite3InitModule();

      if (sqlite3.oo1.OpfsDb) {
        this.db = new sqlite3.oo1.OpfsDb('/site-ledger.sqlite3');
        console.log('SQLite OPFS Database initialized successfully.');
      } else if (sqlite3.oo1.JsStorageDb) {
        this.db = new sqlite3.oo1.JsStorageDb('local');
        console.log('SQLite localStorage database initialized successfully.');
      } else {
        throw new Error('Persistent SQLite storage is unavailable.');
      }

      this.createTables();
    } catch (err) {
      console.error('SQLite initialization failed', err);
      throw err;
    }
  }

  private createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        qty REAL,
        unitPrice REAL,
        totalPrice REAL,
        deliveryDate TEXT,
        builderName TEXT
      );
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL,
        dateTime TEXT,
        provider TEXT,
        receiver TEXT
      );
    `);
  }

  // --- MATERIAL METHODS ---

  async getAllMaterials(): Promise<Material[]> {
    await this.readyPromise;
    let rows: Material[] = [];
    this.db.exec({
      sql: 'SELECT * FROM materials',
      rowMode: 'object',
      callback: (row: Material) => rows.push(row),
    });
    return rows;
  }

  async addMaterial(material: Material): Promise<void> {
    await this.readyPromise;
    this.db.exec({
      sql: `INSERT INTO materials (name, qty, unitPrice, totalPrice, deliveryDate, builderName) 
            VALUES (?, ?, ?, ?, ?, ?)`,
      bind: [
        material.name,
        material.qty,
        material.unitPrice,
        material.totalPrice,
        // SQLite expects strings for dates
        new Date(material.deliveryDate).toISOString(),
        material.builderName,
      ],
    });
  }

  async updateMaterial(material: Material): Promise<void> {
    await this.readyPromise;
    this.db.exec({
      sql: `UPDATE materials SET name=?, qty=?, unitPrice=?, totalPrice=?, deliveryDate=?, builderName=? WHERE id=?`,
      bind: [
        material.name,
        material.qty,
        material.unitPrice,
        material.totalPrice,
        new Date(material.deliveryDate).toISOString(),
        material.builderName,
        material.id,
      ],
    });
  }

  async deleteMaterial(id: number): Promise<void> {
    await this.readyPromise;
    this.db.exec({
      sql: 'DELETE FROM materials WHERE id = ?',
      bind: [id],
    });
  }

  async getFilteredMaterials(filters: MaterialFilters): Promise<Material[]> {
    await this.readyPromise;
    const { where, binds } = this.buildFilterClause(filters);

    const order = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const sql = `SELECT * FROM materials WHERE ${where} ORDER BY deliveryDate ${order}`;

    let rows: Material[] = [];
    this.db.exec({
      sql,
      bind: binds,
      rowMode: 'object',
      callback: (row: Material) => rows.push(row),
    });
    return rows;
  }

  async getBuilderSummaries(filters: MaterialFilters): Promise<any[]> {
    await this.readyPromise;
    const { where, binds } = this.buildFilterClause(filters);

    const sql = `
    SELECT 
      builderName as name, 
      COUNT(id) as count, 
      SUM(totalPrice) as totalPrice,
      IFNULL(t.totalPaid, 0) as totalPaid,
      (SUM(totalPrice) - IFNULL(t.totalPaid, 0)) as dueAmount
    FROM materials 
    LEFT JOIN (
      SELECT receiver, SUM(amount) as totalPaid 
      FROM transactions 
      GROUP BY receiver
    ) t ON materials.builderName = t.receiver
    WHERE ${where} 
    GROUP BY builderName 
    ORDER BY totalPrice DESC
  `;

    let rows: any[] = [];
    this.db.exec({
      sql,
      bind: binds,
      rowMode: 'object',
      callback: (row: any) => rows.push(row),
    });
    return rows;
  }

  async getMaterialSummaries(filters: MaterialFilters): Promise<any[]> {
    await this.readyPromise;
    const { where, binds } = this.buildFilterClause(filters);

    const sql = `
    SELECT name, COUNT(id) as count, SUM(totalPrice) as totalPrice 
    FROM materials 
    WHERE ${where} 
    GROUP BY name 
    ORDER BY totalPrice DESC
  `;

    let rows: any[] = [];
    this.db.exec({
      sql,
      bind: binds,
      rowMode: 'object',
      callback: (row: any) => rows.push(row),
    });
    return rows;
  }

  private buildFilterClause(filters: MaterialFilters) {
    let where = '1=1';
    const binds: any[] = [];

    if (filters.materials && filters.materials.length > 0) {
      where += ` AND name IN (${filters.materials.map(() => '?').join(',')})`;
      binds.push(...filters.materials);
    }
    if (filters.builders && filters.builders.length > 0) {
      where += ` AND builderName IN (${filters.builders.map(() => '?').join(',')})`;
      binds.push(...filters.builders);
    }
    if (filters.startDate && filters.endDate) {
      where += ` AND deliveryDate >= ? AND deliveryDate <= ?`;
      binds.push(filters.startDate, filters.endDate);
    }
    return { where, binds };
  }

  // --- TRANSACTION METHODS ---

  async getAllTransactions(): Promise<Transaction[]> {
    await this.readyPromise;
    let rows: Transaction[] = [];
    this.db.exec({
      sql: 'SELECT * FROM transactions ORDER BY dateTime DESC',
      rowMode: 'object',
      callback: (row: Transaction) => rows.push(row),
    });
    return rows;
  }

  async getFilteredTransactions(
    filters: TransactionFilters,
  ): Promise<Transaction[]> {
    await this.readyPromise;
    const { where, binds } = this.buildTransactionFilterClause(filters);

    const order = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const sql = `SELECT * FROM transactions WHERE ${where} ORDER BY dateTime ${order}`;

    let rows: Transaction[] = [];
    this.db.exec({
      sql,
      bind: binds,
      rowMode: 'object',
      callback: (row: Transaction) => rows.push(row),
    });
    return rows;
  }

  async getReceiverSummaries(filters: TransactionFilters): Promise<any[]> {
    await this.readyPromise;
    const { where, binds } = this.buildTransactionFilterClause(filters);

    const sql = `
      SELECT receiver as name, COUNT(id) as count, SUM(amount) as totalAmount 
      FROM transactions 
      WHERE ${where} 
      GROUP BY receiver 
      ORDER BY totalAmount DESC
    `;

    let rows: any[] = [];
    this.db.exec({
      sql,
      bind: binds,
      rowMode: 'object',
      callback: (row: any) => rows.push(row),
    });
    return rows;
  }

  async addTransaction(transaction: Transaction): Promise<void> {
    await this.readyPromise;
    this.db.exec({
      sql: `INSERT INTO transactions (amount, dateTime, provider, receiver) VALUES (?, ?, ?, ?)`,
      bind: [
        transaction.amount,
        new Date(transaction.dateTime).toISOString(),
        transaction.provider,
        transaction.receiver,
      ],
    });
  }

  async updateTransaction(transaction: Transaction): Promise<void> {
    await this.readyPromise;
    this.db.exec({
      sql: `UPDATE transactions SET amount=?, dateTime=?, provider=?, receiver=? WHERE id=?`,
      bind: [
        transaction.amount,
        new Date(transaction.dateTime).toISOString(),
        transaction.provider,
        transaction.receiver,
        transaction.id,
      ],
    });
  }

  async deleteTransaction(id: number): Promise<void> {
    await this.readyPromise;
    this.db.exec({
      sql: 'DELETE FROM transactions WHERE id = ?',
      bind: [id],
    });
  }

  private buildTransactionFilterClause(filters: TransactionFilters) {
    let where = '1=1';
    const binds: any[] = [];

    if (filters.providers && filters.providers.length > 0) {
      where += ` AND provider IN (${filters.providers.map(() => '?').join(',')})`;
      binds.push(...filters.providers);
    }
    if (filters.receivers && filters.receivers.length > 0) {
      where += ` AND receiver IN (${filters.receivers.map(() => '?').join(',')})`;
      binds.push(...filters.receivers);
    }
    if (filters.startDate && filters.endDate) {
      where += ` AND dateTime >= ? AND dateTime <= ?`;
      binds.push(filters.startDate, filters.endDate);
    }
    return { where, binds };
  }
}
