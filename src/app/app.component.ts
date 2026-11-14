import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { DbService, Work } from './core/services/db.service';
import { BackupService } from './core/services/backup.service';
import { FormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { CommonModule } from '@angular/common';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    FormsModule,
    NzSelectModule,
    RouterModule,
    NzIconModule,
    NzDropDownModule,
    NzMenuModule,
    NzButtonModule,
    CommonModule,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  allWorks: Work[] = [];
  activeWorkId: number | null = null;

  @ViewChild('materialUpload') materialUpload!: ElementRef<HTMLInputElement>;
  @ViewChild('transactionUpload') transactionUpload!: ElementRef<HTMLInputElement>;

  constructor(
    private db: DbService,
    private backup: BackupService,
    private router: Router,
    private message: NzMessageService,
  ) {}

  async ngOnInit() {
    // 1. Initial Load
    await this.fetchWorksList();

    // 2. Existing global state listener
    this.db.activeWorkId$.subscribe((id) => {
      this.activeWorkId = id;
    });

    // 3. NEW: Listen for creations and seamlessly update the dropdown
    this.db.worksListChanged$.subscribe(async () => {
      await this.fetchWorksList();
    });
  }

  // Extract the fetch logic into a reusable method
  async fetchWorksList() {
    this.allWorks = await this.db.getWorks();
  }

  onWorkChange(workId: number | null) {
    // 1. Update the global state inside DbService
    this.db.activeWorkId$.next(workId);

    // // 2. Force the current page to reload and fetch the newly filtered data
    // const currentUrl = this.router.url;
    // this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
    //   this.router.navigate([currentUrl]);
    // });
  }

  // Export/Import Methods
  async exportMaterials() {
    try {
      await this.backup.exportMaterials();
      this.message.success('Materials exported successfully');
    } catch (err) {
      this.message.error('Failed to export materials');
    }
  }

  async exportTransactions() {
    try {
      await this.backup.exportTransactions();
      this.message.success('Ledger exported successfully');
    } catch (err) {
      this.message.error('Failed to export ledger');
    }
  }

  importMaterialsClick() {
    this.materialUpload.nativeElement.click();
  }

  importTransactionsClick() {
    this.transactionUpload.nativeElement.click();
  }

  async onMaterialFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      try {
        await this.backup.importMaterials(input.files[0]);
        this.message.success('Materials imported successfully');
        input.value = '';
      } catch (err) {
        this.message.error('Failed to import materials');
      }
    }
  }

  async onTransactionFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      try {
        await this.backup.importTransactions(input.files[0]);
        this.message.success('Ledger imported successfully');
        input.value = '';
      } catch (err) {
        this.message.error('Failed to import ledger');
      }
    }
  }
}
