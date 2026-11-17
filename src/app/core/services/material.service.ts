import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { CoreDbService } from './core-db.service';
import { ProjectService } from './project.service';

export interface Material {
  id?: number;
  projectId: number | null;
  name: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
  deliveryDate: string | Date;
  builderName: string;
  deliveryCharge: number;
}

export interface MaterialFilters {
  materials?: string[];
  builders?: string[];
  startDate?: string;
  endDate?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable({ providedIn: 'root' })
export class MaterialService {
  readonly materialDefaultsChanged$ = new Subject<void>();

  constructor(
    private coreDb: CoreDbService,
    private projectService: ProjectService,
  ) {}

  async getAllMaterials(): Promise<Material[]> {
    return this.coreDb.query<Material>(
      'SELECT * FROM materials ORDER BY deliveryDate DESC',
    );
  }

  async getMaterialsForProject(projectId: number): Promise<Material[]> {
    return this.coreDb.query<Material>(
      'SELECT * FROM materials WHERE projectId = ? ORDER BY deliveryDate DESC',
      [projectId],
    );
  }

  async addMaterial(mat: Material): Promise<void> {
    await this.coreDb.run(
      `INSERT INTO materials (name, qty, unitPrice, totalPrice, deliveryDate, builderName, deliveryCharge, projectId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        mat.name,
        mat.qty,
        mat.unitPrice,
        mat.totalPrice,
        new Date(mat.deliveryDate).toISOString(),
        mat.builderName,
        mat.deliveryCharge || 0,
        mat.projectId || null,
      ],
    );
  }

  async updateMaterial(mat: Material): Promise<void> {
    await this.coreDb.run(
      `UPDATE materials SET name=?, qty=?, unitPrice=?, totalPrice=?, deliveryDate=?, builderName=?, deliveryCharge=?, projectId=? WHERE id=?`,
      [
        mat.name,
        mat.qty,
        mat.unitPrice,
        mat.totalPrice,
        new Date(mat.deliveryDate).toISOString(),
        mat.builderName,
        mat.deliveryCharge || 0,
        mat.projectId || null,
        mat.id,
      ],
    );
  }

  async deleteMaterial(id: number): Promise<void> {
    await this.coreDb.run('DELETE FROM materials WHERE id = ?', [id]);
  }

  // --- FILTERS ---

  private buildFilterClause(filters: MaterialFilters) {
    let where = '1=1';
    const args: any[] = [];
    const activeProjectId = this.projectService.activeProjectId$.value;

    if (activeProjectId) {
      where += ` AND projectId = ?`;
      args.push(activeProjectId);
    }

    if (filters.materials?.length) {
      where += ` AND name IN (${filters.materials.map(() => '?').join(',')})`;
      args.push(...filters.materials);
    }
    if (filters.builders?.length) {
      where += ` AND builderName IN (${filters.builders.map(() => '?').join(',')})`;
      args.push(...filters.builders);
    }
    if (filters.startDate && filters.endDate) {
      where += ` AND deliveryDate >= ? AND deliveryDate <= ?`;
      args.push(filters.startDate, filters.endDate);
    }
    return { where, args };
  }

  async getFilteredMaterials(filters: MaterialFilters): Promise<Material[]> {
    const { where, args } = this.buildFilterClause(filters);
    const order = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
    return this.coreDb.query(
      `SELECT * FROM materials WHERE ${where} ORDER BY deliveryDate ${order}`,
      args,
    );
  }

  // --- SETTINGS (Defaults) ---

  async getMaterialDefaults(): Promise<Record<string, number>> {
    const map: Record<string, number> = {};
    const rows = await this.coreDb.query(
      'SELECT * FROM material_defaults ORDER BY name ASC',
    );
    rows.forEach((r: any) => (map[r.name] = r.price));
    return map;
  }

  async saveMaterialDefault(name: string, price: number): Promise<void> {
    await this.coreDb.run(
      'INSERT OR REPLACE INTO material_defaults (name, price) VALUES (?, ?)',
      [name, price],
    );
    this.materialDefaultsChanged$.next();
  }
}
