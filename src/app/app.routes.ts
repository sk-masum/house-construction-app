import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./feature/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
  },
  {
    path: 'materials',
    loadComponent: () =>
      import('./feature/materials/materials.component').then(
        (m) => m.MaterialsComponent,
      ),
  },
  {
    path: 'transactions',
    loadComponent: () =>
      import('./feature/transactions/transactions.component').then(
        (m) => m.TransactionsComponent,
      ),
  },
];
