import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { FormsModule } from '@angular/forms';
import { TextfieldComponent } from '../../../../shared/components/textfield/textfield.component';
import { DbService } from '../../../../core/services/db.service';

@Component({
  selector: 'app-material-manager',
  standalone: true,
  imports: [NzDrawerModule, FormsModule, TextfieldComponent],
  templateUrl: './material-manager.component.html',
  styleUrl: './material-manager.component.scss',
})
export class MaterialManagerComponent {
  private db = inject(DbService);

  @Input() isPriceDrawerVisible = false;
  @Input() dynamicMaterialOptions: string[] = [];
  @Input() dynamicPriceDefaults: Record<string, number> = {};
  newMaterialName = '';
  newMaterialPrice = 0;

  @Output() loadMasterData = new EventEmitter<void>();

  closePriceManager() {
    this.isPriceDrawerVisible = false;
    this.newMaterialName = '';
  }

  async saveUpdatedPrices() {
    // Save all existing modified prices
    for (const mat of this.dynamicMaterialOptions) {
      await this.db.saveMaterialDefault(mat, this.dynamicPriceDefaults[mat]);
    }

    // Save new material if typed in
    if (this.newMaterialName && this.newMaterialPrice > 0) {
      await this.db.saveMaterialDefault(
        this.newMaterialName,
        this.newMaterialPrice,
      );
    }

    this.loadMasterData.emit(); // Refresh arrays
    this.closePriceManager();
  }
}
