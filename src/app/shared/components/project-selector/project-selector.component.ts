import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { Subscription } from 'rxjs';
import { DbService, Work } from '../../../core/services/db.service'; // Adjust path if needed
import { SelectComponent } from '../select/select.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-project-selector',
  standalone: true,
  imports: [
    CommonModule,
    OverlayModule,
    NzIconModule,
    SelectComponent,
    FormsModule,
  ],
  templateUrl: './project-selector.component.html',
})
export class ProjectSelectorComponent implements OnInit, OnDestroy {
  allWorks: Work[] = [];
  activeWorkId: number | null = null;
  isSelectorOpen = false;

  private subs = new Subscription();

  constructor(private db: DbService) {}

  async ngOnInit() {
    await this.fetchWorksList();

    // Listen to active ID changes
    this.subs.add(
      this.db.activeWorkId$.subscribe((id) => {
        this.activeWorkId = id;
      }),
    );

    // Listen for new project creations to refresh the dropdown
    this.subs.add(
      this.db.worksListChanged$.subscribe(async () => {
        await this.fetchWorksList();
      }),
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  async fetchWorksList() {
    this.allWorks = await this.db.getWorks();
  }

  get activeWorkName(): string {
    if (!this.activeWorkId) return 'All Site Works';
    return (
      this.allWorks.find((w) => w.id === this.activeWorkId)?.name ||
      'All Site Works'
    );
  }

  selectWork(workId: number | null) {
    this.isSelectorOpen = false;
    this.db.activeWorkId$.next(workId); // Broadcast to the rest of the app
  }
}
