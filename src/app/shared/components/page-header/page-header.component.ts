import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [NzIconModule],
  templateUrl: './page-header.component.html',
})
export class PageHeaderComponent {
  @Input() title: string = 'Materials';
  @Output() buttonClick = new EventEmitter<void>();

  onButtonClick(): void {
    this.buttonClick.emit();
  }
}
