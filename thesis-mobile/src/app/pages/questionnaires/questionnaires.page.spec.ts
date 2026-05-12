import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuestionnairesPage } from './questionnaires.page';

describe('QuestionnairesPage', () => {
  let component: QuestionnairesPage;
  let fixture: ComponentFixture<QuestionnairesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(QuestionnairesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
