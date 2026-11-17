import { Injectable } from '@angular/core';
import { Material, MaterialService } from './material.service';
import {
  Project,
  ProjectEstimation,
  ProjectService,
} from './project.service';
import { Transaction, TransactionService } from './transaction.service';

type BackupEstimation = Omit<ProjectEstimation, 'id' | 'projectId'>;
type BackupMaterial = Omit<Material, 'id' | 'projectId'>;
type BackupTransaction = Omit<Transaction, 'id' | 'projectId'>;

interface ProjectBackup {
  formatVersion: 1;
  project: Project;
  estimations: BackupEstimation[];
  materials: BackupMaterial[];
  transactions: BackupTransaction[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(
  record: Record<string, unknown>,
  key: string,
): string {
  const value = record[key];
  if (typeof value !== 'string') {
    throw new Error(`Invalid backup: "${key}" must be a string.`);
  }
  return value;
}

function requiredNumber(
  record: Record<string, unknown>,
  key: string,
): number {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid backup: "${key}" must be a finite number.`);
  }
  return value;
}

function optionalNumber(
  record: Record<string, unknown>,
  key: string,
  fallback = 0,
): number {
  const value = record[key];
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid backup: "${key}" must be a finite number.`);
  }
  return value;
}

function requiredDate(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new Error(`Invalid backup: "${key}" must be a valid date string.`);
  }
  return value;
}

@Injectable({
  providedIn: 'root',
})
export class BackupService {
  constructor(
    private projectService: ProjectService,
    private materialService: MaterialService,
    private transactionService: TransactionService,
  ) {}

  private async gatherProjectBackup(
    projectId: number,
  ): Promise<ProjectBackup> {
    const project = await this.projectService.getProjectById(projectId);
    if (!project) {
      throw new Error(`Cannot export project ${projectId}: it was not found.`);
    }

    const [estimations, materials, transactions] = await Promise.all([
      this.projectService.getEstimationsForProject(projectId),
      this.materialService.getMaterialsForProject(projectId),
      this.transactionService.getTransactionsForProject(projectId),
    ]);

    return {
      formatVersion: 1,
      project,
      estimations: estimations.map((estimation) => ({
        materialName: estimation.materialName,
        qty: estimation.qty,
        unit: estimation.unit,
        unitPrice: estimation.unitPrice,
        totalCost: estimation.totalCost,
      })),
      materials: materials.map((material) => ({
        name: material.name,
        qty: material.qty,
        unitPrice: material.unitPrice,
        totalPrice: material.totalPrice,
        deliveryDate: material.deliveryDate,
        builderName: material.builderName,
        deliveryCharge: material.deliveryCharge,
      })),
      transactions: transactions.map((transaction) => ({
        amount: transaction.amount,
        dateTime: transaction.dateTime,
        provider: transaction.provider,
        receiver: transaction.receiver,
      })),
    };
  }

  private parseProject(value: unknown): Project {
    if (!isRecord(value)) {
      throw new Error('Invalid backup: project data is missing.');
    }
    return {
      name: requiredString(value, 'name'),
      contractorName: requiredString(value, 'contractorName'),
      serviceType: requiredString(value, 'serviceType'),
      serviceRate: requiredNumber(value, 'serviceRate'),
      serviceQty: requiredNumber(value, 'serviceQty'),
      totalServiceCharge: requiredNumber(value, 'totalServiceCharge'),
    };
  }

  private parseRows<T>(
    value: unknown,
    key: string,
    parseRow: (row: unknown) => T,
  ): T[] {
    if (value === undefined) return [];
    if (!Array.isArray(value)) {
      throw new Error(`Invalid backup: "${key}" must be an array.`);
    }
    return value.map(parseRow);
  }

  private parseEstimation(value: unknown): BackupEstimation {
    if (!isRecord(value)) {
      throw new Error('Invalid backup: each estimation must be an object.');
    }
    return {
      materialName: requiredString(value, 'materialName'),
      qty: requiredNumber(value, 'qty'),
      unit: requiredString(value, 'unit'),
      unitPrice: optionalNumber(value, 'unitPrice'),
      totalCost: optionalNumber(value, 'totalCost'),
    };
  }

  private parseMaterial(value: unknown): BackupMaterial {
    if (!isRecord(value)) {
      throw new Error('Invalid backup: each material must be an object.');
    }
    return {
      name: requiredString(value, 'name'),
      qty: requiredNumber(value, 'qty'),
      unitPrice: requiredNumber(value, 'unitPrice'),
      totalPrice: requiredNumber(value, 'totalPrice'),
      deliveryDate: requiredDate(value, 'deliveryDate'),
      builderName: requiredString(value, 'builderName'),
      deliveryCharge: optionalNumber(value, 'deliveryCharge'),
    };
  }

  private parseTransaction(value: unknown): BackupTransaction {
    if (!isRecord(value)) {
      throw new Error('Invalid backup: each transaction must be an object.');
    }
    return {
      amount: requiredNumber(value, 'amount'),
      dateTime: requiredDate(value, 'dateTime'),
      provider: requiredString(value, 'provider'),
      receiver: requiredString(value, 'receiver'),
    };
  }

  private parseBackup(value: unknown): ProjectBackup {
    if (!isRecord(value)) {
      throw new Error('Invalid backup file: expected a JSON object.');
    }
    if (value['formatVersion'] !== undefined && value['formatVersion'] !== 1) {
      throw new Error('Unsupported project backup version.');
    }

    return {
      formatVersion: 1,
      project: this.parseProject(value['project'] ?? value['work']),
      estimations: this.parseRows(
        value['estimations'],
        'estimations',
        (row) => this.parseEstimation(row),
      ),
      materials: this.parseRows(value['materials'], 'materials', (row) =>
        this.parseMaterial(row),
      ),
      transactions: this.parseRows(
        value['transactions'],
        'transactions',
        (row) => this.parseTransaction(row),
      ),
    };
  }

  private async restoreProjectBackup(backup: ProjectBackup): Promise<string> {
    const projectId = await this.projectService.addProject(backup.project);

    for (const estimation of backup.estimations) {
      await this.projectService.addEstimation({ ...estimation, projectId });
    }
    for (const material of backup.materials) {
      await this.materialService.addMaterial({ ...material, projectId });
    }
    for (const transaction of backup.transactions) {
      await this.transactionService.addTransaction({ ...transaction, projectId });
    }

    return backup.project.name;
  }

  async exportProjectToFile(projectId: number): Promise<void> {
    const backupData = await this.gatherProjectBackup(projectId);
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);

    try {
      const anchor = document.createElement('a');
      anchor.href = url;
      const safeName = backupData.project.name
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase();
      anchor.download = `siteledger_backup_${safeName}.json`;
      anchor.click();
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async importProjectFromFile(file: File): Promise<string> {
    const rawBackup = await new Promise<unknown>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== 'string') {
          reject(new Error('Could not read the backup file as text.'));
          return;
        }
        try {
          resolve(JSON.parse(reader.result));
        } catch (error) {
          reject(new Error('Backup file is not valid JSON.', { cause: error }));
        }
      };
      reader.onerror = () =>
        reject(reader.error ?? new Error('Failed to read backup file.'));
      reader.readAsText(file);
    });

    return this.restoreProjectBackup(this.parseBackup(rawBackup));
  }
}
