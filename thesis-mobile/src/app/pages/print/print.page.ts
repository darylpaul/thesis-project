import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, printOutline } from 'ionicons/icons';
import { ApiService } from '../../services/api';

export interface QuestionItem {
  text: string;
  answer?: string;
  choices?: { A: string; B: string; C: string; D: string };
}

export interface ExamPart {
  type: 'multiple_choice' | 'true_false' | 'identification' | 'essay';
  direction: string;
  questions: QuestionItem[];
}

@Component({
  selector: 'app-print',
  templateUrl: './print.page.html',
  styleUrls: ['./print.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButtons, IonButton, IonIcon
  ]
})
export class PrintPage implements OnInit {
  sections: any[]       = [];
  subjects: any[]       = [];
  questionnaires: any[] = [];
  questionnaire: any    = null;
  selectedSection       = '';
  selectedSubject       = '';
  selectedQ             = '';

  constructor(
    private api: ApiService,
    private router: Router,
    private toastCtrl: ToastController
  ) {
    addIcons({ arrowBackOutline, printOutline });
  }

  ngOnInit() {
    this.api.getSections().subscribe({ next: (d: any) => this.sections = d });
    this.api.getSubjects().subscribe({ next: (d: any) => this.subjects = d });
  }

  onSectionChange() {
    this.selectedQ = '';
    this.questionnaire = null;
    this.loadQuestionnaires();
  }

  onSubjectChange() {
    this.selectedQ = '';
    this.questionnaire = null;
    this.loadQuestionnaires();
  }

  loadQuestionnaires() {
    if (!this.selectedSection || !this.selectedSubject) return;
    this.api.getQuestionnaires(
      parseInt(this.selectedSection),
      parseInt(this.selectedSubject)
    ).subscribe({ next: (d: any) => this.questionnaires = d });
  }

  loadQuestionnaire() {
    if (!this.selectedQ) { this.questionnaire = null; return; }
    this.api.getQuestionnaire(parseInt(this.selectedQ)).subscribe({
      next: (d: any) => this.questionnaire = d
    });
  }

  getParts(): ExamPart[] {
    if (!this.questionnaire?.questions) return [];
    try {
      const parsed = JSON.parse(this.questionnaire.questions);
      // New parts format
      if (Array.isArray(parsed) && parsed[0] && parsed[0].questions) {
        return parsed as ExamPart[];
      }
      // Old flat format — wrap in single part
      if (Array.isArray(parsed)) {
        return [{
          type: 'multiple_choice',
          direction: 'Choose the letter of the best answer.',
          questions: parsed.map((q: any) => ({
            text: q.text || '',
            answer: q.answer || '',
            choices: q.choices || { A: '', B: '', C: '', D: '' }
          }))
        }];
      }
      return [];
    } catch { return []; }
  }

  toRoman(num: number): string {
    const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
    const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
    let result = '';
    for (let i = 0; i < vals.length; i++) {
      while (num >= vals[i]) { result += syms[i]; num -= vals[i]; }
    }
    return result;
  }

  getPartLabel(type: string): string {
    const labels: any = {
      multiple_choice: 'Letter Shading / Multiple Choice',
      true_false:      'True or False',
      identification:  'Identification',
      essay:           'Essay'
    };
    return labels[type] || type;
  }

  getQuestionNumber(partIndex: number, questionIndex: number): number {
    let count = 0;
    const parts = this.getParts();
    for (let i = 0; i < partIndex; i++) count += parts[i].questions.length;
    return count + questionIndex + 1;
  }

  getTotalItems(): number {
    return this.getParts().reduce((t, p) => t + p.questions.length, 0);
  }

  async print() {
    const toast = await this.toastCtrl.create({
      message: 'Use your browser share/print option to save as PDF!',
      duration: 3000, color: 'primary', position: 'bottom'
    });
    toast.present();
    setTimeout(() => window.print(), 500);
  }

  goBack() { this.router.navigate(['/dashboard']); }
}