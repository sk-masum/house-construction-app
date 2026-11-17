import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { CoreDbService } from './core-db.service';

export interface Project {
  id?: number;
  name: string;
  contractorName: string;
  serviceType: string;
  serviceRate: number;
  serviceQty: number;
  totalServiceCharge: number;
  totalEstimatedMaterialCost?: number;
  grandTotal?: number;
}

export interface ProjectEstimation {
  id?: number;
  projectId: number;
  materialName: string;
  qty: number;
  unit: string;
  unitPrice: number;
  totalCost: number;
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
  public activeProjectId$ = new BehaviorSubject<number | null>(null);
  public projectsListChanged$ = new Subject<void>();

  constructor(private coreDb: CoreDbService) {}

  async getProjects(): Promise<Project[]> {
    const sql = `
      SELECT p.*, IFNULL(SUM(e.totalCost), 0) as totalEstimatedMaterialCost
      FROM projects p
      LEFT JOIN project_estimations e ON p.id = e.projectId
      GROUP BY p.id ORDER BY p.id DESC
    `;
    const rows = await this.coreDb.query<Project>(sql);

    return rows.map((row) => ({
      ...row,
      grandTotal:
        (row.totalServiceCharge || 0) + (row.totalEstimatedMaterialCost || 0),
    }));
  }

  async addProject(project: Project): Promise<number> {
    const id = await this.coreDb.insert(
      `INSERT INTO projects (name, contractorName, serviceType, serviceRate, serviceQty, totalServiceCharge) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        project.name,
        project.contractorName,
        project.serviceType,
        project.serviceRate,
        project.serviceQty,
        project.totalServiceCharge,
      ],
    );
    this.projectsListChanged$.next();
    return id;
  }

  async updateProject(project: Project): Promise<void> {
    await this.coreDb.run(
      `UPDATE projects SET name=?, contractorName=?, serviceType=?, serviceRate=?, serviceQty=?, totalServiceCharge=? WHERE id=?`,
      [
        project.name,
        project.contractorName,
        project.serviceType,
        project.serviceRate,
        project.serviceQty,
        project.totalServiceCharge,
        project.id,
      ],
    );
    this.projectsListChanged$.next();
  }

  async deleteProject(id: number): Promise<void> {
    // Safe cascading deletes
    await this.coreDb.run(
      'UPDATE materials SET projectId = NULL WHERE projectId = ?',
      [id],
    );
    await this.coreDb.run(
      'UPDATE transactions SET projectId = NULL WHERE projectId = ?',
      [id],
    );
    await this.coreDb.run(
      'UPDATE contractor_bills SET projectId = NULL WHERE projectId = ?',
      [id],
    );
    await this.coreDb.run(
      'DELETE FROM project_estimations WHERE projectId = ?',
      [id],
    );
    await this.coreDb.run('DELETE FROM projects WHERE id = ?', [id]);

    this.projectsListChanged$.next();
  }

  async getProjectById(id: number): Promise<Project | undefined> {
    const rows = await this.coreDb.query<Project>(
      'SELECT * FROM projects WHERE id = ?',
      [id],
    );
    return rows[0];
  }

  // --- ESTIMATIONS ---

  async getEstimationsForProject(
    projectId: number,
  ): Promise<ProjectEstimation[]> {
    return this.coreDb.query(
      'SELECT * FROM project_estimations WHERE projectId = ?',
      [projectId],
    );
  }

  async addEstimation(est: ProjectEstimation): Promise<void> {
    await this.coreDb.run(
      `INSERT INTO project_estimations (projectId, materialName, qty, unit, unitPrice, totalCost) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        est.projectId,
        est.materialName,
        est.qty,
        est.unit,
        est.unitPrice,
        est.totalCost,
      ],
    );
  }

  async deleteEstimation(id: number): Promise<void> {
    await this.coreDb.run('DELETE FROM project_estimations WHERE id = ?', [id]);
  }
}
