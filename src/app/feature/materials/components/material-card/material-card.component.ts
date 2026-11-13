import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

@Component({
  selector: 'app-material-card',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    NzButtonModule,
    NzIconModule,
    NzPopconfirmModule,
  ],
  templateUrl: './material-card.component.html',
  styleUrl: './material-card.component.scss',
})
export class MaterialCardComponent {
  @Input() item!: any;
  @Input() view!: string;
  @Output() openDrawerEvent = new EventEmitter<any>();
  @Output() deleteMaterialEvent = new EventEmitter<number>();

  openDrawer(item: any) {
    this.openDrawerEvent.emit(item);
  }

  deleteMaterial(id: number) {
    this.deleteMaterialEvent.emit(id);
  }
}
