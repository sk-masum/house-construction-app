import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { NzDrawerModule, NzDrawerRef, NzDrawerService } from 'ng-zorro-antd/drawer';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { BackupService } from '../../services/backup.service';
import { ProjectService } from '../../services/project.service';
import { MaterialService } from '../../services/material.service';
import { MaterialManagerComponent } from '../material-manager/material-manager.component';
import { DirectoryManagerComponent } from '../directory-manager/directory-manager.component';
import { DirectoryKind } from '../../services/directory.service';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [NzDrawerModule, NzIconModule, MaterialManagerComponent, DirectoryManagerComponent],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
})
export class MenuComponent implements OnDestroy {
  isMenuOpen = false;
  isPriceDrawerVisible = false;
  isDirectoryDrawerVisible = false;
  directoryKind: DirectoryKind = 'builders';
  isLoadingMaterials = false;
  isExporting = false;
  isImporting = false;
  dynamicMaterialOptions: string[] = [];
  dynamicPriceDefaults: Record<string, number> = {};
  private menuDrawer?: NzDrawerRef;
  private managerAfterClose: 'materials' | DirectoryKind | null = null;
  @ViewChild('menuContent', { static: true }) menuContent!: TemplateRef<{
    $implicit: unknown;
    drawerRef: NzDrawerRef;
  }>;
  @ViewChild('menuTitle', { static: true }) menuTitle!: TemplateRef<object>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(
    private projectService: ProjectService,
    private backupService: BackupService,
    private materialService: MaterialService,
    private drawerService: NzDrawerService,
    private cdr: ChangeDetectorRef,
  ) {}

  openMenu() {
    if (this.menuDrawer) return;
    this.isMenuOpen = true;
    this.menuDrawer = this.drawerService.create<object, unknown>({
      nzTitle: this.menuTitle,
      nzPlacement: 'left',
      nzWidth: 'min(460px, 100vw)',
      nzWrapClassName: 'app-menu-drawer',
      nzContent: this.menuContent,
      nzOnCancel: async () => {
        this.isMenuOpen = false;
        return true;
      },
    });
    this.menuDrawer.afterClose.subscribe(() => {
      this.menuDrawer = undefined;
      this.isMenuOpen = false;
      if (this.managerAfterClose === 'materials') {
        this.isPriceDrawerVisible = true;
      } else if (this.managerAfterClose) {
        this.directoryKind = this.managerAfterClose;
        this.isDirectoryDrawerVisible = true;
      }
      this.managerAfterClose = null;
      this.cdr.markForCheck();
    });
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
      this.menuDrawer?.close();
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
      this.menuDrawer?.close();
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
      if (this.menuDrawer && this.isMenuOpen) {
        this.managerAfterClose = 'materials';
        this.menuDrawer.close();
      }
    } catch (error) {
      console.error('Failed to load material prices', error);
      alert('Failed to load material prices. Please try again.');
    } finally {
      this.isLoadingMaterials = false;
      this.cdr.markForCheck();
    }
  }

  openDirectoryManager(kind: DirectoryKind) {
    if (!this.menuDrawer) return;
    this.managerAfterClose = kind;
    this.menuDrawer.close();
  }

  ngOnDestroy() {
    this.managerAfterClose = null;
    this.menuDrawer?.close();
  }
}
