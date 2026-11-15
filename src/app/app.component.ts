import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BottomBarComponent } from './core/components/bottom-bar/bottom-bar.component';
import { HeaderComponent } from './core/components/header/header.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, BottomBarComponent, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  constructor() {}
}
