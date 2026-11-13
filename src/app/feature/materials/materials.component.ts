import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { MaterialCardComponent } from './components/material-card/material-card.component';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  DbService,
  Material,
  MaterialFilters,
} from '../../core/services/db.service';
import { FlatpickrUtils } from '../../shared/utils/flatpickr.utils';
import {
  TabSwitcherComponent,
  TabConfig,
} from '../../shared/components/tab-switcher.component';
import 'flatpickr/dist/flatpickr.min.css';

import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSpinModule } from 'ng-zorro-antd/spin';

@Component({
  selector: 'app-materials',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TabSwitcherComponent,
    NzDrawerModule,
    NzFormModule,
    NzInputModule,
    NzInputNumberModule,
    NzButtonModule,
    NzIconModule,
    NzPopconfirmModule,
    MaterialCardComponent,
    NzSpinModule,
  ],
  templateUrl: './materials.component.html',
})
export class MaterialsComponent implements OnInit, OnDestroy {
  readonly MATERIAL_OPTIONS = [
    'Cement',
    'Bricks',
    'Stone',
    'Sand',
    '8 Bar',
    '10 Bar',
    '12 Bar',
    '6 Bar',
    '16 Bar',
    '7x7 Ring',
  ];
  readonly BUILDER_OPTIONS = ['SS', 'Nice', 'KGN'];

  readonly tabs: TabConfig[] = [
    { label: 'By Date', value: 'date' },
    { label: 'By Material', value: 'material' },
    { label: 'By Builder', value: 'builder' },
  ];

  dateGroups: any[] = [];
  isLoading = true;

  // Form States
  isDrawerVisible = false;
  materialForm!: FormGroup;
  filterForm!: FormGroup;

  // View & Data States
  activeView: 'date' | 'material' | 'builder' = 'date';
  // rawMaterials: Material[] = [];
  displayMaterials: Material[] = [];
  sortOrder: 'desc' | 'asc' = 'desc';

  // Aggregated Groups
  materialGroups: any[] = [];
  builderGroups: any[] = [];

  // Drill-Down Detail State
  isDetailVisible = false;
  detailTitle = '';
  detailItems: Material[] = [];
  builderDetailGroups: any[] = [];
  currentSqlFilters: MaterialFilters = {};

  // Flatpickr instance
  private datepickerInstance: any;

  private formSub!: Subscription;
  private filterSub!: Subscription;

  constructor(
    private fb: FormBuilder,
    private db: DbService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadMaterials();

    this.filterSub = this.filterForm.valueChanges.subscribe(() => {
      this.applyFilters();
    });
  }

