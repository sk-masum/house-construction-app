import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContractDetailsFormComponent } from './contract-details-form.component';

describe('ContractDetailsFormComponent', () => {
  let component: ContractDetailsFormComponent;
  let fixture: ComponentFixture<ContractDetailsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContractDetailsFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContractDetailsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
