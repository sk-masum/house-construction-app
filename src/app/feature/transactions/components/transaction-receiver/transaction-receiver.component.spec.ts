import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransactionReceiverComponent } from './transaction-receiver.component';

describe('TransactionReceiverComponent', () => {
  let component: TransactionReceiverComponent;
  let fixture: ComponentFixture<TransactionReceiverComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionReceiverComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransactionReceiverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
