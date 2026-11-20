import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { HeaderComponent } from './core/components/header/header.component';
import { SkBottomDock } from '@seakh/ui-angular';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NzIconModule, HeaderComponent, SkBottomDock],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  private router = inject(Router);
  activeTab = signal('dashboard');
  dockItems = [
    { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
    { id: 'materials', label: 'Materials', href: '/materials' },
    {
      id: 'transactions',
      label: 'Transactions',
      href: '/transactions',
    },
    { id: 'projects', label: 'Projects', href: '/projects' },
  ];

  onTabSelect(event: CustomEvent<{ id: string; label: string; href: string }>) {
    this.activeTab.set(event.detail.id);
    this.router.navigateByUrl(event.detail.href);
  }
}
