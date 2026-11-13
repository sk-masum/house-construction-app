import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DbService } from '../../core/services/db.service';
import { BackupService } from '../../core/services/backup.service';

import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

import {
  BaseChartDirective,
  provideCharts,
  withDefaultRegisterables,
} from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';

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
    BaseChartDirective,
  ],
  providers: [provideCharts(withDefaultRegisterables())],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  totalMaterialCost = 0;
  totalTransactions = 0;
  recentActivity: any[] = [];

  outstandingBalance = 0;
  isAdvance = false;

  pieChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [{ data: [] }],
  };
  pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#d4d4d8', // Tailwind neutral-300
          font: { size: 11, family: 'ui-sans-serif, system-ui' },
          boxWidth: 12,
          padding: 15,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => ` ₹${context.parsed.toLocaleString('en-IN')}`,
        },
      },
    },
  };

  constructor(
    private db: DbService,
    public backup: BackupService,
    private cdr: ChangeDetectorRef, // Forces instant UI updates
  ) {}

  async ngOnInit() {
    await this.loadDashboardData();
  }

  async loadDashboardData() {
    // 1. Fetch using the new SQLite methods (empty object means no filters)
    const [materials, transactions, materialAgg] = await Promise.all([
      this.db.getFilteredMaterials({}),
      this.db.getFilteredTransactions({}),
      this.db.getMaterialSummaries({}), // NEW: Get the grouped data directly!
    ]);

    // 2. Calculate Totals
    this.totalMaterialCost = materials.reduce(
      (sum, item) => sum + (item.totalPrice || 0),
      0,
    );
    this.totalTransactions = transactions.reduce(
      (sum, item) => sum + (item.amount || 0),
      0,
    );

    // 3. Calculate Global Balance
    this.outstandingBalance = this.totalMaterialCost - this.totalTransactions;
    this.isAdvance = this.outstandingBalance < 0;

    if (materialAgg.length > 0) {
      const tailwindColors = [
        '#34d399',
        '#60a5fa',
        '#c084fc',
        '#fb923c',
        '#f87171',
        '#facc15',
        '#a3e635',
      ];

      this.pieChartData = {
        labels: materialAgg.map((g) => g.name),
        datasets: [
          {
            data: materialAgg.map((g) => g.totalPrice),
            backgroundColor: tailwindColors,
            borderWidth: 0, // Removes white borders for dark mode
            hoverOffset: 6,
          },
        ],
      };
    }

    // 4. Map Materials for Timeline
    const mappedMaterials = materials.map((m) => ({
      title: `Material: ${m.name} (${m.qty})`,
      subtitle: `₹${m.totalPrice} • ${m.builderName}`,
      date: m.deliveryDate,
      color: 'blue',
    }));

    // 5. Map Transactions for Timeline
    const mappedTrans = transactions.map((t) => ({
      title: `Ledger Paid: ${t.receiver}`,
      subtitle: `₹${t.amount} • From: ${t.provider}`,
      date: t.dateTime,
      color: 'green',
    }));

    // 6. Merge, Sort by Newest, and Keep Top 5
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
