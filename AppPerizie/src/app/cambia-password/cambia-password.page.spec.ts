import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CambiaPasswordPage } from './cambia-password.page';

describe('CambiaPasswordPage', () => {
  let component: CambiaPasswordPage;
  let fixture: ComponentFixture<CambiaPasswordPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CambiaPasswordPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
