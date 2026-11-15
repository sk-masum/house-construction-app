// import { Inject, Injectable } from '@angular/core';
// import { DbService } from './db.service';

// @Injectable({
//   providedIn: 'root',
// })
// export class ImportExportService {
//   @Inject(DbService) private db!: DbService;

//   constructor() {}

//   // 1. Export Engine
//   async getWorkBackup(workId: number): Promise<any> {
//     await this.db.readyPromise;

//     const work = await this.db.getWorkById(workId);
//     const estimations = await this.db.getEstimationsForWork(workId);

//     const materials: any[] = [];
//     this.db.exec({
//       sql: 'SELECT * FROM materials WHERE workId = ?',
//       bind: [workId],
//       rowMode: 'object',
//       callback: (r: any) => materials.push(r),
//     });

//     const transactions: any[] = [];
//     this.db.exec({
//       sql: 'SELECT * FROM transactions WHERE workId = ?',
//       bind: [workId],
//       rowMode: 'object',
//       callback: (r: any) => transactions.push(r),
//     });

//     return { work, estimations, materials, transactions };
//   }

//   // 2. Restore Engine (Creates a Clone/Restore to avoid ID collisions)
//   async restoreWorkBackup(backup: any): Promise<void> {
//     await this.db.readyPromise;

//     // A. Create the Work (Append ' - Restored' to name to distinguish it)
//     const workData = backup.work;
//     workData.name = `${workData.name} - Restored`;
//     delete workData.id; // Force SQLite to generate a fresh ID
//     const newWorkId = await this.db.addWork(workData);

//     // B. Restore Estimations
//     for (const est of backup.estimations) {
//       delete est.id;
//       est.workId = newWorkId;
//       await this.db.addEstimation(est);
//     }

//     // C. Restore Materials
//     for (const mat of backup.materials) {
//       delete mat.id;
//       mat.workId = newWorkId;
//       await this.db.addMaterial(mat);
//     }

//     // D. Restore Transactions
//     for (const txn of backup.transactions) {
//       delete txn.id;
//       txn.workId = newWorkId;
//       await this.db.addTransaction(txn);
//     }

//     this.db.worksListChanged$.next(); // Refresh the header dropdown globally
//   }
// }
