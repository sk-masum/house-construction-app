import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import {
  Material,
  MaterialService,
} from '../../../../core/services/material.service';
import { TransactionService } from '../../../../core/services/transaction.service';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DatePipe, DecimalPipe } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

@Component({
  selector: 'app-builder-details',
  standalone: true,
  imports: [DatePipe, DecimalPipe, NzIconModule, NzPopconfirmModule],
  templateUrl: './builder-details.component.html',
  styleUrl: './builder-details.component.scss',
})
export class BuilderDetailsComponent {
  materialService = inject(MaterialService);
  transactionService = inject(TransactionService);

  @Input() builderDetailGroups: any[] = [];
  @Input() builderName = '';

  @Output() deleteMaterialEvent = new EventEmitter<number>();
  @Output() openDrawerEvent = new EventEmitter<Material>();

  async shareBuilderLedger(builderName: string) {
    // 1. Fetch both Materials and Ledger Payments for this specific builder
    const [materials, transactions] = await Promise.all([
      this.materialService.getFilteredMaterials({
        builders: [builderName],
      }),
      this.transactionService.getFilteredTransactions({
        receivers: [builderName],
      }),
    ]);

    // 2. Calculate Totals
    const totalBilled = materials.reduce(
      (sum, m) => sum + (m.totalPrice || 0),
      0,
    );
    const totalPaid = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const dueAmount = totalBilled - totalPaid;

    // 3. Merge and Sort chronologically for the statement table
    const timeline = [
      ...materials.map((m) => ({
        date: m.deliveryDate,
        desc: `${m.name} (${m.qty})`,
        bill: m.totalPrice,
        paid: 0,
      })),
      ...transactions.map((t) => ({
        date: t.dateTime,
        desc: `Payment (${t.provider})`,
        bill: 0,
        paid: t.amount,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 4. Map to Array format for autoTable
    const tableBody = timeline.map((item) => [
      new Date(item.date).toLocaleDateString('en-IN'),
      item.desc,
      item.bill > 0 ? `Rs. ${item.bill.toLocaleString('en-IN')}` : '-',
      item.paid > 0 ? `Rs. ${item.paid.toLocaleString('en-IN')}` : '-',
    ]);

    // 5. Initialize PDF Document
    const doc = new jsPDF();

    // Header Text
    doc.setFontSize(18);
    doc.text(`Account Statement: ${builderName}`, 14, 20);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(
      `Date Generated: ${new Date().toLocaleDateString('en-IN')}`,
      14,
      28,
    );

    // Financial Summary
    doc.setTextColor(0);
    doc.text(`Total Bill: Rs. ${totalBilled.toLocaleString('en-IN')}`, 14, 38);
    doc.text(`Total Paid: Rs. ${totalPaid.toLocaleString('en-IN')}`, 14, 44);

    const dueText =
      dueAmount < 0
        ? `Advance Given: Rs. ${Math.abs(dueAmount).toLocaleString('en-IN')}`
        : `Outstanding Due: Rs. ${dueAmount.toLocaleString('en-IN')}`;
    doc.setFont('helvetica', 'bold');
    doc.text(dueText, 14, 50);

    // 6. Generate Table
    autoTable(doc, {
      startY: 56,
      head: [['Date', 'Description', 'Bill Amount', 'Paid']],
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [39, 39, 42] }, // Tailwind neutral-800 to match your app
    });

    // 7. Trigger Native iOS Share Sheet
    const pdfBlob = doc.output('blob');
    const file = new File([pdfBlob], `${builderName}_Hisab.pdf`, {
      type: 'application/pdf',
    });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `${builderName} Ledger`,
          text: `Here is the latest account statement (Hisab) for ${builderName}.`,
        });
      } catch (err) {
        console.error('User cancelled or share failed:', err);
      }
    } else {
      // Fallback for desktop browsers
      doc.save(`${builderName}_Hisab.pdf`);
    }
  }

  deleteMaterial(id: number) {
    this.deleteMaterialEvent.emit(id);
  }

  openDrawer(item: Material) {
    this.openDrawerEvent.emit(item);
  }
}
