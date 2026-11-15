import { Component } from '@angular/core';
import { ElementRef, ViewChild } from '@angular/core';
import { OverlayModule } from '@angular/cdk/overlay';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { CommonModule } from '@angular/common';
import { DbService } from '../../services/db.service';
import { BackupService } from '../../services/backup.service';
@Component({
  selector: 'app-import-export-dropdown',
  standalone: true,
  imports: [OverlayModule, NzIconModule, CommonModule],
  templateUrl: './import-export-dropdown.component.html',
  styleUrls: ['./import-export-dropdown.component.scss'],
})
export class ImportExportDropdownComponent {
  isMenuOpen = false;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // Inject the new BackupService
  constructor(
    private db: DbService,
    private backupService: BackupService,
  ) {}

  async exportWork() {
    const workId = this.db.activeWorkId$.value;
    if (!workId) {
      alert('Please select a specific project from the top menu first.');
      return;
    }

    // Delegate to the service
    await this.backupService.exportWorkToFile(workId);
  }

  importWorkClick() {
    this.fileInput.nativeElement.click();
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];

    try {
      // Delegate file parsing to the service
      const projectName = await this.backupService.importWorkFromFile(file);
      alert(`Successfully imported: ${projectName}`);
    } catch (error) {
      console.error('Import failed', error);
      alert(
        'Failed to import project. Ensure it is a valid SiteLedger JSON backup.',
      );
    }

    // Reset the input
    input.value = '';
  }
}
