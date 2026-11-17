import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { CoreDbService } from './core-db.service';

export type DirectoryKind = 'builders' | 'contractors';

export interface DirectoryEntry {
  name: string;
  defaultRate: number;
}

export interface DirectoryChange {
  kind: DirectoryKind;
  previousName?: string;
  name?: string;
}

@Injectable({ providedIn: 'root' })
export class DirectoryService {
  readonly entriesChanged$ = new Subject<DirectoryChange>();

  constructor(private coreDb: CoreDbService) {}

  async getEntries(kind: DirectoryKind): Promise<DirectoryEntry[]> {
    const column = kind === 'builders' ? 'deliveryCharge' : 'sqftRate';
    return this.coreDb.query<DirectoryEntry>(
      `SELECT name, ${column} AS defaultRate FROM ${kind} ORDER BY name COLLATE NOCASE`,
    );
  }

  async saveEntry(
    kind: DirectoryKind,
    entry: DirectoryEntry,
    previousName: string | null = null,
  ): Promise<DirectoryEntry> {
    const normalized = {
      name: entry.name.trim(),
      defaultRate: entry.defaultRate,
    };
    if (
      !normalized.name ||
      !Number.isFinite(normalized.defaultRate) ||
      normalized.defaultRate < 0
    ) {
      throw new Error(
        'Enter a name and a valid non-negative amount for every entry.',
      );
    }
    const column = kind === 'builders' ? 'deliveryCharge' : 'sqftRate';
    const references = kind === 'builders'
      ? [{ table: 'materials', column: 'builderName' }]
      : [
          { table: 'projects', column: 'contractorName' },
          { table: 'contractor_bills', column: 'contractorName' },
        ];
    references.push(
      { table: 'transactions', column: 'receiver' },
      { table: 'transactions', column: 'provider' },
    );
    await this.coreDb.transaction(async (transaction) => {
      const existing = await transaction.execute({
        sql: `SELECT name FROM ${kind} WHERE name = ?`,
        args: [normalized.name],
      });
      if (normalized.name !== previousName && existing.rows.length > 0) {
        throw new Error('That name already exists. Edit the existing entry instead.');
      }

      if (previousName === null) {
        await transaction.execute({
          sql: `INSERT INTO ${kind} (name, ${column}) VALUES (?, ?)`,
          args: [normalized.name, normalized.defaultRate],
        });
        return;
      }

      if (normalized.name !== previousName) {
        const otherNames = kind === 'builders'
          ? `SELECT name FROM contractors
             UNION SELECT contractorName AS name FROM projects
             UNION SELECT contractorName AS name FROM contractor_bills`
          : `SELECT name FROM builders UNION SELECT builderName AS name FROM materials`;
        const sharedName = await transaction.execute({
          sql: `SELECT name FROM (${otherNames}) WHERE TRIM(name) IN (?, ?) LIMIT 1`,
          args: [previousName, normalized.name],
        });
        if (sharedName.rows.length > 0) {
          throw new Error(
            'This name is also used by the other directory or its historical records. ' +
            'A rename would mix payment histories; you can still edit the default amount.',
          );
        }
        const historyNames = references.map((reference) =>
          `SELECT TRIM(${reference.column}) AS name FROM ${reference.table}`,
        ).join(' UNION ');
        const existingHistory = await transaction.execute({
          sql: `SELECT name FROM (${historyNames}) WHERE name = ? LIMIT 1`,
          args: [normalized.name],
        });
        if (existingHistory.rows.length > 0) {
          throw new Error(
            'That name is already used in historical records. Choose a different name to avoid merging histories.',
          );
        }
      }

      const updated = await transaction.execute({
        sql: `UPDATE ${kind} SET name = ?, ${column} = ? WHERE name = ?`,
        args: [normalized.name, normalized.defaultRate, previousName],
      });
      if (updated.rowsAffected === 0) {
        throw new Error('This entry no longer exists. Close and reopen the list to refresh.');
      }

      if (normalized.name !== previousName) {
        for (const reference of references) {
          await transaction.execute({
            sql: `UPDATE ${reference.table} SET ${reference.column} = ? WHERE TRIM(${reference.column}) = ?`,
            args: [normalized.name, previousName],
          });
        }
      }
    });

    this.entriesChanged$.next({
      kind,
      ...(previousName !== null && previousName !== normalized.name
        ? { previousName, name: normalized.name }
        : {}),
    });
    return normalized;
  }

  async deleteEntry(kind: DirectoryKind, name: string): Promise<void> {
    await this.coreDb.transaction(async (transaction) => {
      const deleted = await transaction.execute({
        sql: `DELETE FROM ${kind} WHERE name = ?`,
        args: [name],
      });
      if (deleted.rowsAffected === 0) {
        throw new Error('This entry no longer exists. Close and reopen the list to refresh.');
      }
    });
    this.entriesChanged$.next({ kind });
  }
}
