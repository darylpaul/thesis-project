import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnswerKeysPage } from './answer-keys.page';

describe('AnswerKeysPage', () => {
  let component: AnswerKeysPage;
  let fixture: ComponentFixture<AnswerKeysPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AnswerKeysPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
