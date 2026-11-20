import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { BackupService } from '../../services/backup.service';
import { ProjectService } from '../../services/project.service';
import { MaterialService } from '../../services/material.service';
import { MaterialManagerComponent } from '../material-manager/material-manager.component';
import { DirectoryManagerComponent } from '../directory-manager/directory-manager.component';
import { DirectoryKind } from '../../services/directory.service';
import { SkSidebarMenu } from '@seakh/ui-angular';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [
    NzIconModule,
    MaterialManagerComponent,
    DirectoryManagerComponent,
    SkSidebarMenu,
  ],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
})
export class MenuComponent {
  isMenuOpen = false;
  isPriceDrawerVisible = false;
  isDirectoryDrawerVisible = false;
  directoryKind: DirectoryKind = 'builders';
  isLoadingMaterials = false;
  isExporting = false;
  isImporting = false;
  dynamicMaterialOptions: string[] = [];
  dynamicPriceDefaults: Record<string, number> = {};

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(
    private projectService: ProjectService,
    private backupService: BackupService,
    private materialService: MaterialService,
    private cdr: ChangeDetectorRef,
  ) {}

  get menuItems() {
    const isBusy =
      this.isImporting || this.isExporting || this.isLoadingMaterials;

    return [
      {
        id: 'materials',
        label: this.isLoadingMaterials ? 'Loading...' : 'Materials',
        description: 'Materials & default prices',
        disabled: isBusy,
      },
      {
        id: 'builders',
        label: 'Builders',
        description: 'Builders & delivery charges',
        disabled: isBusy,
      },
      {
        id: 'contractors',
        label: 'Contractors',
        description: 'Contractors & square-foot rates',
        disabled: isBusy,
      },
    ];
  }

  openMenu() {
    this.isMenuOpen = true;
  }

  onMenuItemSelect(event: CustomEvent<{ id: string }>) {
    this.isMenuOpen = false;

    switch (event.detail.id) {
      case 'materials':
        this.openMaterialManager();
        break;
      case 'builders':
        this.openDirectoryManager('builders');
        break;
      case 'contractors':
        this.openDirectoryManager('contractors');
        break;
    }
  }

  async exportProject() {
    if (this.isExporting) return;
    const projectId = this.projectService.activeProjectId$.value;
    if (projectId === null) {
      alert('Please select a specific project from the top menu first.');
      return;
    }

    this.isExporting = true;
    try {
      await this.backupService.exportProjectToFile(projectId);
      this.isMenuOpen = false;
    } catch (error) {
      console.error('Export failed', error);
      alert('Failed to export project. Please try again.');
    } finally {
      this.isExporting = false;
      this.cdr.markForCheck();
    }
  }

  importProjectClick() {
    this.fileInput.nativeElement.click();
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    this.isImporting = true;

    try {
      const projectName = await this.backupService.importProjectFromFile(file);
      this.isMenuOpen = false;
      alert(`Successfully imported: ${projectName}`);
    } catch (error) {
      console.error('Import failed', error);
      alert(
        'Failed to import project. Ensure it is a valid SiteLedger JSON backup.',
      );
    } finally {
      input.value = '';
      this.isImporting = false;
      this.cdr.markForCheck();
    }
  }

  async loadMasterData() {
    this.dynamicPriceDefaults =
      await this.materialService.getMaterialDefaults();
    this.dynamicMaterialOptions = Object.keys(this.dynamicPriceDefaults);
    this.cdr.markForCheck();
  }

  async openMaterialManager() {
    if (this.isLoadingMaterials) return;
    this.isLoadingMaterials = true;
    try {
      await this.loadMasterData();
      this.isMenuOpen = false;
      this.isPriceDrawerVisible = true;
    } catch (error) {
      console.error('Failed to load material prices', error);
      alert('Failed to load material prices. Please try again.');
    } finally {
      this.isLoadingMaterials = false;
      this.cdr.markForCheck();
    }
  }

  openDirectoryManager(kind: DirectoryKind) {
    this.directoryKind = kind;
    this.isMenuOpen = false;
    this.isDirectoryDrawerVisible = true;
  }
}
