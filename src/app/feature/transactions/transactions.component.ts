import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { TransactionByDateComponent } from './components/transaction-by-date/transaction-by-date.component';
import { TransactionReceiverComponent } from './components/transaction-receiver/transaction-receiver.component';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProjectService } from '../../core/services/project.service';
import { DirectoryService } from '../../core/services/directory.service';
import {
  Transaction,
  TransactionFilters,
  TransactionService,
} from '../../core/services/transaction.service';
import {
  TabSwitcherComponent,
  TabConfig,
} from '../../shared/components/tab-switcher.component';

import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { Subscription } from 'rxjs';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { TransactionCardComponent } from './components/transaction-card/transaction-card.component';
import { TransactionFormComponent } from './components/transaction-form/transaction-form.component';
import { ReceiverOption, ReceiverSummary } from './models/transaction.model';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [
    CommonModule,
    NzDrawerModule,
    TabSwitcherComponent,
    PageHeaderComponent,
    TransactionCardComponent,
    TransactionReceiverComponent,
    TransactionFormComponent,
    TransactionByDateComponent,
  ],
  templateUrl: './transactions.component.html',
})
export class TransactionsComponent implements OnInit, OnDestroy {
  private projectSub!: Subscription;
  private directorySub!: Subscription;

  readonly tabs: TabConfig[] = [
    { label: 'By Date', value: 'date' },
    { label: 'By Receiver', value: 'receiver' },
  ];

  directoryReceivers: ReceiverOption[] = [];
  currentSqlFilters: TransactionFilters = {};
  isLoading = false;

  // Form & View States
  isDrawerVisible = false;
  transactionForm!: FormGroup;
  activeView: 'date' | 'receiver' = 'date';
  sortOrder: 'desc' | 'asc' = 'desc';

  // Data States
  displayTransactions: Transaction[] = [];

  // Aggregated Groups
  dateGroups: any[] = [];
  receiverGroups: ReceiverSummary[] = [];

  // Drill-Down States
  isDetailVisible = false;
  detailTitle = '';
  detailItems: Transaction[] = [];

  constructor(
    private fb: FormBuilder,
    private projectService: ProjectService,
    private transactionService: TransactionService,
    private directoryService: DirectoryService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.initForm();
    void this.loadReceiverOptions();
    this.directorySub = this.directoryService.entriesChanged$.subscribe(
      async ({ previousName, name }) => {
        if (previousName && name) {
          if (this.transactionForm.get('receiver')?.value === previousName) {
            this.transactionForm.patchValue(
              { receiver: name },
              { emitEvent: false },
            );
          }
          if (this.transactionForm.get('provider')?.value === previousName) {
            this.transactionForm.patchValue(
              { provider: name },
              { emitEvent: false },
            );
          }
          if (this.detailTitle === previousName) this.detailTitle = name;
          await this.loadTransactions();
          if (this.isDetailVisible) await this.updateDetailView();
        }
        await this.loadReceiverOptions();
      },
    );
    this.projectSub = this.projectService.activeProjectId$.subscribe(
      async () => {
        await this.loadTransactions();
      },
    );
  }

  private async loadReceiverOptions() {
    try {
      const [builders, contractors] = await Promise.all([
        this.directoryService.getEntries('builders'),
        this.directoryService.getEntries('contractors'),
      ]);
      this.directoryReceivers = [
        ...builders.map(
          (builder): ReceiverOption => ({
            name: builder.name,
            group: 'Builders',
          }),
        ),
        ...contractors.map(
          (contractor): ReceiverOption => ({
            name: contractor.name,
            group: 'Contractors',
          }),
        ),
      ];
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Failed to load payment receivers', error);
      alert('Failed to load payment receivers. Please reopen Ledger to retry.');
    }
  }

  initForm(): void {
    this.transactionForm = this.fb.group({
      id: [null],
      amount: [null, [Validators.required, Validators.min(1)]],
      dateTime: [new Date(), [Validators.required]],
      provider: [null, [Validators.required]],
      receiver: [null, [Validators.required]],
    });
  }

  async loadTransactions() {
    await this.applyFilters();
  }

