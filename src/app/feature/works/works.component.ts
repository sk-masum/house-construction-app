import { Component, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StepperComponent } from './components/stepper/stepper.component';
import { TextfieldComponent } from '../../shared/components/textfield/textfield.component';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import {
  DbService,
  Work,
  WorkEstimation,
} from '../../core/services/db.service';

import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { SelectComponent } from '../../shared/components/select/select.component';
import { CdkStepperModule } from '@angular/cdk/stepper';

@Component({
  selector: 'app-works',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    NzDrawerModule,
    NzFormModule,
    NzButtonModule,
    NzIconModule,
    NzPopconfirmModule,
    TextfieldComponent,
    SelectComponent,
    CdkStepperModule,
    StepperComponent,
  ],
  templateUrl: './works.component.html',
})
export class WorksComponent implements OnInit {
  @ViewChild('stepper') stepper!: StepperComponent;

  isSaving = false;
  works: Work[] = [];

  // Drawer & Stepper State
  isDrawerVisible = false;
  // activeTab = 0;
  currentWorkId: number | null = null;
  currentEstimations: WorkEstimation[] = [];

  // Forms
  workForm!: FormGroup;
  estForm!: FormGroup;

  dynamicMaterialOptions: string[] = [];
  dynamicPriceDefaults: Record<string, number> = {};

  // 2. NEW: Price Manager State
  isPriceDrawerVisible = false;
  newMaterialName = '';
  newMaterialPrice = 0;

  // Dropdown Options
  readonly SERVICE_TYPES = ['Sq Ft', 'Lump Sum', 'Daily Rate'];
  readonly UNIT_OPTIONS = ['Bags', 'Pcs', 'VC', 'Kg', 'Ton'];

