import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ViewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
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
  Project,
  ProjectEstimation,
  ProjectService,
} from '../../core/services/project.service';
import { MaterialService } from '../../core/services/material.service';
import { DirectoryService } from '../../core/services/directory.service';

import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { SelectComponent } from '../../shared/components/select/select.component';
import { CdkStepperModule } from '@angular/cdk/stepper';
import { ProjectCardComponent } from './components/project-card/project-card.component';
import { ContractDetailsFormComponent } from './components/contract-details-form/contract-details-form.component';
import { MaterialEstimationFormComponent } from './components/material-estimation-form/material-estimation-form.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-works',
  standalone: true,
  imports: [
    CommonModule,
    NzDrawerModule,
    CdkStepperModule,
    StepperComponent,
    PageHeaderComponent,
    ProjectCardComponent,
    ContractDetailsFormComponent,
    MaterialEstimationFormComponent,
  ],
  templateUrl: './works.component.html',
})
export class WorksComponent implements OnInit, OnDestroy {
  @ViewChild('stepper') stepper!: StepperComponent;
  private materialDefaultsSub!: Subscription;
  private directorySub!: Subscription;
  contractorOptions: string[] = [];
  contractorRates: Record<string, number> = {};

  isSaving = false;
  works: Project[] = [];

  // Drawer & Stepper State
  isDrawerVisible = false;
  // activeTab = 0;
  currentWorkId: number | null = null;
  currentEstimations: ProjectEstimation[] = [];

  // Forms
  workForm!: FormGroup;
  estimationForm!: FormGroup;

  dynamicMaterialOptions: string[] = [];
  dynamicPriceDefaults: Record<string, number> = {};

  // 2. NEW: Price Manager State
  isPriceDrawerVisible = false;
  newMaterialName = '';
  newMaterialPrice = 0;

  constructor(
    private fb: FormBuilder,
    private projectService: ProjectService,
    private materialService: MaterialService,
    private directoryService: DirectoryService,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit() {
    this.initForms();
    this.materialDefaultsSub =
      this.materialService.materialDefaultsChanged$.subscribe(() =>
        this.loadMasterData(),
      );
    this.directorySub = this.directoryService.entriesChanged$.subscribe(
      async ({ kind, previousName, name }) => {
        if (kind !== 'contractors') return;
        if (previousName && name) {
          if (this.workForm.get('contractorName')?.value === previousName) {
            this.workForm.patchValue(
              { contractorName: name },
              { emitEvent: false },
            );
          }
          await this.loadWorks();
        }
        await this.loadContractorDefaults();
      },
    );
    await Promise.all([this.loadMasterData(), this.loadContractorDefaults()]);
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
      this.workForm.patchValue(
        { totalServiceCharge: (val.serviceRate || 0) * (val.serviceQty || 0) },
        { emitEvent: false },
      );
    });

    this.workForm.get('contractorName')?.valueChanges.subscribe(() => {
      this.applyContractorRate();
    });
    this.workForm.get('serviceType')?.valueChanges.subscribe(() => {
      this.applyContractorRate();
    });

    this.estimationForm = this.fb.group({
      materialName: [null, Validators.required],
      qty: [null, Validators.required],
      unit: [null, Validators.required],
      unitPrice: [0, Validators.required],
      totalCost: [0, Validators.required],
    });

    this.estimationForm.get('materialName')?.valueChanges.subscribe((mat) => {
      if (mat && this.dynamicPriceDefaults[mat] !== undefined) {
        this.estimationForm.patchValue(
          { unitPrice: this.dynamicPriceDefaults[mat] },
          { emitEvent: true },
        );
      }
    });

