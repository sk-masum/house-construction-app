import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { Subscription } from 'rxjs';
import { SelectComponent } from '../../../shared/components/select/select.component';
import { FormsModule } from '@angular/forms';
import { Project, ProjectService } from '../../services/project.service';

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
  allProjects: Project[] = [];
  activeProjectId: number | null = null;
  isSelectorOpen = false;
  private projectService = inject(ProjectService);

  private subs = new Subscription();

  async ngOnInit() {
    // Listen to active ID changes
    this.subs.add(
      this.projectService.activeProjectId$.subscribe((id) => {
        this.activeProjectId = id;
      }),
    );

    // Listen for new project creations to refresh the dropdown
    this.subs.add(
      this.projectService.projectsListChanged$.subscribe(async () => {
        await this.loadProjects();
      }),
    );

    await this.loadProjects();
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  async loadProjects() {
    this.allProjects = await this.projectService.getProjects();
  }

  get activeProjectName(): string {
    if (!this.activeProjectId) return 'All Site Works';
    return (
      this.allProjects.find((project) => project.id === this.activeProjectId)
        ?.name ||
      'All Site Works'
    );
  }

  selectProject(projectId: number | null) {
    this.isSelectorOpen = false;
    this.projectService.activeProjectId$.next(projectId); // Broadcast to the rest of the app
  }
}
