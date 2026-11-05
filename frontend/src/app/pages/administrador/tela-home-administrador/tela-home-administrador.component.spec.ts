import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TelaHomeAdministradorComponent } from './tela-home-administrador.component';

describe('TelaHomeAdministradorComponent', () => {
  let component: TelaHomeAdministradorComponent;
  let fixture: ComponentFixture<TelaHomeAdministradorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TelaHomeAdministradorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TelaHomeAdministradorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