    // Auto-calculate Total Cost
    this.estimationForm
      .get('qty')
      ?.valueChanges.subscribe(() => this.calculateEstTotal());
    this.estimationForm
      .get('unitPrice')
      ?.valueChanges.subscribe(() => this.calculateEstTotal());
  }

  async loadWorks() {
    this.works = await this.projectService.getProjects();
    this.cdr.detectChanges();
  }

  async loadMasterData() {
    this.dynamicPriceDefaults =
      await this.materialService.getMaterialDefaults();
    this.dynamicMaterialOptions = Object.keys(this.dynamicPriceDefaults);
    this.cdr.detectChanges();
  }

  async loadContractorDefaults() {
    try {
      const contractors = await this.directoryService.getEntries('contractors');
      this.contractorOptions = contractors.map((contractor) => contractor.name);
      this.contractorRates = Object.fromEntries(
        contractors.map((contractor) => [
          contractor.name,
          contractor.defaultRate,
        ]),
      );
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Failed to load contractors', error);
      alert('Failed to load contractors. Please reopen Projects to retry.');
    }
  }

  private applyContractorRate() {
    const name = this.workForm.get('contractorName')?.value;
    const rate = this.contractorRates[name];
    if (
      this.workForm.get('serviceType')?.value === 'Sq Ft' &&
      rate !== undefined
    ) {
      this.workForm.patchValue({ serviceRate: rate });
    }
  }

  openNewWork() {
    this.workForm.reset({
      serviceType: 'Sq Ft',
      serviceRate: 0,
      serviceQty: 1,
      totalServiceCharge: 0,
    });
    this.currentWorkId = null;
    this.currentEstimations = [];
    this.estimationForm.reset();
    // Reset stepper to first step
    this.stepper?.selectStepByIndex(0);
    this.isDrawerVisible = true;
  }

  async saveWorkStep() {
    if (this.workForm.invalid || this.isSaving) return;
    if (this.workForm.valid) {
      this.isSaving = true;
      try {
        const val = this.workForm.getRawValue();
        if (this.currentWorkId !== null) {
          await this.projectService.updateProject({
            ...val,
            id: this.currentWorkId,
          });
        } else {
          this.currentWorkId = await this.projectService.addProject(val);
          this.workForm.patchValue({ id: this.currentWorkId });
        }

        await this.loadWorks();

        // Move to Step 2: Estimations
        this.stepper.selectStepByIndex(1);
        this.cdr.detectChanges();
      } finally {
        this.isSaving = false;
      }
    }
  }
  // 3. Math Helper
  calculateEstTotal() {
    const qty = this.estimationForm.get('qty')?.value || 0;
    const price = this.estimationForm.get('unitPrice')?.value || 0;
    this.estimationForm.patchValue(
      { totalCost: qty * price },
      { emitEvent: false },
    );
  }

  // 4. Update the Save method to enforce the math
  async addEstimation() {
    if (this.estimationForm.valid && this.currentWorkId) {
      const val = this.estimationForm.getRawValue();
      const estimation: ProjectEstimation = {
        ...val,
        projectId: this.currentWorkId,
        totalCost: val.qty * val.unitPrice,
      };

      await this.projectService.addEstimation(estimation);
      this.estimationForm.reset();

      this.currentEstimations =
        await this.projectService.getEstimationsForProject(this.currentWorkId);
      this.cdr.detectChanges();
    }
  }

  async removeEstimation(id: number) {
    await this.projectService.deleteEstimation(id);
    if (this.currentWorkId) {
      this.currentEstimations =
        await this.projectService.getEstimationsForProject(this.currentWorkId);
      this.cdr.detectChanges();
    }
  }

  // 2. Add the Edit trigger
  async editProject(work: Project) {
    this.workForm.reset();
    this.workForm.patchValue(work, { emitEvent: false });
    if (work.id === undefined) return;
    this.currentWorkId = work.id;

    // Fetch the estimations for this project
    this.currentEstimations =
      await this.projectService.getEstimationsForProject(work.id);

    // this.activeTab = 0; // Start at Step 1
    this.isDrawerVisible = true;
    this.cdr.detectChanges();
  }

  // 3. Add the Delete trigger
  async deleteProject(id: number) {
    if (!id) return; // Guard clause

    await this.projectService.deleteProject(id);

    // If the user just deleted the project they are currently looking at globally, reset the header
    if (this.projectService.activeProjectId$.value === id) {
      this.projectService.activeProjectId$.next(null);
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
      await this.materialService.saveMaterialDefault(
        mat,
        this.dynamicPriceDefaults[mat],
      );
    }

    // Save new material if typed in
    if (this.newMaterialName && this.newMaterialPrice > 0) {
      await this.materialService.saveMaterialDefault(
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
    this.estimationForm.reset();
  }

  ngOnDestroy() {
    this.directorySub?.unsubscribe();
    this.materialDefaultsSub?.unsubscribe();
  }
}
