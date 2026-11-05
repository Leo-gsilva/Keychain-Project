import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TelaHomeFuncionarioComponent } from './tela-home-funcionario.component';

describe('TelaHomeFuncionarioComponent', () => {
  let component: TelaHomeFuncionarioComponent;
  let fixture: ComponentFixture<TelaHomeFuncionarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TelaHomeFuncionarioComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TelaHomeFuncionarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
