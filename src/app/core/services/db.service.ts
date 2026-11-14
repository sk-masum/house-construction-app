import { Injectable } from '@angular/core';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { BehaviorSubject, Subject } from 'rxjs';

export interface Material {
  workId: number; // Added to link material to a specific work
  id?: number;
  name: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
  deliveryDate: string | Date;
  builderName: string;
  deliveryCharge: number;
}
export interface ContractorBill {
  workId: number; // Added to link contractor bill to a specific work
  id?: number;
  contractorName: string; // e.g., Sukhchand
  workDesc: string; // e.g., 1st Floor Roof Casting
  qty: number; // e.g., 1200 (sq ft)
  rate: number; // e.g., 220 (per sq ft)
  totalAmount: number;
  billDate: string | Date;
}

export interface Transaction {
  id?: number;
  amount: number;
  dateTime: string | Date;
  provider: string;
  receiver: string;
  workId: number; // Added to link transaction to a specific work
}

export interface Work {
  id?: number;
  name: string; // e.g., 1st Floor Plaster
  contractorName: string; // e.g., Sukhchand
  serviceType: string; // e.g., Sq Ft, Lump Sum, Daily
  serviceRate: number; // e.g., 120
  serviceQty: number; // e.g., 1200
  totalServiceCharge: number;
  totalEstimatedMaterialCost?: number;
  grandTotal?: number;
}

export interface WorkEstimation {
  id?: number;
  workId: number;
  materialName: string; // e.g., Cement
  qty: number; // e.g., 80
  unit: string; // e.g., Bags, Pcs, VC
  unitPrice: number; // NEW
  totalCost: number; // NEW
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

  public activeWorkId$ = new BehaviorSubject<number | null>(null);
  public worksListChanged$ = new Subject<void>();

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
    // 1. Create table (this handles fresh installs on new devices perfectly)
    this.db.exec(`
  CREATE TABLE IF NOT EXISTS material_defaults (
    name TEXT PRIMARY KEY,
    price REAL
  );
`);
    this.db.exec(`
    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      qty REAL,
      unitPrice REAL,
      totalPrice REAL,
      deliveryDate TEXT,
      builderName TEXT,
      deliveryCharge REAL DEFAULT 0
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

    this.db.exec(`
  CREATE TABLE IF NOT EXISTS contractor_bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contractorName TEXT,
    workDesc TEXT,
    qty REAL,
    rate REAL,
    totalAmount REAL,
    billDate TEXT
  );
`);

    this.db.exec(`
  CREATE TABLE IF NOT EXISTS works (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    contractorName TEXT,
    serviceType TEXT,
    serviceRate REAL,
    serviceQty REAL,
    totalServiceCharge REAL
  );
`);

    this.db.exec(`
  CREATE TABLE IF NOT EXISTS work_estimations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workId INTEGER,
    materialName TEXT,
    qty REAL,
    unit TEXT,
    unitPrice REAL DEFAULT 0,
    totalCost REAL DEFAULT 0,
    FOREIGN KEY(workId) REFERENCES works(id) ON DELETE CASCADE
  );