  initForm(): void {
    this.materialForm = this.fb.group({
      id: [null],
      name: [null, [Validators.required]],
      qty: [1, [Validators.required, Validators.min(0.01)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      totalPrice: [{ value: 0, disabled: true }],
      deliveryDate: [new Date(), [Validators.required]],
      builderName: [null, [Validators.required]],
    });

    this.filterForm = this.fb.group({
      materials: [[]],
      builders: [[]],
      dateRange: [[]],
    });

    this.formSub = this.materialForm.valueChanges.subscribe((values) => {
      const qty = values.qty || 0;
      const price = values.unitPrice || 0;
      this.materialForm
        .get('totalPrice')
        ?.setValue(qty * price, { emitEvent: false });
    });
  }

  async loadMaterials() {
    await this.applyFilters();
  }

  async applyFilters() {
    this.isLoading = true;
    this.cdr.detectChanges();

    const formVals = this.filterForm.value;

    this.currentSqlFilters = {
      materials: formVals.materials || [],
      builders: formVals.builders || [],
      startDate: formVals.dateRange?.[0]
        ? new Date(
            new Date(formVals.dateRange[0]).setHours(0, 0, 0, 0),
          ).toISOString()
        : undefined,
      endDate: formVals.dateRange?.[1]
        ? new Date(
            new Date(formVals.dateRange[1]).setHours(23, 59, 59, 999),
          ).toISOString()
        : undefined,
      sortOrder: this.sortOrder,
    };

    // Execute all 3 SQL queries concurrently
    const [display, builderAgg, materialAgg] = await Promise.all([
      this.db.getFilteredMaterials(this.currentSqlFilters),
      this.db.getBuilderSummaries(this.currentSqlFilters),
      this.db.getMaterialSummaries(this.currentSqlFilters),
    ]);

    this.displayMaterials = display;
    this.builderGroups = builderAgg;
    this.materialGroups = materialAgg;

    this.buildDateGroups(); // (We still group dates via JS using displayMaterials to preserve the full item cards)

    this.isLoading = false;
    this.cdr.detectChanges();
  }

  buildDateGroups(): void {
    const dateMap = new Map<string, any>();
    for (const item of this.displayMaterials) {
      const dateKey = item.deliveryDate.toString().split('T')[0];
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          dateKey,
          displayDate: item.deliveryDate,
          totalPrice: 0,
          count: 0,
          items: [],
        });
      }
      const dGroup = dateMap.get(dateKey);
      dGroup.totalPrice += item.totalPrice;
      dGroup.count++;
      dGroup.items.push(item);
    }
    this.dateGroups = Array.from(dateMap.values());
  }

  // --- View Navigation & Drill Down ---
  setView(view: 'date' | 'material' | 'builder') {
    this.activeView = view;
  }

  onTabChange(value: string) {
    this.setView(value as 'date' | 'material' | 'builder');
  }

  async openDetail(title: string, type: 'builder' | 'material') {
    this.detailTitle = title;
    this.isDetailVisible = true;
    this.detailItems = []; // Clear old data to prevent flickering
    this.cdr.detectChanges();

    // Create a specific filter object for this drill-down
    const drillDownFilters = { ...this.currentSqlFilters };
    if (type === 'builder') drillDownFilters.builders = [title];
    if (type === 'material') drillDownFilters.materials = [title];

    // Query SQLite for the exact records
    this.detailItems = await this.db.getFilteredMaterials(drillDownFilters);

    this.processDetailGroups(); // Runs your existing invoice-style grouping
    this.cdr.detectChanges();
  }

  closeDetail() {
    this.isDetailVisible = false;
  }

  // --- Form CRUD ---
  openDrawer(material?: Material): void {
    if (material) {
      this.materialForm.patchValue({
        ...material,
        deliveryDate: new Date(material.deliveryDate),
      });
    } else {
      this.materialForm.reset({
        qty: 1,
        unitPrice: 0,
        deliveryDate: new Date(),
      });
    }
    this.isDrawerVisible = true;

    setTimeout(() => {
      this.initializeFlatpickr();
    }, 100);
  }

  closeDrawer(): void {
    this.isDrawerVisible = false;
    FlatpickrUtils.destroy(this.datepickerInstance);
    this.datepickerInstance = null;
  }

  private initializeFlatpickr(): void {
    this.datepickerInstance = FlatpickrUtils.initializeDatePicker(
      this.materialForm,
      'deliveryDateInput',
      'deliveryDate',
    );
  }

  async submitForm() {
    if (this.materialForm.valid) {
      const formValue = this.materialForm.getRawValue();

      if (!(formValue.deliveryDate instanceof Date)) {
        formValue.deliveryDate = new Date(formValue.deliveryDate);
      }

      if (formValue.id) {
        await this.db.updateMaterial(formValue);
      } else {
        delete formValue.id;
        await this.db.addMaterial(formValue);
      }

      this.closeDrawer();
      await this.loadMaterials();

      if (this.isDetailVisible) {
        await this.updateDetailView();
      }
    }
  }

  async deleteMaterial(id: number) {
    if (id) {
      await this.db.deleteMaterial(id);
      await this.loadMaterials();

      if (this.isDetailVisible) {
        await this.updateDetailView();

        if (this.detailItems.length === 0) {
          this.closeDetail();
        }
      }
    }
  }

  private async updateDetailView() {
    // Create a specific filter object for this drill-down
    const drillDownFilters = { ...this.currentSqlFilters };

    if (this.activeView === 'builder') {
      drillDownFilters.builders = [this.detailTitle];
    } else if (this.activeView === 'material') {
      drillDownFilters.materials = [this.detailTitle];
    }

    // Re-fetch the exact records from SQLite
    this.detailItems = await this.db.getFilteredMaterials(drillDownFilters);

    // Re-run the grouping for the UI
    this.processDetailGroups();
    this.cdr.detectChanges();
  }

  toggleSort(): void {
    this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
    this.applyFilters();
  }

  resetFilters(): void {
    this.filterForm.reset({ materials: [], builders: [], dateRange: [] });
  }

  processDetailGroups() {
    if (this.activeView === 'builder') {
      const map = new Map<string, any>();

      for (const item of this.detailItems) {
        if (!map.has(item.name)) {
          map.set(item.name, {
            materialName: item.name,
            totalQty: 0,
            totalPrice: 0,
            items: [],
          });
        }
        const g = map.get(item.name);
        g.totalQty += item.qty;
        g.totalPrice += item.totalPrice;
        g.items.push(item);
      }

      // Sort items inside each group by Date (newest first)
      for (const group of map.values()) {
        group.items.sort(
          (a: any, b: any) =>
            new Date(b.deliveryDate).getTime() -
            new Date(a.deliveryDate).getTime(),
        );
      }

      // Sort the categories themselves by total price (highest first)
      this.builderDetailGroups = Array.from(map.values()).sort(
        (a, b) => b.totalPrice - a.totalPrice,
      );
    }
  }

  ngOnDestroy(): void {
    if (this.formSub) this.formSub.unsubscribe();
    if (this.filterSub) this.filterSub.unsubscribe();
  }
}
