import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DbService } from '../../core/services/db.service';
import { BackupService } from '../../core/services/backup.service';

import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    NzStatisticModule,
    NzTimelineModule,
    NzCardModule,
    NzButtonModule,
    NzIconModule,
  ],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  totalMaterialCost = 0;
  totalTransactions = 0;
  recentActivity: any[] = [];

  constructor(
    private db: DbService,
    public backup: BackupService,
    private cdr: ChangeDetectorRef, // Forces instant UI updates
  ) {}

  async ngOnInit() {
    await this.loadDashboardData();
  }

  async loadDashboardData() {
    const materials = await this.db.materials.toArray();
    const transactions = await this.db.transactions.toArray();

    // 1. Calculate Totals
    this.totalMaterialCost = materials.reduce(
      (sum, item) => sum + (item.totalPrice || 0),
      0,
    );
    this.totalTransactions = transactions.reduce(
      (sum, item) => sum + (item.amount || 0),
      0,
    );

    // 2. Map Materials for Timeline
    const mappedMaterials = materials.map((m) => ({
      title: `Material: ${m.name} (${m.qty})`,
      subtitle: `₹${m.totalPrice} • ${m.builderName}`,
      date: m.deliveryDate,
      color: 'blue', // Blue dot for materials
    }));

    // 3. Map Transactions for Timeline
    const mappedTrans = transactions.map((t) => ({
      title: `Ledger Paid: ${t.receiver}`,
      subtitle: `₹${t.amount} • From: ${t.provider}`,
      date: t.dateTime,
      color: 'green', // Green dot for money
    }));

    // 4. Merge, Sort by Newest, and Keep Top 5
    this.recentActivity = [...mappedMaterials, ...mappedTrans]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    this.cdr.detectChanges();
  }

  // --- CSV Import Handlers ---
  async onMaterialFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      try {
        await this.backup.importMaterials(file);
        await this.loadDashboardData();
        alert('Materials imported successfully!');
      } catch (error) {
        alert('Error importing materials.');
      }
      event.target.value = '';
    }
  }

  async onTransactionFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      try {
        await this.backup.importTransactions(file);
        await this.loadDashboardData();
        alert('Ledger imported successfully!');
      } catch (error) {
        alert('Error importing ledger.');
      }
      event.target.value = '';
    }
  }
}
