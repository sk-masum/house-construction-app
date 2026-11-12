import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';

// 1. Define the TypeScript interfaces mapping to your requirements
export interface Material {
  id?: number; // Auto-incremented primary key
  name: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
  deliveryDate: Date | string;
  builderName: string;
}

export interface Transaction {
  id?: number;
  amount: number;
  dateTime: Date | string;
  provider: string;
  receiver: string;
}

@Injectable({
  providedIn: 'root',
})
export class DbService extends Dexie {
  // 2. Declare the tables
  materials!: Table<Material, number>;
  transactions!: Table<Transaction, number>;

  constructor() {
    // 3. Name the local database
    super('SiteLedgerDB');

    // 4. Define the schema and indexes
    // Note: Only list properties you plan to filter by in a 'where()' clause.
    // '++id' means auto-incrementing primary key.
    this.version(1).stores({
      materials: '++id, name, deliveryDate, builderName',
      transactions: '++id, dateTime, provider, receiver',
    });
  }

  // Helper method: Add a new material (auto-calculates total)
  async addMaterial(material: Material): Promise<number> {
    material.totalPrice = material.qty * material.unitPrice;
    return this.materials.add(material);
  }

  // Helper method: Get all materials sorted by newest delivery date
  async getAllMaterials(): Promise<Material[]> {
    return this.materials.orderBy('deliveryDate').reverse().toArray();
  }

  // Add this helper method below getAllMaterials()
  async deleteMaterial(id: number): Promise<void> {
    return this.materials.delete(id);
  }

  // Add these methods inside the DbService class

  async addTransaction(transaction: Transaction): Promise<number> {
    return this.transactions.add(transaction);
  }

  async getAllTransactions(): Promise<Transaction[]> {
    // Sort by newest first
    return this.transactions.orderBy('dateTime').reverse().toArray();
  }

  async deleteTransaction(id: number): Promise<void> {
    return this.transactions.delete(id);
  }
}
