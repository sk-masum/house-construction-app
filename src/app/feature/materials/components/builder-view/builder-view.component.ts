import { DecimalPipe, NgClass } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { BuilderSummary, MaterialViewType } from '../../models/material.model';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-builder-view',
  standalone: true,
  imports: [DecimalPipe, NgClass, NzIconModule],
  templateUrl: './builder-view.component.html',
  styleUrl: './builder-view.component.scss',
})
export class BuilderViewComponent {
  @Input() builderGroups: BuilderSummary[] = [];
  @Output() openDetailEvent = new EventEmitter<{
    name: string;
    type: MaterialViewType;
  }>();
  openDetail(name: string, type: MaterialViewType) {
    this.openDetailEvent.emit({ name, type });
  }
}