  constructor(
    private fb: FormBuilder,
    private db: DbService,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit() {
    this.initForms();
    await this.loadMasterData();
    await this.loadWorks();
  }

  initForms() {
    this.workForm = this.fb.group({
      id: [null],
      name: [null, Validators.required],
      contractorName: [null, Validators.required],
      serviceType: ['Sq Ft', Validators.required],
      serviceRate: [0, Validators.required],
      serviceQty: [1, Validators.required],
      totalServiceCharge: [0],
    });

    // Auto-calculate Total Service Charge
    this.workForm.valueChanges.subscribe((val) => {
      if (val.serviceRate && val.serviceQty) {
        this.workForm.patchValue(
          { totalServiceCharge: val.serviceRate * val.serviceQty },
          { emitEvent: false },
        );
      }
    });

    this.estForm = this.fb.group({
      materialName: [null, Validators.required],
      qty: [null, Validators.required],
      unit: [null, Validators.required],
      unitPrice: [0, Validators.required],
      totalCost: [0, Validators.required],
    });

    this.estForm.get('materialName')?.valueChanges.subscribe((mat) => {
      if (mat && this.dynamicPriceDefaults[mat] !== undefined) {
        this.estForm.patchValue(
          { unitPrice: this.dynamicPriceDefaults[mat] },
          { emitEvent: true },
        );
      }
    });

    // Auto-calculate Total Cost
    this.estForm
      .get('qty')
      ?.valueChanges.subscribe(() => this.calculateEstTotal());
    this.estForm
      .get('unitPrice')
      ?.valueChanges.subscribe(() => this.calculateEstTotal());
  }

  async loadWorks() {
    this.works = await this.db.getWorks();
    this.cdr.detectChanges();
  }

  async loadMasterData() {
    this.dynamicPriceDefaults = await this.db.getMaterialDefaults();
    this.dynamicMaterialOptions = Object.keys(this.dynamicPriceDefaults);
    this.cdr.detectChanges();
  }

  openNewWork() {
    this.workForm.reset();
    this.currentWorkId = null;
    this.currentEstimations = [];
    this.estForm.reset();
    // Reset stepper to first step
    this.stepper?.selectStepByIndex(0);
    this.isDrawerVisible = true;
  }

  async saveWorkStep() {
    if (this.workForm.invalid || this.isSaving) return;
    if (this.workForm.valid) {
      this.isSaving = true;
      const val = this.workForm.getRawValue();
      this.currentWorkId = await this.db.addWork(val);

      if (this.currentWorkId) {
        // UPDATE EXISTING
        val.id = this.currentWorkId;
        await this.db.updateWork(val);
      } else {
        // INSERT NEW
        this.currentWorkId = await this.db.addWork(val);
        this.workForm.patchValue({ id: this.currentWorkId });
      }

      await this.loadWorks();

      // If they updated the project they are currently viewing globally, broadcast the name change
      if (this.db.activeWorkId$.value === val.id) {
        this.db.worksListChanged$.next();
      }

      this.isSaving = false;

      // Move to Step 2: Estimations
      this.stepper.selectStepByIndex(1);
      this.cdr.detectChanges();
    }
  }
  // 3. Math Helper
  calculateEstTotal() {
    const qty = this.estForm.get('qty')?.value || 0;
    const price = this.estForm.get('unitPrice')?.value || 0;
    this.estForm.patchValue({ totalCost: qty * price }, { emitEvent: false });
  }

  // 4. Update the Save method to enforce the math
  async addEstimation() {
    if (this.estForm.valid && this.currentWorkId) {
      const val = this.estForm.getRawValue();
      val.workId = this.currentWorkId;
      val.totalCost = val.qty * val.unitPrice; // Bulletproof math enforcement

      await this.db.addEstimation(val);
      this.estForm.reset();

      this.currentEstimations = await this.db.getEstimationsForWork(
        this.currentWorkId,
      );
      this.cdr.detectChanges();
    }
  }

  async removeEstimation(id: number) {
    await this.db.deleteEstimation(id);
    if (this.currentWorkId) {
      this.currentEstimations = await this.db.getEstimationsForWork(
        this.currentWorkId,
      );
      this.cdr.detectChanges();
    }
  }

  // 2. Add the Edit trigger
  async editWork(work: Work) {
    this.workForm.reset();
    this.workForm.patchValue(work);
    this.currentWorkId = work.id!;

    // Fetch the estimations for this project
    this.currentEstimations = await this.db.getEstimationsForWork(work.id!);

    // this.activeTab = 0; // Start at Step 1
    this.isDrawerVisible = true;
    this.cdr.detectChanges();
  }

  // 3. Add the Delete trigger
  async deleteWork(id: number) {
    if (!id) return; // Guard clause

    await this.db.deleteWork(id);

    // If the user just deleted the project they are currently looking at globally, reset the header
    if (this.db.activeWorkId$.value === id) {
      this.db.activeWorkId$.next(null);
    }

    await this.loadWorks(); // Refresh the UI list
    this.cdr.detectChanges();
  }

  openPriceManager() {
    this.isPriceDrawerVisible = true;
  }

  closePriceManager() {
    this.isPriceDrawerVisible = false;
    this.newMaterialName = '';
  }

  async saveUpdatedPrices() {
    // Save all existing modified prices
    for (const mat of this.dynamicMaterialOptions) {
      await this.db.saveMaterialDefault(mat, this.dynamicPriceDefaults[mat]);
    }

    // Save new material if typed in
    if (this.newMaterialName && this.newMaterialPrice > 0) {
      await this.db.saveMaterialDefault(
        this.newMaterialName,
        this.newMaterialPrice,
      );
    }

    await this.loadMasterData(); // Refresh arrays
    this.closePriceManager();
  }

  closeDrawer() {
    this.isDrawerVisible = false;
    this.stepper?.selectStepByIndex(0);
    this.estForm.reset();
  }

  get currentEstimationsTotal(): number {
    return this.currentEstimations.reduce(
      (sum, est) => sum + (est.totalCost || 0),
      0,
    );
  }
}
