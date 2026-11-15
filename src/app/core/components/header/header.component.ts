import { Component } from '@angular/core';
import { ProjectSelectorComponent } from '../project-selector/project-selector.component';
import { ImportExportDropdownComponent } from '../import-export-dropdown/import-export-dropdown.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [ProjectSelectorComponent, ImportExportDropdownComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {}
