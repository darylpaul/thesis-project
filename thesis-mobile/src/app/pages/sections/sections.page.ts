import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonFooter,
  IonButtons, IonButton, IonIcon, IonSpinner,
  IonModal, IonRefresher, IonRefresherContent,
  AlertController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, arrowBackOutline, gridOutline, createOutline, trashOutline, closeOutline } from 'ionicons/icons';
import { ApiService } from '../../services/api';
import { AuthDeleteService } from '../../services/auth-delete.service';
import { BottomNavComponent } from '../../components/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-sections',
  templateUrl: './sections.page.html',
  styleUrls: ['./sections.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, BottomNavComponent,
    IonHeader, IonToolbar, IonTitle, IonContent, IonFooter,
    IonButtons, IonButton, IonIcon, IonSpinner, IonModal,
    IonRefresher, IonRefresherContent
  ]
})
export class SectionsPage implements OnInit {
  sections: any[] = [];
  filtered: any[] = [];
  searchQuery     = '';
  isLoading       = false;
  isSaving        = false;
  showModal       = false;
  editing: any    = null;
  form = { name: '', grade: '', adviser: '' };

  constructor(
    private api: ApiService,
    private authDelete: AuthDeleteService,
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {
    addIcons({ addOutline, arrowBackOutline, gridOutline, createOutline, trashOutline, closeOutline });
  }

  ngOnInit() { this.load(); }

  handleRefresh(event: any) {
    this.load();
    setTimeout(() => event.target.complete(), 1000);
  }

  load() {
    this.isLoading = true;
    // Load sections and students together to show student count
    Promise.all([
      this.api.getSections().toPromise(),
      this.api.getStudents().toPromise()
    ]).then(([secData, stuData]: any) => {
      const countMap: any = {};
      (stuData || []).forEach((s: any) => {
        countMap[s.section_id] = (countMap[s.section_id] || 0) + 1;
      });
      this.sections = (secData || [])
        .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''))
        .map((s: any) => ({ ...s, studentCount: countMap[s.id] || 0 }));
      this.filtered = this.sections;
      this.isLoading = false;
    }).catch(() => { this.isLoading = false; this.toast('Could not load sections', 'danger'); });
  }

  getAdviserName(): string {
    const rawName   = localStorage.getItem('fullname') || '';
    const gender    = localStorage.getItem('gender') || '';
    const cleanName = rawName.replace(/^(Mr\.|Ms\.|Mrs\.)\s*/i, '').trim();
    const parts     = cleanName.split(' ');
    const lastName  = parts[parts.length - 1] || '';
    let title = '';
    if (gender === 'female' || /^Ms\./i.test(rawName) || /^Mrs\./i.test(rawName)) title = 'Ms. ';
    else if (gender === 'male' || /^Mr\./i.test(rawName)) title = 'Mr. ';
    return title + lastName;
  }

  openModal() {
    this.editing = null;
    this.form = { name: '', grade: '', adviser: this.getAdviserName() };
    this.showModal = true;
  }

  openEditModal(s: any) {
    this.editing = s;
    this.form = { name: s.name, grade: s.grade || '', adviser: s.adviser || this.getAdviserName() };
    this.showModal = true;
  }

  closeModal() { this.showModal = false; }

  save() {
    if (!this.form.name.trim()) { this.toast('Section name is required', 'danger'); return; }
    this.isSaving = true;
    const req = this.editing
      ? this.api.updateSection(this.editing.id, this.form)
      : this.api.addSection(this.form);
    req.subscribe({
      next: () => {
        this.isSaving = false; this.closeModal(); this.load();
        this.toast(this.editing ? 'Section updated!' : 'Section added!', 'success');
      },
      error: () => { this.isSaving = false; this.toast('Something went wrong', 'danger'); }
    });
  }

  async confirmDelete(s: any) {
    await this.authDelete.confirm(
      s.name,
      () => this.delete(s.id)
    );
  }
  delete(id: number) {
    this.api.deleteSection(id).subscribe({
      next: () => { this.load(); this.toast('Section deleted', 'success'); },
      error: () => this.toast('Could not delete', 'danger')
    });
  }

  onSearch() {
    const q = this.searchQuery.toLowerCase().trim();
    this.filtered = q ? this.sections.filter(s =>
      (s.name    || '').toLowerCase().includes(q) ||
      (s.grade   || '').toLowerCase().includes(q) ||
      (s.adviser || '').toLowerCase().includes(q)
    ) : this.sections;
  }

  clearSearch() { this.searchQuery = ''; this.filtered = this.sections; }

  async toast(message: string, color: string) {
    const t = await this.toastCtrl.create({ message, duration: 2500, color, position: 'bottom' });
    t.present();
  }

  goBack() { this.router.navigate(['/dashboard']); }
}