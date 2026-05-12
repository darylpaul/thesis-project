import { Component, OnInit } from '@angular/core';
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
  arrowBackOutline, libraryOutline, addOutline,
  checkmarkOutline, trashOutline, createOutline, eyeOutline
} from 'ionicons/icons';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-test-bank',
  templateUrl: './test-bank.page.html',
  styleUrls: ['./test-bank.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButtons, IonButton, IonIcon, IonSpinner, IonModal,
    IonRefresher, IonRefresherContent
  ]
})
export class TestBankPage implements OnInit {
  questions: any[] = [];
  filtered: any[]  = [];
  subjects: any[]  = [];
  topics: any[]    = [];
  isLoading        = false;
  isSaving         = false;
  searchQuery      = '';
  selectedSubject  = '';
  selectedTopic    = '';
  selectedType     = '';
  userRole         = localStorage.getItem('role') || 'teacher';
  isAdmin          = this.userRole === 'admin';

  showSuggestModal = false;
  showViewModal    = false;
  editingId: number | null = null;
  viewQ: any = null;

  form = {
    subject_id: '', topic: '', type: 'multiple_choice' as string,
    question_text: '', choices: { A: '', B: '', C: '', D: '' },
    answer: '', status: 'approved'
  };

  constructor(
    private api: ApiService,
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {
    addIcons({ arrowBackOutline, libraryOutline, addOutline, checkmarkOutline, trashOutline, createOutline, eyeOutline });
  }

  ngOnInit() {
    this.api.getSubjects().subscribe({ next: (d: any) => this.subjects = d });
    this.load();
  }

  handleRefresh(event: any) {
    this.load();
    setTimeout(() => event.target.complete(), 1000);
  }

  load() {
    this.isLoading = true;
    const subId = this.selectedSubject ? parseInt(this.selectedSubject) : undefined;
    this.api.getTestBank(subId).subscribe({
      next: (d: any) => {
        this.questions = d;
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; this.toast('Could not load questions', 'danger'); }
    });
  }

  onSubjectChange() {
    this.selectedTopic = '';
    this.topics = [];
    if (this.selectedSubject) {
      this.api.getTestBankTopics(parseInt(this.selectedSubject)).subscribe({
        next: (d: any) => this.topics = d,
        error: () => {}
      });
    }
    this.load();
  }

  onTopicChange()  { this.applyFilters(); }
  onTypeChange()   { this.applyFilters(); }
  onFilterChange() { this.load(); }

  applyFilters() {
    const q = this.searchQuery.toLowerCase().trim();
    this.filtered = this.questions.filter(qu => {
      if (this.selectedTopic && qu.topic !== this.selectedTopic) return false;
      if (this.selectedType  && qu.type  !== this.selectedType)  return false;
      if (q) {
        const hay = `${qu.question_text} ${qu.topic} ${qu.subject_name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  onSearch()   { this.applyFilters(); }
  clearSearch(){ this.searchQuery = ''; this.applyFilters(); }

  pendingCount() { return this.questions.filter(q => q.status === 'pending').length; }

  openSuggestModal() {
    this.editingId = null;
    this.form = { subject_id: '', topic: '', type: 'multiple_choice', question_text: '', choices: { A:'', B:'', C:'', D:'' }, answer: '', status: 'approved' };
    this.showSuggestModal = true;
  }

  openEditModal(q: any) {
    this.editingId = q.id;
    let choices = { A: '', B: '', C: '', D: '' };
    try { choices = typeof q.choices === 'string' ? JSON.parse(q.choices) : (q.choices || choices); } catch {}
    this.form = {
      subject_id: String(q.subject_id), topic: q.topic, type: q.type,
      question_text: q.question_text, choices, answer: q.answer || '', status: q.status || 'approved'
    };
    this.showSuggestModal = true;
  }

  closeSuggestModal() { this.showSuggestModal = false; this.editingId = null; }

  onFormTypeChange() { this.form.answer = ''; }

  save() {
    if (!this.form.subject_id)    { this.toast('Select a subject', 'danger'); return; }
    if (!this.form.topic.trim())  { this.toast('Topic is required', 'danger'); return; }
    if (!this.form.question_text.trim()) { this.toast('Question text is required', 'danger'); return; }

    this.isSaving = true;
    const choices = this.form.type === 'multiple_choice' ? this.form.choices : null;
    const answer  = this.form.type === 'essay' ? null : (this.form.answer || null);
    const payload: any = {
      subject_id: this.form.subject_id, topic: this.form.topic.trim(),
      type: this.form.type, question_text: this.form.question_text.trim(),
      choices, answer, platform: 'mobile'
    };
    if (this.isAdmin) payload.status = this.form.status;

    const req = this.editingId
      ? this.api.updateTestBank(this.editingId, payload)
      : this.api.suggestTestBank(payload);

    req.subscribe({
      next: (d: any) => {
        this.isSaving = false;
        this.closeSuggestModal();
        this.load();
        this.toast(d.message || 'Saved!', 'success');
      },
      error: () => { this.isSaving = false; this.toast('Could not save', 'danger'); }
    });
  }

  viewQuestion(q: any) { this.viewQ = q; this.showViewModal = true; }
  closeViewModal()     { this.showViewModal = false; this.viewQ = null; }

  getParsedChoices(): { letter: string; text: string }[] {
    if (!this.viewQ) return [];
    let choices: any = {};
    try { choices = typeof this.viewQ.choices === 'string' ? JSON.parse(this.viewQ.choices) : (this.viewQ.choices || {}); } catch {}
    return ['A','B','C','D'].map(l => ({ letter: l, text: choices[l] || '' })).filter(c => c.text);
  }

  async approveQuestion(q: any) {
    const alert = await this.alertCtrl.create({
      header: 'Approve Question',
      message: 'Add this question to the bank?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Approve', handler: () => {
          this.api.approveTestBank(q.id).subscribe({
            next: () => { this.load(); this.toast('Question approved!', 'success'); },
            error: () => this.toast('Failed to approve', 'danger')
          });
        }}
      ]
    });
    await alert.present();
  }

  async confirmDelete(q: any) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Question',
      message: `Delete this question from the bank?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive', handler: () => {
          this.api.deleteTestBank(q.id).subscribe({
            next: () => { this.load(); this.toast('Deleted', 'success'); },
            error: () => this.toast('Failed to delete', 'danger')
          });
        }}
      ]
    });
    await alert.present();
  }

  typeLabel(type: string) {
    const map: any = { multiple_choice: 'Multiple Choice', true_false: 'True or False', identification: 'Identification', essay: 'Essay' };
    return map[type] || type;
  }

  typeIcon(type: string) {
    const map: any = { multiple_choice: '🅰️', true_false: '✅', identification: '🔍', essay: '✏️' };
    return map[type] || '❓';
  }

  typeClass(type: string) {
    const map: any = { multiple_choice: 'blue', true_false: 'green', identification: 'yellow', essay: 'purple' };
    return map[type] || 'blue';
  }

  async toast(message: string, color: string) {
    const t = await this.toastCtrl.create({ message, color, duration: 3000, position: 'bottom' });
    await t.present();
  }

  goBack() { this.router.navigate(['/dashboard']); }
}
