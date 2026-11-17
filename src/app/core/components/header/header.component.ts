import { Component } from '@angular/core';
import { ProjectSelectorComponent } from '../project-selector/project-selector.component';
import { MenuComponent } from '../menu/menu.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [ProjectSelectorComponent, MenuComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {}
