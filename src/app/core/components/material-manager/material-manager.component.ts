import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { FormsModule } from '@angular/forms';
import { TextfieldComponent } from '../../../shared/components/textfield/textfield.component';
import { MaterialService } from '../../services/material.service';

@Component({
  selector: 'app-material-manager',
  standalone: true,
  imports: [NzDrawerModule, FormsModule, TextfieldComponent],
  templateUrl: './material-manager.component.html',
  styleUrl: './material-manager.component.scss',
})
export class MaterialManagerComponent {
  private materialService = inject(MaterialService);

  @Input() isPriceDrawerVisible = false;
  @Input() dynamicMaterialOptions: string[] = [];
  @Input() dynamicPriceDefaults: Record<string, number> = {};
  newMaterialName = '';
  newMaterialPrice = 0;

  @Output() loadMasterData = new EventEmitter<void>();
  @Output() isPriceDrawerVisibleChange = new EventEmitter<boolean>();

  closePriceManager() {
    this.isPriceDrawerVisible = false;
    this.isPriceDrawerVisibleChange.emit(false);
    this.newMaterialName = '';
  }

  async saveUpdatedPrices() {
    // Save all existing modified prices
    for (const mat of this.dynamicMaterialOptions) {
      await this.materialService.saveMaterialDefault(
        mat,
        this.dynamicPriceDefaults[mat],
      );
    }

    // Save new material if typed in
    if (this.newMaterialName && this.newMaterialPrice > 0) {
      await this.materialService.saveMaterialDefault(
        this.newMaterialName,
        this.newMaterialPrice,
      );
    }

    this.loadMasterData.emit(); // Refresh arrays
    this.closePriceManager();
  }
}