`);

    let count = 0;
    this.db.exec({
      sql: 'SELECT COUNT(*) as c FROM material_defaults',
      rowMode: 'object',
      callback: (r: any) => (count = r.c),
    });

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
        this.db.exec({
          sql: 'INSERT INTO material_defaults (name, price) VALUES (?, ?)',
          bind: [name, price],
        });
      }
    }

    // 2. Safe Migration: Check if 'deliveryCharge' exists in the current schema
    let hasDeliveryCharge = false;
    this.db.exec({
      sql: 'PRAGMA table_info(materials)',
      rowMode: 'object',
      callback: (row: any) => {
        if (row.name === 'deliveryCharge') {
          hasDeliveryCharge = true;
        }
      },
    });

    // 3. Add column ONLY if it's missing (for older devices updating to this version)
    if (!hasDeliveryCharge) {
      this.db.exec(
        `ALTER TABLE materials ADD COLUMN deliveryCharge REAL DEFAULT 0;`,
      );
      console.log(
        'Successfully migrated database: Added deliveryCharge column.',
      );
    }

    // 3. Safe Migration for existing devices
    let hasUnitPrice = false;
    this.db.exec({
      sql: `PRAGMA table_info(work_estimations)`,
      rowMode: 'object',
      callback: (row: any) => {
        if (row.name === 'unitPrice') hasUnitPrice = true;
      },
    });

    if (!hasUnitPrice) {
      this.db.exec(
        `ALTER TABLE work_estimations ADD COLUMN unitPrice REAL DEFAULT 0;`,
      );
      this.db.exec(
        `ALTER TABLE work_estimations ADD COLUMN totalCost REAL DEFAULT 0;`,
      );
      console.log('Migrated: Added pricing to work_estimations');
    }

    // 4. Safe Migration: Add workId to all ledger tables

    const tablesToMigrate = ['materials', 'transactions', 'contractor_bills'];
    for (const table of tablesToMigrate) {
      let hasWorkId = false;
      this.db.exec({
        sql: `PRAGMA table_info(${table})`,
        rowMode: 'object',
        callback: (row: any) => {
          if (row.name === 'workId') hasWorkId = true;
        },
      });

      if (!hasWorkId) {
        this.db.exec(
          `ALTER TABLE ${table} ADD COLUMN workId INTEGER DEFAULT NULL;`,
        );
        console.log(`Migrated: Added workId to ${table}`);
      }
    }
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
      sql: `INSERT INTO materials (name, qty, unitPrice, totalPrice, deliveryDate, builderName, deliveryCharge, workId) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      bind: [
        material.name,
        material.qty,
        material.unitPrice,
        material.totalPrice,
        new Date(material.deliveryDate).toISOString(),
        material.builderName,
        material.deliveryCharge || 0,
        material.workId || null, // NEW: Safe Fallback
      ],
    });
  }

  async updateMaterial(material: Material): Promise<void> {
    await this.readyPromise;
    this.db.exec({
      sql: `UPDATE materials SET name=?, qty=?, unitPrice=?, totalPrice=?, deliveryDate=?, builderName=?, deliveryCharge=?, workId=? WHERE id=?`,
      bind: [
        material.name,
        material.qty,
        material.unitPrice,
        material.totalPrice,
        new Date(material.deliveryDate).toISOString(),
        material.builderName,
        material.deliveryCharge || 0,
        material.workId || null, // NEW: Safe Fallback
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

    const activeWorkId = this.activeWorkId$.value;
    if (activeWorkId) {
      where += ` AND workId = ?`;
      binds.push(activeWorkId);
    }

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
      sql: `INSERT INTO transactions (amount, dateTime, provider, receiver, workId) VALUES (?, ?, ?, ?, ?)`,
      bind: [
        transaction.amount,
        new Date(transaction.dateTime).toISOString(),
        transaction.provider,
        transaction.receiver,
        transaction.workId,
      ],
    });
  }

  async updateTransaction(transaction: Transaction): Promise<void> {
    await this.readyPromise;
    this.db.exec({
      sql: `UPDATE transactions SET amount=?, dateTime=?, provider=?, receiver=?, workId=? WHERE id=?`,
      bind: [
        transaction.amount,
        new Date(transaction.dateTime).toISOString(),
        transaction.provider,
        transaction.receiver,
        transaction.workId,
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

    const activeWorkId = this.activeWorkId$.value;
    if (activeWorkId) {
      where += ` AND workId = ?`;
      binds.push(activeWorkId);
    }

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

  // Contractor Bills CRUD operations would go here
  async getContractorBills(contractorName?: string): Promise<ContractorBill[]> {
    await this.readyPromise;
    let sql = 'SELECT * FROM contractor_bills';
    const bind: any[] = [];

    if (contractorName) {
      sql += ' WHERE contractorName = ?';
      bind.push(contractorName);
    }
    sql += ' ORDER BY billDate DESC';

    let rows: ContractorBill[] = [];
    this.db.exec({
      sql,
      bind,
      rowMode: 'object',
      callback: (row: ContractorBill) => rows.push(row),
    });
    return rows;
  }

  async getContractorSummaries(): Promise<any[]> {
    await this.readyPromise;
    // This Joins the new bills table with the Ledger to calculate Due Amount instantly
    const sql = `
    SELECT 
      contractorName as name, 
      COUNT(id) as count, 
      SUM(totalAmount) as totalBill,
      IFNULL(t.totalPaid, 0) as totalPaid,
      (SUM(totalAmount) - IFNULL(t.totalPaid, 0)) as dueAmount
    FROM contractor_bills 
    LEFT JOIN (
      SELECT receiver, SUM(amount) as totalPaid 
      FROM transactions 
      GROUP BY receiver
    ) t ON contractor_bills.contractorName = t.receiver
    GROUP BY contractorName 
    ORDER BY totalBill DESC
  `;

    let rows: any[] = [];
    this.db.exec({
      sql,
      rowMode: 'object',
      callback: (row: any) => rows.push(row),
    });
    return rows;
  }

  async addContractorBill(bill: ContractorBill): Promise<void> {
    await this.readyPromise;
    this.db.exec({
      sql: `INSERT INTO contractor_bills (contractorName, workDesc, qty, rate, totalAmount, billDate, workId) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      bind: [
        bill.contractorName,
        bill.workDesc,
        bill.qty,
        bill.rate,
        bill.totalAmount,
        new Date(bill.billDate).toISOString(),
        bill.workId,
      ],
    });
  }

  async deleteContractorBill(id: number): Promise<void> {
    await this.readyPromise;
    this.db.exec({
      sql: 'DELETE FROM contractor_bills WHERE id = ?',
      bind: [id],
    });
  }

  async updateContractorBill(bill: ContractorBill): Promise<void> {
    await this.readyPromise;
    this.db.exec({
      sql: `UPDATE contractor_bills SET contractorName=?, workDesc=?, qty=?, rate=?, totalAmount=?, billDate=?, workId=? WHERE id=?`,
      bind: [
        bill.contractorName,
        bill.workDesc,
        bill.qty,
        bill.rate,
        bill.totalAmount,
        new Date(bill.billDate).toISOString(),
        bill.workId,
        bill.id,
      ],
    });
  }

  // Work and Work Estimation related methods can be added here
  async getWorks(): Promise<Work[]> {
    await this.readyPromise;
    let rows: Work[] = [];

    // Use LEFT JOIN to calculate the sum of all material estimations for each project
    const sql = `
    SELECT w.*, 
           IFNULL(SUM(e.totalCost), 0) as totalEstimatedMaterialCost
    FROM works w
    LEFT JOIN work_estimations e ON w.id = e.workId
    GROUP BY w.id
    ORDER BY w.id DESC
  `;

    this.db.exec({
      sql,
      rowMode: 'object',
      callback: (row: any) => {
        // Calculate the Grand Total for the card
        row.grandTotal =
          (row.totalServiceCharge || 0) + (row.totalEstimatedMaterialCost || 0);
        rows.push(row);
      },
    });

    return rows;
  }

  async addWork(work: Work): Promise<number> {
    await this.readyPromise;
    this.db.exec({
      sql: `INSERT INTO works (name, contractorName, serviceType, serviceRate, serviceQty, totalServiceCharge) VALUES (?, ?, ?, ?, ?, ?)`,
      bind: [
        work.name,
        work.contractorName,
        work.serviceType,
        work.serviceRate,
        work.serviceQty,
        work.totalServiceCharge,
      ],
    });
    // Return the ID of the newly inserted work so we can attach estimations to it
    let insertId = 0;
    this.db.exec({
      sql: 'SELECT last_insert_rowid() as id',
      rowMode: 'object',
      callback: (row: any) => (insertId = row.id),
    });
    this.worksListChanged$.next();
    return insertId;
  }

  async getWorkById(id: number): Promise<Work | undefined> {
    await this.readyPromise;
    let work: Work | undefined;
    this.db.exec({
      sql: 'SELECT * FROM works WHERE id = ?',
      bind: [id],
      rowMode: 'object',
      callback: (row: Work) => (work = row),
    });
    return work;
  }

  async getWorkMaterialProgress(workId: number): Promise<any[]> {
    await this.readyPromise;

    // 1. Fetch & Group Estimated Quantities
    const estimates: any[] = [];
    this.db.exec({
      sql: 'SELECT materialName, SUM(qty) as estimatedQty, MAX(unit) as unit FROM work_estimations WHERE workId = ? GROUP BY materialName',
      bind: [workId],
      rowMode: 'object',
      callback: (row: any) => estimates.push(row),
    });

    // 2. Fetch & Group Actual Purchased Quantities
    const actuals: any[] = [];
    this.db.exec({
      sql: 'SELECT name as materialName, SUM(qty) as actualQty FROM materials WHERE workId = ? GROUP BY name',
      bind: [workId],
      rowMode: 'object',
      callback: (row: any) => actuals.push(row),
    });

    const progressMap = new Map<string, any>();

    for (const e of estimates) {
      progressMap.set(e.materialName, {
        materialName: e.materialName,
        estimatedQty: e.estimatedQty || 0, // Fallback to 0 if null
        unit: e.unit,
        actualQty: 0,
      });
    }

    for (const a of actuals) {
      if (progressMap.has(a.materialName)) {
        progressMap.get(a.materialName).actualQty = a.actualQty || 0;
      } else {
        progressMap.set(a.materialName, {
          materialName: a.materialName,
          estimatedQty: 0,
          unit: 'Units',
          actualQty: a.actualQty || 0,
        });
      }
    }

    return Array.from(progressMap.values())
      .map((item) => {
        const percent =
          item.estimatedQty > 0
            ? Math.round((item.actualQty / item.estimatedQty) * 100)
            : item.actualQty > 0
              ? 100
              : 0; // Jump to 100% if unplanned

        return { ...item, percent };
      })
      .sort((a, b) => b.percent - a.percent);
  }
  async getEstimationsForWork(workId: number): Promise<WorkEstimation[]> {
    await this.readyPromise;
    let rows: WorkEstimation[] = [];
    this.db.exec({
      sql: 'SELECT * FROM work_estimations WHERE workId = ?',
      bind: [workId],
      rowMode: 'object',
      callback: (row: WorkEstimation) => rows.push(row),
    });
    return rows;
  }

  async addEstimation(est: WorkEstimation): Promise<void> {
    await this.readyPromise;
    this.db.exec({
      sql: `INSERT INTO work_estimations (workId, materialName, qty, unit, unitPrice, totalCost) VALUES (?, ?, ?, ?, ?, ?)`,
      bind: [
        est.workId,
        est.materialName,
        est.qty,
        est.unit,
        est.unitPrice,
        est.totalCost,
      ],
    });
  }

  async deleteEstimation(id: number): Promise<void> {
    await this.readyPromise;
    this.db.exec({
      sql: 'DELETE FROM work_estimations WHERE id = ?',
      bind: [id],
    });
  }

  async updateWork(work: Work): Promise<void> {
    await this.readyPromise;
    this.db.exec({
      sql: `UPDATE works SET name=?, contractorName=?, serviceType=?, serviceRate=?, serviceQty=?, totalServiceCharge=? WHERE id=?`,
      bind: [
        work.name,
        work.contractorName,
        work.serviceType,
        work.serviceRate,
        work.serviceQty,
        work.totalServiceCharge,
        work.id,
      ],
    });
    this.worksListChanged$.next(); // Broadcast change to header
  }

  async deleteWork(id: number): Promise<void> {
    await this.readyPromise;

    try {
      // 1. SAFELY DETACH actual financial records first
      // If we don't do this, SQLite's foreign key constraints might block the deletion
      this.db.exec({
        sql: 'UPDATE materials SET workId = NULL WHERE workId = ?',
        bind: [id],
      });
      this.db.exec({
        sql: 'UPDATE transactions SET workId = NULL WHERE workId = ?',
        bind: [id],
      });
      this.db.exec({
        sql: 'UPDATE contractor_bills SET workId = NULL WHERE workId = ?',
        bind: [id],
      });

      // 2. Delete the estimations
      // (Even with ON DELETE CASCADE, it's safer to explicitly delete them in WASM)
      this.db.exec({
        sql: 'DELETE FROM work_estimations WHERE workId = ?',
        bind: [id],
      });

      // 3. Finally, delete the project itself
      this.db.exec({ sql: 'DELETE FROM works WHERE id = ?', bind: [id] });

      console.log(`Successfully deleted Work ID: ${id}`);
      this.worksListChanged$.next(); // Broadcast change to header
    } catch (error) {
      console.error('Failed to delete work:', error);
    }
  }

  // --- NEW: Pricing Methods ---
  async getMaterialDefaults(): Promise<Record<string, number>> {
    await this.readyPromise;
    const map: Record<string, number> = {};
    this.db.exec({
      sql: 'SELECT * FROM material_defaults ORDER BY name ASC',
      rowMode: 'object',
      callback: (r: any) => (map[r.name] = r.price),
    });
    return map;
  }

  async saveMaterialDefault(name: string, price: number): Promise<void> {
    await this.readyPromise;
    this.db.exec({
      sql: 'INSERT OR REPLACE INTO material_defaults (name, price) VALUES (?, ?)',
      bind: [name, price],
    });
  }
}
