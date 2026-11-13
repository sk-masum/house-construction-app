import { Injectable } from '@angular/core';
import * as Papa from 'papaparse';
import { DbService } from './db.service';

@Injectable({
  providedIn: 'root',
})
export class BackupService {
  constructor(private db: DbService) {}

  // --- EXPORT METHODS ---

  async exportMaterials() {
    const materials = await this.db.getAllMaterials();
    if (materials.length === 0) {
      return alert('No materials to export.');
    }

    const csv = Papa.unparse(materials);
    const fileName = `materials_backup_${new Date().toISOString().slice(0, 10)}.csv`;
    this.downloadFile(csv, fileName);
  }

  async exportTransactions() {
    const transactions = await this.db.getAllTransactions();
    if (transactions.length === 0) {
      return alert('No transactions to export.');
    }

    const csv = Papa.unparse(transactions);
    const fileName = `ledger_backup_${new Date().toISOString().slice(0, 10)}.csv`;
    this.downloadFile(csv, fileName);
  }

  private downloadFile(csvContent: string, fileName: string) {
    // Create a Blob from the CSV string to trigger a native browser download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- IMPORT METHODS ---

  importMaterials(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: async (results: any) => {
          try {
            const data = results.data.map((item: any) => {
              delete item.id;
              return item;
            });
            for (const item of data) {
              await this.db.addMaterial(item);
            }
            resolve();
          } catch (err) {
            reject(err);
          }
        },
        error: (err: any) => reject(err.message),
      });
    });
  }

  importTransactions(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: async (results: any) => {
          try {
            const data = results.data.map((item: any) => {
              delete item.id;
              return item;
            });
            for (const item of data) {
              await this.db.addTransaction(item);
            }
            resolve();
          } catch (err) {
            reject(err);
          }
        },
        error: (err: any) => reject(err.message),
      });
    });
  }
}
