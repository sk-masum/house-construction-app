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

  private async gatherWorkBackup(workId: number): Promise<any> {
    const work = await this.db.getWorkById(workId);
    const estimations = await this.db.getEstimationsForWork(workId);
    const materials = await this.db.getMaterialsByWorkId(workId);
    const transactions = await this.db.getTransactionsByWorkId(workId);

    return { work, estimations, materials, transactions };
  }

  private async restoreWorkBackup(backup: any): Promise<string> {
    // A. Clone the Work
    const workData = backup.work;
    workData.name = `${workData.name}`;
    delete workData.id;
    const newWorkId = await this.db.addWork(workData);

    // B. Clone Estimations
    for (const est of backup.estimations) {
      delete est.id;
      est.workId = newWorkId;
      await this.db.addEstimation(est);
    }

    // C. Clone Materials
    for (const mat of backup.materials) {
      delete mat.id;
      mat.workId = newWorkId;
      await this.db.addMaterial(mat);
    }

    // D. Clone Transactions
    for (const txn of backup.transactions) {
      delete txn.id;
      txn.workId = newWorkId;
      await this.db.addTransaction(txn);
    }

    // Trigger global UI refresh
    this.db.worksListChanged$.next();
    return workData.name;
  }

  // --- PUBLIC FILE I/O METHODS ---

  async exportWorkToFile(workId: number): Promise<void> {
    // Use the internal orchestrator
    const backupData = await this.gatherWorkBackup(workId);

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const safeName = backupData.work.name
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    a.download = `siteledger_backup_${safeName}.json`;

    a.click();
    URL.revokeObjectURL(url);
  }

  async importWorkFromFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const backupData = JSON.parse(e.target?.result as string);

          if (!backupData.work || !backupData.work.name) {
            throw new Error('Invalid backup file schema');
          }

          // Use the internal orchestrator
          const restoredName = await this.restoreWorkBackup(backupData);
          resolve(restoredName);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsText(file);
    });
  }
}
