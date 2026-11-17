import { Injectable } from '@angular/core';
import { CoreDbService } from './core-db.service';
import { ProjectService } from './project.service';

export interface Transaction {
  id?: number;
  amount: number;
  dateTime: string | Date;
  provider: string;
  receiver: string;
  projectId: number | null;
}

export interface TransactionFilters {
  providers?: string[];
  receivers?: string[];
  startDate?: string;
  endDate?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable({ providedIn: 'root' })
export class TransactionService {
  constructor(
    private coreDb: CoreDbService,
    private projectService: ProjectService,
  ) {}

  async getAllTransactions(): Promise<Transaction[]> {
    return this.coreDb.query(
      'SELECT * FROM transactions ORDER BY dateTime DESC',
    );
  }

  async getTransactionsForProject(projectId: number): Promise<Transaction[]> {
    return this.coreDb.query(
      'SELECT * FROM transactions WHERE projectId = ? ORDER BY dateTime DESC',
      [projectId],
    );
  }

  async addTransaction(txn: Transaction): Promise<void> {
    await this.coreDb.run(
      `INSERT INTO transactions (amount, dateTime, provider, receiver, projectId) VALUES (?, ?, ?, ?, ?)`,
      [
        txn.amount,
        new Date(txn.dateTime).toISOString(),
        txn.provider,
        txn.receiver,
        txn.projectId,
      ],
    );
  }

  async updateTransaction(txn: Transaction): Promise<void> {
    await this.coreDb.run(
      `UPDATE transactions SET amount=?, dateTime=?, provider=?, receiver=?, projectId=? WHERE id=?`,
      [
        txn.amount,
        new Date(txn.dateTime).toISOString(),
        txn.provider,
        txn.receiver,
        txn.projectId,
        txn.id,
      ],
    );
  }

  async deleteTransaction(id: number): Promise<void> {
    await this.coreDb.run('DELETE FROM transactions WHERE id = ?', [id]);
  }

  // --- FILTERS ---

  private buildTransactionFilterClause(filters: TransactionFilters) {
    let where = '1=1';
    const args: any[] = [];
    const activeProjectId = this.projectService.activeProjectId$.value;

    if (activeProjectId) {
      where += ` AND projectId = ?`;
      args.push(activeProjectId);
    }

    if (filters.providers?.length) {
      where += ` AND provider IN (${filters.providers.map(() => '?').join(',')})`;
      args.push(...filters.providers);
    }
    if (filters.receivers?.length) {
      where += ` AND receiver IN (${filters.receivers.map(() => '?').join(',')})`;
      args.push(...filters.receivers);
    }
    if (filters.startDate && filters.endDate) {
      where += ` AND dateTime >= ? AND dateTime <= ?`;
      args.push(filters.startDate, filters.endDate);
    }
    return { where, args };
  }

  async getFilteredTransactions(
    filters: TransactionFilters,
  ): Promise<Transaction[]> {
    const { where, args } = this.buildTransactionFilterClause(filters);
    const order = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
    return this.coreDb.query(
      `SELECT * FROM transactions WHERE ${where} ORDER BY dateTime ${order}`,
      args,
    );
  }
}
