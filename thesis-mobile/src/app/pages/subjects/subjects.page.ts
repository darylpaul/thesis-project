import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon, IonSpinner,
  IonModal, IonFooter, IonRefresher, IonRefresherContent,
  AlertController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, arrowBackOutline, bookOutline, createOutline, trashOutline, closeOutline } from 'ionicons/icons';
import { ApiService } from '../../services/api';
import { AuthDeleteService } from '../../services/auth-delete.service';
import { BottomNavComponent } from '../../components/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-subjects',
  templateUrl: './subjects.page.html',
  styleUrls: ['./subjects.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, BottomNavComponent,
    IonHeader, IonToolbar, IonTitle, IonContent, IonFooter,
    IonButtons, IonButton, IonIcon, IonSpinner, IonModal,
    IonRefresher, IonRefresherContent
  ]
})
export class SubjectsPage implements OnInit {
  subjects: any[]  = [];
  filtered: any[]  = [];
  searchQuery      = '';
  isAdmin = false;
  isLoading = false;
  isSaving = false;
  showModal = false;
  editing: any = null;
  form = { name: '', code: '', grade: '', description: '' };

  constructor(
    private api: ApiService,
    private authDelete: AuthDeleteService,
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {
    addIcons({ addOutline, arrowBackOutline, bookOutline, createOutline, trashOutline, closeOutline });
  }

  ngOnInit() {
    this.isAdmin = localStorage.getItem('role') === 'admin';
    this.load();
  }

  handleRefresh(event: any) {
    this.load();
    setTimeout(() => event.target.complete(), 1000);
  }

  load() {
    this.isLoading = true;
    this.api.getSubjects().subscribe({
      next: (d: any) => { this.subjects = d.sort((a:any,b:any)=>(a.name||'').localeCompare(b.name||'')); this.filtered = this.subjects; this.isLoading = false; },
      error: () => { this.isLoading = false; this.toast('Could not load subjects', 'danger'); }
    });
  }

  openModal() {
    this.editing = null;
    this.form = { name: '', code: '', grade: '', description: '' };
    this.showModal = true;
  }

  openEditModal(s: any) {
    this.editing = s;
    this.form = { name: s.name, code: s.code || '', grade: s.grade || '', description: s.description || '' };
    this.showModal = true;
  }

  closeModal() { this.showModal = false; }

  save() {
    if (!this.form.name.trim()) { this.toast('Subject name is required', 'danger'); return; }
    this.isSaving = true;
    const req = this.editing
      ? this.api.updateSubject(this.editing.id, this.form)
      : this.api.addSubject(this.form);
    req.subscribe({
      next: () => {
        this.isSaving = false; this.closeModal(); this.load();
        this.toast(this.editing ? 'Subject updated!' : 'Subject added!', 'success');
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
    this.api.deleteSubject(id).subscribe({
      next: () => { this.load(); this.toast('Subject deleted', 'success'); },
      error: () => this.toast('Could not delete', 'danger')
    });
  }

  async toast(message: string, color: string) {
    const t = await this.toastCtrl.create({ message, duration: 2500, color, position: 'bottom' });
    t.present();
  }

  onSearch() {
    const q = this.searchQuery.toLowerCase().trim();
    this.filtered = q ? this.subjects.filter(s =>
      (s.name||'').toLowerCase().includes(q) ||
      (s.code||'').toLowerCase().includes(q)
    ) : this.subjects;
  }
  clearSearch() { this.searchQuery = ''; this.filtered = this.subjects; }
  goBack() { this.router.navigate(['/dashboard']); }
}