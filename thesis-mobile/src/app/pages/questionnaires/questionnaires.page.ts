import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon, IonSpinner,
  IonModal, IonRefresher, IonRefresherContent,
  AlertController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline, arrowBackOutline, documentTextOutline, createOutline,
  trashOutline, downloadOutline, cloudUploadOutline, informationCircleOutline,
  libraryOutline, checkmarkCircleOutline, copyOutline
} from 'ionicons/icons';
import { ApiService } from '../../services/api';
import { AuthDeleteService } from '../../services/auth-delete.service';

export interface QuestionItem {
  text: string;
  answer: string;
  choices: { A: string; B: string; C: string; D: string };
}

export interface ExamPart {
  type: 'multiple_choice' | 'true_false' | 'identification' | 'essay';
  direction: string;
  questions: QuestionItem[];
}

@Component({
  selector: 'app-questionnaires',
  templateUrl: './questionnaires.page.html',
  styleUrls: ['./questionnaires.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButtons, IonButton, IonIcon, IonSpinner, IonModal,
    IonRefresher, IonRefresherContent
  ]
})
export class QuestionnairesPage implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef;

  questionnaires: any[]  = [];
  filtered: any[]        = [];
  searchQuery            = '';
  sections: any[]       = [];
  subjects: any[]       = [];
  isLoading             = false;
  isSaving              = false;
  showModal             = false;
  showViewModal         = false;
  viewQ: any            = null;
  selectedSection       = '';
  selectedSubject       = '';
  editingId: number | null = null;
  currentUserId: number | null = null;

  form: {
    title: string; type: string; section_id: string; subject_id: string; parts: ExamPart[];
  } = { title: '', type: 'Exam', section_id: '', subject_id: '', parts: [] };

  readonly DEFAULT_DIRECTIONS: any = {
    multiple_choice: 'Choose the letter of the best answer.',
    true_false:      'Write TRUE if the statement is correct and FALSE if it is not.',
    identification:  'Identify what is being described. Write your answer on the blank provided.',
    essay:           'Answer the following questions in complete sentences.'
  };

  constructor(
    private api: ApiService,
    private authDelete: AuthDeleteService,
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {
    addIcons({
      addOutline, arrowBackOutline, documentTextOutline, createOutline,
      trashOutline, downloadOutline, cloudUploadOutline, informationCircleOutline,
      libraryOutline, checkmarkCircleOutline, copyOutline
    });
  }

  ngOnInit() {
    try {
      const token = localStorage.getItem('token') || '';
      const payload = JSON.parse(atob(token.split('.')[1]));
      this.currentUserId = payload.id || null;
    } catch {}
    this.api.getSections().subscribe({ next: (d: any) => this.sections = d });
    this.api.getSubjects().subscribe({ next: (d: any) => this.subjects = d });
    this.load();
  }

  handleRefresh(event: any) {
    this.load();
    setTimeout(() => event.target.complete(), 1000);
  }

  load() {
    this.isLoading = true;
    const sId  = this.selectedSection ? parseInt(this.selectedSection) : undefined;
    const subId = this.selectedSubject ? parseInt(this.selectedSubject) : undefined;
    this.api.getQuestionnaires(sId, subId).subscribe({
      next: (d: any) => { this.questionnaires = d; this.filtered = d; this.isLoading = false; },
      error: () => { this.isLoading = false; this.toast('Could not load questionnaires', 'danger'); }
    });
  }

  onFilterChange() { this.load(); }

  // ── Open Create Modal ─────────────────────────────────
  openModal(prefillParts: ExamPart[] | null = null) {
    this.editingId = null;
    this.form = {
      title: '', type: 'Exam', section_id: '', subject_id: '',
      parts: prefillParts ? prefillParts : [this.newPart()]
    };
    this.showModal = true;
    if (prefillParts) {
      setTimeout(() => this.toast('Questions loaded! Set title, section & subject then save.', 'success'), 500);
    }
  }

  // ── Open Edit Modal ───────────────────────────────────
  openEditModal(q: any) {
    this.editingId = q.id;
    let loadedParts: ExamPart[] = [this.newPart()];

    try {
      const parsed = JSON.parse(q.questions);
      if (Array.isArray(parsed) && parsed[0] && parsed[0].questions) {
        loadedParts = parsed;
      } else if (Array.isArray(parsed)) {
        // Old flat format
        loadedParts = [{
          type: 'multiple_choice',
          direction: this.DEFAULT_DIRECTIONS['multiple_choice'],
          questions: parsed.map((qt: any) => ({
            text: qt.text || '',
            answer: qt.answer || '',
            choices: qt.choices || { A: '', B: '', C: '', D: '' }
          }))
        }];
      }
    } catch { loadedParts = [this.newPart()]; }

    this.form = {
      title: q.title,
      type: q.type || 'Exam',
      section_id: String(q.section_id),
      subject_id: String(q.subject_id),
      parts: loadedParts
    };
    this.showModal = true;
  }

  closeModal() { this.showModal = false; this.editingId = null; }

  // ── Parts builder ─────────────────────────────────────
  newPart(): ExamPart {
    return { type: 'multiple_choice', direction: this.DEFAULT_DIRECTIONS['multiple_choice'], questions: [this.newQuestion()] };
  }

  newQuestion(): QuestionItem {
    return { text: '', answer: '', choices: { A: '', B: '', C: '', D: '' } };
  }

  addPart()   { this.form.parts.push(this.newPart()); }
  removePart(i: number) { this.form.parts.splice(i, 1); }
  addQuestion(part: ExamPart) { part.questions.push(this.newQuestion()); }
  removeQuestion(part: ExamPart, i: number) {
    if (part.questions.length > 1) part.questions.splice(i, 1);
    else this.toast('Each part needs at least 1 question', 'warning');
  }

  onPartTypeChange(part: ExamPart) {
    part.direction = this.DEFAULT_DIRECTIONS[part.type] || '';
    part.questions.forEach(q => q.answer = '');
  }

  // ── Save (Create or Update) ───────────────────────────
  async save() {
    if (!this.form.title.trim())   { this.toast('Title is required', 'danger'); return; }
    if (!this.form.section_id)     { this.toast('Please select a section', 'danger'); return; }
    if (!this.form.subject_id)     { this.toast('Please select a subject', 'danger'); return; }
    const hasEmptyQ = this.form.parts.some(p => p.questions.some(q => !q.text.trim()));
    if (hasEmptyQ) { this.toast('Please fill in all question texts', 'danger'); return; }

    const hasMissingAnswer = this.form.parts
      .filter(p => p.type !== 'essay')
      .some(p => p.questions.some(q => !q.answer));

    if (hasMissingAnswer) {
      const alert = await this.alertCtrl.create({
        header: 'Missing Answers',
        message: 'Some questions have no answer set. Save anyway?',
        buttons: [
          { text: 'Go back', role: 'cancel' },
          { text: 'Save anyway', handler: () => this.doSave() }
        ]
      });
      await alert.present();
      return;
    }
    this.doSave();
  }

  doSave() {
    this.isSaving = true;
    const payload = {
      title: this.form.title, type: this.form.type,
      section_id: this.form.section_id, subject_id: this.form.subject_id,
      questions: JSON.stringify(this.form.parts),
      platform: 'app'
    };

    const req = this.editingId
      ? this.api.updateQuestionnaire(this.editingId, payload)
      : this.api.addQuestionnaire(payload);

    req.subscribe({
      next: async (saved: any) => {
        const questionnaireId = this.editingId || saved?.id;
        if (questionnaireId) await this.autoSyncAnswerKey(questionnaireId);
        this.isSaving = false;
        this.closeModal();
        this.load();
        this.toast(this.editingId ? 'Questionnaire updated! Answer key synced ✅' : 'Questionnaire saved! Answer key auto-generated ✅', 'success');
      },
      error: () => { this.isSaving = false; this.toast('Something went wrong', 'danger'); }
    });
  }

  async autoSyncAnswerKey(questionnaireId: number) {
    const answers: any[] = [];
    this.form.parts.forEach(part => {
      if (part.type !== 'essay') {
        part.questions.forEach(q => answers.push({ question: answers.length + 1, answer: q.answer || '?' }));
      }
    });
    if (!answers.length) return;
    try {
      await this.api.syncAnswerKey(questionnaireId, {
        title: this.form.title, type: this.form.type,
        section_id: this.form.section_id, subject_id: this.form.subject_id,
        answers: JSON.stringify(answers),
        platform: 'app'
      }).toPromise();
    } catch (err) { console.error('Could not sync answer key:', err); }
  }

  // ── Upload ────────────────────────────────────────────
  triggerUpload() { this.fileInput.nativeElement.click(); }
  triggerUploadInModal() { this.fileInput.nativeElement.click(); }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) { this.toast('Please upload a .json file only', 'danger'); return; }
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = JSON.parse(e.target.result);
        let loadedParts: ExamPart[] | null = null;
        if (data.parts && Array.isArray(data.parts)) loadedParts = data.parts;
        else if (Array.isArray(data) && data[0] && data[0].questions) loadedParts = data;
        else { this.toast('Invalid file format.', 'danger'); return; }
        this.showModal = false;
        setTimeout(() => {
          this.openModal(loadedParts);
          if (data.title) setTimeout(() => this.form.title = data.title + ' (Copy)', 100);
        }, 300);
      } catch { this.toast('Could not read file.', 'danger'); }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  // ── Export ────────────────────────────────────────────
  exportQuestionnaire(q: any) {
    if (!q) return;
    let parsed: any[] = [];
    try { parsed = JSON.parse(q.questions); } catch {}
    const data = { title: q.title, type: q.type, parts: parsed };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${q.title.replace(/\s+/g, '_')}.json`; a.click();
    URL.revokeObjectURL(url);
    this.toast('Exported! Share to reuse.', 'success');
  }

  // ── View ─────────────────────────────────────────────
  viewQuestionnaire(q: any) { this.viewQ = q; this.showViewModal = true; }
  closeViewModal()           { this.showViewModal = false; this.viewQ = null; }

  getParsedParts(): ExamPart[] {
    if (!this.viewQ) return [];
    try {
      const parsed = JSON.parse(this.viewQ.questions);
      if (Array.isArray(parsed) && parsed[0] && parsed[0].questions) return parsed as ExamPart[];
      if (Array.isArray(parsed)) return [{ type: 'multiple_choice', direction: '', questions: parsed.map((qt: any) => ({ text: qt.text || '', answer: qt.answer || '', choices: qt.choices || { A:'', B:'', C:'', D:'' } })) }];
      return [];
    } catch { return []; }
  }

  getPartLabel(type: string): string {
    const labels: any = {
      multiple_choice: '📝 Letter Shading / Multiple Choice',
      true_false: '✅ True or False',
      identification: '🔍 Identification',
      essay: '✏️ Essay'
    };
    return labels[type] || type;
  }

  getQuestionCount(q: any): number {
    try {
      const parts: ExamPart[] = JSON.parse(q.questions);
      if (parts[0] && parts[0].questions) return parts.reduce((t, p) => t + p.questions.length, 0);
      return parts.length;
    } catch { return 0; }
  }

  // ── Delete ────────────────────────────────────────────
  async confirmDelete(q: any) {
    await this.authDelete.confirm(
      q.title,
      () => this.delete(q.id)
    );
  }
  delete(id: number) {
    this.api.deleteQuestionnaire(id).subscribe({
      next: () => { this.load(); this.toast('Questionnaire moved to archive', 'success'); },
      error: () => this.toast('Could not delete', 'danger')
    });
  }

  // ── Duplicate ─────────────────────────────────────────
  async duplicateQuestionnaire(q: any) {
    const alert = await this.alertCtrl.create({
      header: 'Duplicate',
      message: `Create a copy of "${q.title}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Duplicate', handler: () => {
          this.api.duplicateQuestionnaire(q.id).subscribe({
            next: () => { this.load(); this.toast(`"${q.title} (Copy)" created!`, 'success'); },
            error: () => this.toast('Could not duplicate', 'danger')
          });
        }}
      ]
    });
    await alert.present();
  }

  // ── Save Question to Test Bank ────────────────────────
  showSaveToBank     = false;
  saveToBankTopic    = '';
  saveToBankQuestion: { q: QuestionItem; part: ExamPart } | null = null;
  isSavingToBank     = false;

  openSaveToBankModal(part: ExamPart, q: QuestionItem) {
    if (!this.form.subject_id) { this.toast('Please select a subject first', 'warning'); return; }
    if (!q.text.trim())        { this.toast('Question text is empty', 'warning'); return; }
    this.saveToBankQuestion = { q, part };
    this.saveToBankTopic    = '';
    this.showSaveToBank     = true;
  }

  closeSaveToBankModal() { this.showSaveToBank = false; this.saveToBankQuestion = null; }

  doSaveToBank() {
    if (!this.saveToBankTopic.trim()) { this.toast('Topic is required', 'warning'); return; }
    const { q, part } = this.saveToBankQuestion!;
    const payload: any = {
      subject_id:    this.form.subject_id,
      topic:         this.saveToBankTopic.trim(),
      type:          part.type,
      question_text: q.text,
      answer:        q.answer || null,
      choices:       part.type === 'multiple_choice' ? q.choices : null
    };
    this.isSavingToBank = true;
    this.api.suggestTestBank(payload).subscribe({
      next: (res: any) => {
        this.isSavingToBank = false;
        this.closeSaveToBankModal();
        this.toast(res.message || 'Question saved to Test Bank!', 'success');
      },
      error: () => { this.isSavingToBank = false; this.toast('Failed to save to bank', 'danger'); }
    });
  }

  // ── Import from Test Bank ─────────────────────────────
  showImportModal    = false;
  importSubjectId    = '';
  importTopics: any[]     = [];
  importPreview: any[]    = [];
  importSelectedTopic = '';
  importSelectedType  = '';
  isLoadingTopics    = false;
  isLoadingPreview   = false;

  openImportModal() { this.showImportModal = true; this.importSubjectId = ''; this.importTopics = []; this.importPreview = []; this.importSelectedTopic = ''; }
  closeImportModal() { this.showImportModal = false; }

  onImportSubjectChange() {
    this.importTopics = []; this.importPreview = []; this.importSelectedTopic = '';
    if (!this.importSubjectId) return;
    this.isLoadingTopics = true;
    this.api.getTestBankTopics(parseInt(this.importSubjectId)).subscribe({
      next: (d: any) => { this.importTopics = d; this.isLoadingTopics = false; },
      error: () => { this.isLoadingTopics = false; }
    });
  }

  onImportTopicChange() {
    this.importPreview = [];
    if (!this.importSubjectId || !this.importSelectedTopic) return;
    this.isLoadingPreview = true;
    this.api.getTestBank(parseInt(this.importSubjectId), this.importSelectedTopic).subscribe({
      next: (d: any) => {
        this.importPreview = d.filter((q: any) => q.status === 'approved');
        this.isLoadingPreview = false;
      },
      error: () => { this.isLoadingPreview = false; }
    });
  }

  doImport() {
    if (!this.importPreview.length) { this.toast('No questions to import', 'warning'); return; }

    // Group imported questions by type
    const byType = new Map<string, any[]>();
    for (const q of this.importPreview) {
      if (!byType.has(q.type)) byType.set(q.type, []);
      byType.get(q.type)!.push(q);
    }

    // For each type, find existing matching part or create new one
    byType.forEach((qs, type) => {
      const existing = this.form.parts.find(p => p.type === type);
      const newQuestions = qs.map((q: any) => {
        let choices = { A: '', B: '', C: '', D: '' };
        try { choices = typeof q.choices === 'string' ? JSON.parse(q.choices) : (q.choices || choices); } catch {}
        return { text: q.question_text, answer: q.answer || '', choices };
      });

      if (existing) {
        // Remove default empty placeholder if it's the only question and text is blank
        if (existing.questions.length === 1 && !existing.questions[0].text.trim()) {
          existing.questions = newQuestions;
        } else {
          existing.questions.push(...newQuestions);
        }
      } else {
        const typeKey = type as 'multiple_choice' | 'true_false' | 'identification' | 'essay';
        this.form.parts.push({
          type: typeKey,
          direction: this.DEFAULT_DIRECTIONS[typeKey] || '',
          questions: newQuestions
        });
      }
    });

    const count = this.importPreview.length;
    this.closeImportModal();
    this.toast(`${count} question${count !== 1 ? 's' : ''} imported from bank!`, 'success');
  }

  async toast(message: string, color: string) {
    const t = await this.toastCtrl.create({ message, duration: 3000, color, position: 'bottom' });
    t.present();
  }

  onSearch() {
    const q = this.searchQuery.toLowerCase().trim();
    this.filtered = q ? this.questionnaires.filter(q2 =>
      (q2.title||'').toLowerCase().includes(q) ||
      (q2.type||'').toLowerCase().includes(q) ||
      (q2.section_name||'').toLowerCase().includes(q)
    ) : this.questionnaires;
  }
  clearSearch() { this.searchQuery = ''; this.filtered = this.questionnaires; }
  goBack() { this.router.navigate(['/dashboard']); }
}