  async applyFilters() {
    this.isLoading = true;
    this.cdr.detectChanges();

    // Set up current filters (currently just sortOrder, but ready for a filterForm if you add one)
    this.currentSqlFilters = {
      sortOrder: this.sortOrder,
    };

    try {
      const display = await this.transactionService.getFilteredTransactions(
        this.currentSqlFilters,
      );
      this.displayTransactions = display;
      this.receiverGroups = this.buildReceiverSummaries(display);
      this.buildDateGroups();
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private buildReceiverSummaries(
    transactions: Transaction[],
  ): ReceiverSummary[] {
    const groups = new Map<string, ReceiverSummary>();
    for (const transaction of transactions) {
      const group = groups.get(transaction.receiver) ?? {
        name: transaction.receiver,
        count: 0,
        totalAmount: 0,
      };
      group.count += 1;
      group.totalAmount += transaction.amount || 0;
      groups.set(transaction.receiver, group);
    }
    return Array.from(groups.values()).sort(
      (a, b) => b.totalAmount - a.totalAmount,
    );
  }

  buildDateGroups(): void {
    const dateMap = new Map<string, any>();
    for (const item of this.displayTransactions) {
      const d = new Date(item.dateTime);
      const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          dateKey,
          displayDate: item.dateTime,
          totalAmount: 0,
          count: 0,
          items: [],
        });
      }
      const dGroup = dateMap.get(dateKey);
      dGroup.totalAmount += item.amount;
      dGroup.count++;
      dGroup.items.push(item);
    }
    // They are already sorted by SQL, so just convert to array
    this.dateGroups = Array.from(dateMap.values());
  }

  // --- Navigation & Drill Down ---
  setView(view: 'date' | 'receiver') {
    this.activeView = view;
  }

  onTabChange(value: string) {
    this.setView(value as 'date' | 'receiver');
  }

  async openDetail(title: string, type: string) {
    this.detailTitle = title;
    this.isDetailVisible = true;
    this.detailItems = []; // Clear for instant UI feedback
    this.cdr.detectChanges();

    const drillDownFilters = { ...this.currentSqlFilters };
    if (type === 'receiver') drillDownFilters.receivers = [title];

    this.detailItems =
      await this.transactionService.getFilteredTransactions(drillDownFilters);
    this.cdr.detectChanges();
  }

  closeDetail() {
    this.isDetailVisible = false;
  }

  private async updateDetailView() {
    const drillDownFilters = { ...this.currentSqlFilters };
    if (this.activeView === 'receiver') {
      drillDownFilters.receivers = [this.detailTitle];
    }
    this.detailItems =
      await this.transactionService.getFilteredTransactions(drillDownFilters);
    this.cdr.detectChanges();
  }

  // --- CRUD Methods ---
  openDrawer(transaction?: Transaction): void {
    void this.loadReceiverOptions();
    if (transaction) {
      this.transactionForm.patchValue(transaction);
    } else {
      this.transactionForm.reset({ dateTime: new Date() });
    }
    this.isDrawerVisible = true;
  }

  closeDrawer(): void {
    this.isDrawerVisible = false;
  }

  async submitForm() {
    if (this.transactionForm.valid) {
      const formValue = this.transactionForm.getRawValue();

      // 1. BULLETPROOF OBJECT CREATION
      const transactionToSave = {
        ...formValue,
        projectId: this.projectService.activeProjectId$.value,
      };

      // 2. Format Date
      if (!(transactionToSave.dateTime instanceof Date)) {
        transactionToSave.dateTime = new Date(transactionToSave.dateTime);
      }

      // Save through the Turso-backed transaction service.
      if (transactionToSave.id) {
        await this.transactionService.updateTransaction(transactionToSave);
      } else {
        delete transactionToSave.id;
        await this.transactionService.addTransaction(transactionToSave);
      }

      this.closeDrawer();
      await this.loadTransactions();
    }
  }

  async deleteTransaction(id: number) {
    if (id) {
      await this.transactionService.deleteTransaction(id);
      await this.loadTransactions();

      if (this.isDetailVisible) {
        await this.updateDetailView();
        if (this.detailItems.length === 0) this.closeDetail();
      }
    }
  }

  ngOnDestroy(): void {
    this.directorySub?.unsubscribe();
    if (this.projectSub) this.projectSub.unsubscribe();
  }
}
