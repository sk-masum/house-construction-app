import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { TextfieldComponent } from '../../../shared/components/textfield/textfield.component';
import {
  DirectoryEntry,
  DirectoryKind,
  DirectoryService,
} from '../../services/directory.service';

@Component({
  selector: 'app-directory-manager',
  standalone: true,
  imports: [DecimalPipe, FormsModule, NzDrawerModule, NzPopconfirmModule, TextfieldComponent],
  templateUrl: './directory-manager.component.html',
})
export class DirectoryManagerComponent implements OnChanges {
  @Input({ required: true }) kind!: DirectoryKind;
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  entries: DirectoryEntry[] = [];
  newName = '';
  newRate = 0;
  editingName: string | null = null;
  isLoading = false;
  isSaving = false;
  loadFailed = false;
  error = '';
  success = '';
  private loadRequest = 0;
  @ViewChild('entryEditor') private entryEditor?: ElementRef<HTMLElement>;

  get title(): string {
    return this.kind === 'builders' ? 'Builders' : 'Contractors';
  }

  get rateLabel(): string {
    return this.kind === 'builders'
      ? 'Default delivery charge (₹)'
      : 'Default sqft rate (₹ / sqft)';
  }

  constructor(
    private directoryService: DirectoryService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (this.visible && (changes['visible'] || changes['kind'])) {
      void this.loadEntries();
    }
  }

  async loadEntries() {
    const request = ++this.loadRequest;
    const kind = this.kind;
    this.isLoading = true;
    this.loadFailed = false;
    this.error = '';
    this.success = '';
    this.entries = [];
    try {
      const entries = await this.directoryService.getEntries(kind);
      if (request === this.loadRequest) this.entries = entries;
    } catch (error) {
      console.error(`Failed to load ${kind}`, error);
      if (request === this.loadRequest) {
        this.loadFailed = true;
        this.error = `Could not load ${this.title.toLowerCase()}. Please retry.`;
      }
    } finally {
      if (request === this.loadRequest) {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    }
  }

  close() {
    if (this.isSaving) return;
    this.loadRequest++;
    this.visible = false;
    this.visibleChange.emit(false);
    this.newName = '';
    this.newRate = 0;
    this.editingName = null;
    this.error = '';
    this.success = '';
  }

  editEntry(entry: DirectoryEntry) {
    this.editingName = entry.name;
    this.newName = entry.name;
    this.newRate = entry.defaultRate;
    this.error = '';
    this.success = '';
    this.entryEditor?.nativeElement.scrollIntoView({ block: 'nearest' });
    this.entryEditor?.nativeElement.querySelector('input')?.focus({ preventScroll: true });
  }

  cancelEdit() {
    this.editingName = null;
    this.newName = '';
    this.newRate = 0;
    this.error = '';
  }

  async deleteEntry(entry: DirectoryEntry) {
    if (this.isSaving) return;
    this.isSaving = true;
    this.error = '';
    this.success = '';
    try {
      await this.directoryService.deleteEntry(this.kind, entry.name);
      this.entries = this.entries.filter((item) => item.name !== entry.name);
      if (this.editingName === entry.name) this.cancelEdit();
      this.success = `${entry.name} deleted. Historical records were kept.`;
    } catch (error) {
      console.error(`Failed to delete from ${this.kind}`, error);
      this.error = error instanceof Error ? error.message : 'Failed to delete the entry. Please try again.';
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  async save() {
    if (this.isSaving || this.isLoading) return;
    this.error = '';
    this.success = '';
    this.isSaving = true;
    try {
      const previousName = this.editingName;
      const saved = await this.directoryService.saveEntry(
        this.kind,
        { name: this.newName, defaultRate: this.newRate },
        previousName,
      );
      this.entries = [
        ...this.entries.filter((entry) => entry.name !== previousName),
        saved,
      ].sort((a, b) => a.name.localeCompare(b.name));
      this.cancelEdit();
      this.success = `${saved.name} ${previousName === null ? 'added' : 'updated'}.`;
    } catch (error) {
      console.error(`Failed to save ${this.kind}`, error);
      this.error = error instanceof Error
        ? error.message
        : `Failed to save ${this.title.toLowerCase()}. Please try again.`;
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }
}
