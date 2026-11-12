import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Subscription } from 'rxjs';
import { DbService, Material } from '../../core/services/db.service';

import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule } from 'ng-zorro-antd/select';

@Component({
  selector: 'app-materials',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzDrawerModule,
    NzFormModule,
    NzInputModule,
    NzInputNumberModule,
    NzDatePickerModule,
    NzButtonModule,
    NzIconModule,
    NzPopconfirmModule,
    NzSelectModule,
  ],
  templateUrl: './materials.component.html',
})
export class MaterialsComponent implements OnInit, OnDestroy {
  readonly MATERIAL_OPTIONS = [
    'Cement',
    'Bricks',
    'Stone',
    '8 Bar',
    '10 Bar',
    '12 Bar',
    '7x7 Ring',
  ];
  readonly BUILDER_OPTIONS = ['SS', 'Nice', 'KGN'];

  dateGroups: any[] = [];

  // Form States
  isDrawerVisible = false;
  materialForm!: FormGroup;
  filterForm!: FormGroup;

  // View & Data States
  activeView: 'date' | 'material' | 'builder' = 'date';
  rawMaterials: Material[] = [];
  displayMaterials: Material[] = [];
  sortOrder: 'desc' | 'asc' = 'desc';

  // Aggregated Groups
  materialGroups: any[] = [];
  builderGroups: any[] = [];

  // Drill-Down Detail State
  isDetailVisible = false;
  detailTitle = '';
  detailItems: Material[] = [];

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
    this.rawMaterials = await this.db.getAllMaterials();
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.rawMaterials];
    const selectedMaterials = this.filterForm.value.materials || [];
    const selectedBuilders = this.filterForm.value.builders || [];
    const dateRange = this.filterForm.value.dateRange || [];

    if (selectedMaterials.length > 0) {
      filtered = filtered.filter((item) =>
        selectedMaterials.includes(item.name),
      );
    }

    if (selectedBuilders.length > 0) {
      filtered = filtered.filter((item) =>
        selectedBuilders.includes(item.builderName),
      );
    }

    if (dateRange.length === 2 && dateRange[0] && dateRange[1]) {
      const start = new Date(dateRange[0]).setHours(0, 0, 0, 0);
      const end = new Date(dateRange[1]).setHours(23, 59, 59, 999);
      filtered = filtered.filter((item) => {
        const itemDate = new Date(item.deliveryDate).getTime();
        return itemDate >= start && itemDate <= end;
      });
    }

    filtered.sort((a, b) => {
      const dateA = new Date(a.deliveryDate).getTime();
      const dateB = new Date(b.deliveryDate).getTime();
      return this.sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    this.displayMaterials = filtered;
    this.buildGroups(); // Aggregate data for the new views
  }

  buildGroups(): void {
    const matMap = new Map<string, any>();
    const builderMap = new Map<string, any>();
    const dateMap = new Map<string, any>(); // NEW: Map for dates

    for (const item of this.displayMaterials) {
      // --- 1. Aggregate by Material (Existing) ---
      if (!matMap.has(item.name)) {
        matMap.set(item.name, {
          name: item.name,
          totalQty: 0,
          totalPrice: 0,
          count: 0,
          items: [],
        });
      }
      const mGroup = matMap.get(item.name);
      mGroup.totalQty += item.qty;
      mGroup.totalPrice += item.totalPrice;
      mGroup.count++;
      mGroup.items.push(item);

      // --- 2. Aggregate by Builder (Existing) ---
      if (!builderMap.has(item.builderName)) {
        builderMap.set(item.builderName, {
          name: item.builderName,
          totalPrice: 0,
          count: 0,
          items: [],
        });
      }
      const bGroup = builderMap.get(item.builderName);
      bGroup.totalPrice += item.totalPrice;
      bGroup.count++;
      bGroup.items.push(item);

      // --- 3. Aggregate by Date (NEW) ---
      // Strip out the time to group everything on the same calendar day
      const d = new Date(item.deliveryDate);
      const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          dateKey: dateKey,
          displayDate: item.deliveryDate, // Keep original for the pipe
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

    // Convert Maps to Arrays and Sort them
    this.materialGroups = Array.from(matMap.values()).sort(
      (a, b) => b.totalPrice - a.totalPrice,
    );
    this.builderGroups = Array.from(builderMap.values()).sort(
      (a, b) => b.totalPrice - a.totalPrice,
    );

    // Sort Date groups based on your toggleable sortOrder
    this.dateGroups = Array.from(dateMap.values()).sort((a, b) => {
      const timeA = new Date(a.displayDate).getTime();
      const timeB = new Date(b.displayDate).getTime();
      return this.sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    this.cdr.detectChanges();
  }

  // --- View Navigation & Drill Down ---
  setView(view: 'date' | 'material' | 'builder') {
    this.activeView = view;
  }

  openDetail(title: string, items: Material[]) {
    this.detailTitle = title;
    this.detailItems = items;
    this.isDetailVisible = true;
  }

  closeDetail() {
    this.isDetailVisible = false;
  }

  // --- Form CRUD ---
  openDrawer(material?: Material): void {
    if (material) {
      this.materialForm.patchValue(material);
    } else {
      this.materialForm.reset({
        qty: 1,
        unitPrice: 0,
        deliveryDate: new Date(),
      });
    }
    this.isDrawerVisible = true;
  }

  closeDrawer(): void {
    this.isDrawerVisible = false;
  }

  async submitForm() {
    if (this.materialForm.valid) {
      const formValue = this.materialForm.getRawValue();
      if (formValue.id) {
        await this.db.materials.put(formValue);
      } else {
        delete formValue.id;
        await this.db.addMaterial(formValue);
      }

      this.closeDrawer();
      await this.loadMaterials();

      // Update open drill-down view if active
      if (this.isDetailVisible) {
        this.updateDetailView(formValue.name, formValue.builderName);
      }
    }
  }

  async deleteMaterial(id: number) {
    if (id) {
      await this.db.deleteMaterial(id);
      await this.loadMaterials();

      // Remove from open drill-down view if active
      if (this.isDetailVisible) {
        this.detailItems = this.detailItems.filter((i) => i.id !== id);
        if (this.detailItems.length === 0) this.closeDetail();
      }
    }
  }

  private updateDetailView(matName: string, builderName: string) {
    // Refreshes the inner list based on what was being viewed
    if (this.activeView === 'material') {
      const group = this.materialGroups.find(
        (g) => g.name === this.detailTitle,
      );
      this.detailItems = group ? group.items : [];
    } else if (this.activeView === 'builder') {
      const group = this.builderGroups.find((g) => g.name === this.detailTitle);
      this.detailItems = group ? group.items : [];
    }

    this.cdr.detectChanges();
  }

  toggleSort(): void {
    this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
    this.applyFilters();
  }

  resetFilters(): void {
    this.filterForm.reset({ materials: [], builders: [], dateRange: [] });
  }

  ngOnDestroy(): void {
    if (this.formSub) this.formSub.unsubscribe();
    if (this.filterSub) this.filterSub.unsubscribe();
  }
}
