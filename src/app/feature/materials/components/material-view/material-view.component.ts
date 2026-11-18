import { DecimalPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MaterialSummary, MaterialViewType } from '../../models/material.model';

@Component({
  selector: 'app-material-view',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './material-view.component.html',
  styleUrl: './material-view.component.scss',
})
export class MaterialViewComponent {
  @Input() materialGroups: MaterialSummary[] = [];
  @Output() openDetailEvent = new EventEmitter<{
    name: string;
    type: MaterialViewType;
  }>();

  openDetail(name: string, type: MaterialViewType) {
    this.openDetailEvent.emit({ name, type });
  }
}
