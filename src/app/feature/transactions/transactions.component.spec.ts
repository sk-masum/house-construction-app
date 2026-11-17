import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, Subject } from 'rxjs';

import { TransactionsComponent } from './transactions.component';
import { ProjectService } from '../../core/services/project.service';
import { DirectoryService } from '../../core/services/directory.service';
import {
  Transaction,
  TransactionService,
} from '../../core/services/transaction.service';

describe('TransactionsComponent', () => {
  let component: TransactionsComponent;
  let fixture: ComponentFixture<TransactionsComponent>;
  let getFilteredTransactions: jasmine.Spy;

  beforeEach(async () => {
    const transactions: Transaction[] = [
      {
        id: 1,
        projectId: 7,
        amount: 1250,
        dateTime: '2026-01-02T00:00:00.000Z',
        provider: 'Owner',
        receiver: 'SS',
      },
    ];
    getFilteredTransactions = jasmine
      .createSpy()
      .and.returnValue(Promise.resolve(transactions));

    await TestBed.configureTestingModule({
      imports: [TransactionsComponent],
      providers: [
        {
          provide: ProjectService,
          useValue: { activeProjectId$: new BehaviorSubject<number | null>(7) },
        },
        {
          provide: TransactionService,
          useValue: { getFilteredTransactions },
        },
        {
          provide: DirectoryService,
          useValue: {
            entriesChanged$: new Subject(),
            getEntries: jasmine.createSpy().and.resolveTo([]),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads project transactions and builds receiver summaries', () => {
    expect(getFilteredTransactions).toHaveBeenCalledWith({
      sortOrder: 'desc',
    });
    expect(component.receiverGroups).toEqual([
      { name: 'SS', count: 1, totalAmount: 1250 },
    ]);
  });
});
