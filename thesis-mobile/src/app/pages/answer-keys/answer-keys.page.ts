import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon, IonSpinner,
  IonModal, IonRefresher, IonRefresherContent, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, checkmarkDoneOutline,
  closeOutline, eyeOutline
} from 'ionicons/icons';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-answer-keys',
  templateUrl: './answer-keys.page.html',
  styleUrls: ['./answer-keys.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButtons, IonButton, IonIcon, IonSpinner, IonModal,
    IonRefresher, IonRefresherContent
  ]
})
export class AnswerKeysPage implements OnInit {
  answerKeys: any[]  = [];
  filtered: any[]   = [];
  searchQuery       = '';
  sections: any[]   = [];
  subjects: any[]   = [];
  isLoading  = false;
  showViewModal = false;
  viewKey: any = null;
  selectedSection = '';
  selectedSubject = '';

  constructor(
    private api: ApiService,
    private router: Router,
    private toastCtrl: ToastController
  ) {
    addIcons({ arrowBackOutline, checkmarkDoneOutline, closeOutline, eyeOutline });
  }

  ngOnInit() {
    this.api.getSections().subscribe({ next: (d: any) => this.sections = d });
    this.api.getSubjects().subscribe({ next: (d: any) => this.subjects = d });
    this.load();
  }

  load() {
    this.isLoading = true;
    const sId  = this.selectedSection ? parseInt(this.selectedSection) : undefined;
    const subId = this.selectedSubject ? parseInt(this.selectedSubject) : undefined;
    this.api.getAnswerKeys(sId, subId).subscribe({
      next: (d: any) => { this.answerKeys = d.sort((a:any,b:any)=>(a.title||'').localeCompare(b.title||'')); this.filtered = this.answerKeys; this.isLoading = false; },
      error: () => { this.isLoading = false; this.toast('Could not load answer keys', 'danger'); }
    });
  }

  onFilterChange() { this.load(); }

  handleRefresh(event: any) {
    this.load();
    setTimeout(() => event.target.complete(), 1000);
  }

  // ── View ─────────────────────────────────────
  viewAnswerKey(a: any) { this.viewKey = a; this.showViewModal = true; }
  closeViewModal()       { this.showViewModal = false; this.viewKey = null; }

  getParsedAnswers(): any[] {
    if (!this.viewKey?.answers) return [];
    try { return JSON.parse(this.viewKey.answers); }
    catch { return []; }
  }

  getAnswerCount(a: any): number {
    try { return JSON.parse(a.answers).length; }
    catch { return 0; }
  }

  isMC(ans: string): boolean {
    return ['A','B','C','D'].includes((ans || '').toUpperCase());
  }

  isTF(ans: string): boolean {
    const up = (ans || '').toUpperCase();
    return up === 'TRUE' || up === 'FALSE';
  }

  async toast(msg: string, color: string) {
    const t = await this.toastCtrl.create({ message: msg, duration: 3000, color, position: 'bottom' });
    t.present();
  }

  onSearch() {
    const q = this.searchQuery.toLowerCase().trim();
    this.filtered = q ? this.answerKeys.filter(a =>
      (a.title||'').toLowerCase().includes(q) ||
      (a.section_name||'').toLowerCase().includes(q) ||
      (a.subject_name||'').toLowerCase().includes(q)
    ) : this.answerKeys;
  }
  clearSearch() { this.searchQuery = ''; this.filtered = this.answerKeys; }
  goBack() { this.router.navigate(['/dashboard']); }
}
