import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { DbService, Work } from '../../core/services/db.service';
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

import { NzProgressModule } from 'ng-zorro-antd/progress';

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
    NzProgressModule,
  ],
  providers: [provideCharts(withDefaultRegisterables())],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private workSub!: Subscription;
  totalMaterialCost = 0;
  totalTransactions = 0;
  recentActivity: any[] = [];

  activeWork: Work | null = null;
  totalServiceCharge = 0;
  progressData: any[] = [];
  totalLiability = 0; // Material + Labor

  outstandingBalance = 0;
  isAdvance = false;

  totalEstimatedMaterialCost = 0;

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
    this.workSub = this.db.activeWorkId$.subscribe(async () => {
      await this.loadDashboardData();
    });
  }

  async loadDashboardData() {
    const currentWorkId = this.db.activeWorkId$.value;

    // 1. Fetch Context-Specific Data
    if (currentWorkId) {
      this.activeWork = (await this.db.getWorkById(currentWorkId)) || null;
      this.progressData = await this.db.getWorkMaterialProgress(currentWorkId);
      this.totalServiceCharge = this.activeWork?.totalServiceCharge || 0;

      const ests = await this.db.getEstimationsForWork(currentWorkId);
      this.totalEstimatedMaterialCost = ests.reduce(
        (sum, e) => sum + (e.totalCost || 0),
        0,
      );
    } else {
      this.activeWork = null;
      this.progressData = [];
      this.totalEstimatedMaterialCost = 0;
      // Global view: sum up all service charges from all projects
      const allWorks = await this.db.getWorks();
      this.totalServiceCharge = allWorks.reduce(
        (sum, w) => sum + (w.totalServiceCharge || 0),
        0,
      );
    }

    // 2. Fetch using the new SQLite methods (empty object means no filters)
    const [materials, transactions, materialAgg] = await Promise.all([
      this.db.getFilteredMaterials({}),
      this.db.getFilteredTransactions({}),
      this.db.getMaterialSummaries({}), // NEW: Get the grouped data directly!
    ]);

    // 3. Financial Math
    this.totalMaterialCost = materials.reduce(
      (sum, m) => sum + (m.totalPrice || 0),
      0,
    );
    this.totalTransactions = transactions.reduce(
      (sum, t) => sum + (t.amount || 0),
      0,
    );

    // Liability = Material Costs + Contractor Service Charge
    this.totalLiability = this.totalMaterialCost + this.totalServiceCharge;

    // Balance = Liability - Payments
    this.outstandingBalance = this.totalLiability - this.totalTransactions;
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
            borderWidth: 0,
            hoverOffset: 6,
          },
        ],
      };
    } else {
      this.pieChartData = { labels: [], datasets: [{ data: [] }] };
    }

    // 5. Update Timeline
    const mappedMaterials = materials.map((m) => ({
      title: `Material: ${m.name}`,
      subtitle: `₹${m.totalPrice}`,
      date: m.deliveryDate,
      color: 'blue',
    }));
    const mappedTrans = transactions.map((t) => ({
      title: `Paid: ${t.receiver}`,
      subtitle: `₹${t.amount}`,
      date: t.dateTime,
      color: 'green',
    }));
    this.recentActivity = [...mappedMaterials, ...mappedTrans]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    // Clean up the listener when you leave the dashboard
    if (this.workSub) {
      this.workSub.unsubscribe();
    }
  }
}
