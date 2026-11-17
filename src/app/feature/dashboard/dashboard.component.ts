import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  Material,
  MaterialService,
} from '../../core/services/material.service';
import {
  Project,
  ProjectEstimation,
  ProjectService,
} from '../../core/services/project.service';
import { TransactionService } from '../../core/services/transaction.service';
import { DirectoryService } from '../../core/services/directory.service';

import {
  provideCharts,
  withDefaultRegisterables,
} from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';

import { BalanceComponent } from './components/balance/balance.component';
import {
  EstimationComponent,
  MaterialProgress,
} from './components/estimation/estimation.component';
import { CurrentPurchaseComponent } from './components/current-purchase/current-purchase.component';
import { PaymentBreakdownComponent } from './components/payment-breakdown/payment-breakdown.component';
import { PurchaseDistributionComponent } from './components/purchase-distribution/purchase-distribution.component';
import {
  DashboardActivity,
  RecentActivityComponent,
} from './components/recent-activity/recent-activity.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    BalanceComponent,
    EstimationComponent,
    CurrentPurchaseComponent,
    PaymentBreakdownComponent,
    PurchaseDistributionComponent,
    RecentActivityComponent,
  ],
  providers: [provideCharts(withDefaultRegisterables())],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private projectSub!: Subscription;
  totalMaterialCost = 0;
  totalTransactions = 0;
  recentActivity: DashboardActivity[] = [];

  activeProject: Project | null = null;
  totalServiceCharge = 0;
  progressData: MaterialProgress[] = [];
  totalLiability = 0; // Material + Labor

  outstandingBalance = 0;
  isAdvance = false;

  totalEstimatedMaterialCost = 0;

  contractorTotal: number = 0;
  contractorPaid: number = 0;
  materialTotal: number = 0;
  materialPaid: number = 0;

  pieChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [{ data: [] }],
  };
  pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    font: { family: "'IBM Plex Sans', sans-serif" },
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#d4d4d8', // Tailwind neutral-300
          font: { size: 11 },
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
    private projectService: ProjectService,
    private materialService: MaterialService,
    private transactionService: TransactionService,
    private directoryService: DirectoryService,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit() {
    this.projectSub = this.projectService.activeProjectId$.subscribe(
      async () => {
        await this.loadDashboardData();
      },
    );
    this.projectSub.add(this.directoryService.entriesChanged$.subscribe(
      async ({ previousName }) => {
        if (previousName) await this.loadDashboardData();
      },
    ));
  }

  async loadDashboardData() {
    const currentProjectId = this.projectService.activeProjectId$.value;
    const [materials, transactions] = await Promise.all([
      this.materialService.getFilteredMaterials({}),
      this.transactionService.getFilteredTransactions({}),
    ]);

    if (currentProjectId !== null) {
      const [project, estimations] = await Promise.all([
        this.projectService.getProjectById(currentProjectId),
        this.projectService.getEstimationsForProject(currentProjectId),
      ]);

      this.contractorTotal = project?.totalServiceCharge || 0;
      this.materialTotal = estimations.reduce(
        (sum, est) => sum + (est.totalCost || 0),
        0,
      );
      const transactions =
        await this.transactionService.getFilteredTransactions({});
      // Reset counters
      this.contractorPaid = 0;
      this.materialPaid = 0;

      transactions.forEach((txn) => {
        // If the money was paid to the primary contractor, count it towards labor
        if (
          project?.contractorName &&
          txn.receiver === project.contractorName
        ) {
          this.contractorPaid += txn.amount || 0;
        } else {
          // Otherwise, assume it was paid to a hardware store/builder for materials
          this.materialPaid += txn.amount || 0;
        }
      });
      this.activeProject = project ?? null;
      this.progressData = this.buildProgressData(estimations, materials);
      this.totalServiceCharge = this.activeProject?.totalServiceCharge || 0;
      this.totalEstimatedMaterialCost = estimations.reduce(
        (sum, estimation) => sum + (estimation.totalCost || 0),
        0,
      );
    } else {
      this.activeProject = null;
      this.progressData = [];
      this.totalEstimatedMaterialCost = 0;
      const projects = await this.projectService.getProjects();
      this.totalServiceCharge = projects.reduce(
        (sum, project) => sum + (project.totalServiceCharge || 0),
        0,
      );
    }

    this.totalMaterialCost = materials.reduce(
      (sum, material) => sum + (material.totalPrice || 0),
      0,
    );
    this.totalTransactions = transactions.reduce(
      (sum, transaction) => sum + (transaction.amount || 0),
      0,
    );

    this.totalLiability = this.totalMaterialCost + this.totalServiceCharge;
    this.outstandingBalance = this.totalLiability - this.totalTransactions;
    this.isAdvance = this.outstandingBalance < 0;

    const materialAgg = this.buildMaterialSummaries(materials);
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

    const mappedMaterials = materials.map((material) => ({
      title: `Material: ${material.name}`,
      subtitle: `₹${material.totalPrice}`,
      date: material.deliveryDate,
      color: 'blue',
    }));
    const mappedTrans = transactions.map((transaction) => ({
      title: `Paid: ${transaction.receiver}`,
      subtitle: `₹${transaction.amount}`,
      date: transaction.dateTime,
      color: 'green',
    }));
    this.recentActivity = [...mappedMaterials, ...mappedTrans]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    this.cdr.detectChanges();
  }

  private buildMaterialSummaries(
    materials: Material[],
  ): { name: string; totalPrice: number }[] {
    const summaries = new Map<string, { name: string; totalPrice: number }>();
    for (const material of materials) {
      const summary = summaries.get(material.name) ?? {
        name: material.name,
        totalPrice: 0,
      };
      summary.totalPrice += material.totalPrice || 0;
      summaries.set(material.name, summary);
    }
    return Array.from(summaries.values()).sort(
      (a, b) => b.totalPrice - a.totalPrice,
    );
  }

  private buildProgressData(
    estimations: ProjectEstimation[],
    materials: Material[],
  ): MaterialProgress[] {
    const progress = new Map<string, MaterialProgress>();
    for (const estimation of estimations) {
      const item = progress.get(estimation.materialName) ?? {
        materialName: estimation.materialName,
        estimatedQty: 0,
        unit: estimation.unit,
        actualQty: 0,
        percent: 0,
      };
      item.estimatedQty += estimation.qty || 0;
      if (estimation.unit > item.unit) item.unit = estimation.unit;
      progress.set(estimation.materialName, item);
    }

    for (const material of materials) {
      const item = progress.get(material.name) ?? {
        materialName: material.name,
        estimatedQty: 0,
        unit: 'Units',
        actualQty: 0,
        percent: 0,
      };
      item.actualQty += material.qty || 0;
      progress.set(material.name, item);
    }

    return Array.from(progress.values())
      .map((item) => ({
        ...item,
        percent:
          item.estimatedQty > 0
            ? Math.round((item.actualQty / item.estimatedQty) * 100)
            : item.actualQty > 0
              ? 100
              : 0,
      }))
      .sort((a, b) => b.percent - a.percent);
  }

  ngOnDestroy() {
    if (this.projectSub) this.projectSub.unsubscribe();
  }
}
