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
import { addOutline, arrowBackOutline, peopleOutline, createOutline, trashOutline, closeOutline } from 'ionicons/icons';
import { ApiService } from '../../services/api';
import { AuthDeleteService } from '../../services/auth-delete.service';
import { BottomNavComponent } from '../../components/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-students',
  templateUrl: './students.page.html',
  styleUrls: ['./students.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, BottomNavComponent,
    IonHeader, IonToolbar, IonTitle, IonContent, IonFooter,
    IonButtons, IonButton, IonIcon, IonSpinner, IonModal,
    IonRefresher, IonRefresherContent
  ]
})
export class StudentsPage implements OnInit {
  students: any[]  = [];
  filtered: any[]  = [];
  searchQuery      = '';
  sections: any[] = [];
  isLoading = false;
  isSaving = false;
  showModal = false;
  editing: any = null;
  selectedSection = '';
  colors = ['#2563eb', '#16a34a', '#7c3aed', '#ea580c', '#db2777'];
  form = { first_name: '', last_name: '', student_id: '', gender: '', section_id: '' };

  constructor(
    private api: ApiService,
    private authDelete: AuthDeleteService,
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {
    addIcons({ addOutline, arrowBackOutline, peopleOutline, createOutline, trashOutline, closeOutline });
  }

  ngOnInit() {
    this.api.getSections().subscribe({ next: (d: any) => this.sections = d });
    this.loadStudents();
  }

  handleRefresh(event: any) {
    this.loadStudents();
    setTimeout(() => event.target.complete(), 1000);
  }

  loadStudents(sectionId?: number) {
    this.isLoading = true;
    this.api.getStudents(sectionId).subscribe({
      next: (d: any) => { this.students = d.sort((a:any,b:any)=>(a.last_name||'').localeCompare(b.last_name||'')||(a.first_name||'').localeCompare(b.first_name||'')); this.filtered = this.students; this.isLoading = false; this.onSearch(); },
      error: () => { this.isLoading = false; this.toast('Could not load students', 'danger'); }
    });
  }

  onSectionChange() {
    const id = this.selectedSection ? parseInt(this.selectedSection) : undefined;
    this.loadStudents(id);
  }

  getInitials(first: string, last: string) {
    return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase();
  }

  getColor(i: number) { return this.colors[i % this.colors.length]; }

  openModal() {
    this.editing = null;
    this.form = { first_name: '', last_name: '', student_id: '', gender: '', section_id: '' };
    this.showModal = true;
  }

  openEditModal(s: any) {
    this.editing = s;
    this.form = {
      first_name: s.first_name, last_name: s.last_name,
      student_id: s.student_id, gender: s.gender || '', section_id: s.section_id || ''
    };
    this.showModal = true;
  }

  closeModal() { this.showModal = false; }

  save() {
    if (!this.form.first_name || !this.form.last_name || !this.form.student_id || !this.form.section_id) {
      this.toast('Please fill in all required fields', 'danger'); return;
    }
    this.isSaving = true;
    const req = this.editing
      ? this.api.updateStudent(this.editing.id, this.form)
      : this.api.addStudent(this.form);
    req.subscribe({
      next: () => {
        this.isSaving = false; this.closeModal(); this.loadStudents();
        this.toast(this.editing ? 'Student updated!' : 'Student added!', 'success');
      },
      error: (err: any) => { this.isSaving = false; this.toast(err.error?.error || 'Something went wrong', 'danger'); }
    });
  }

  async confirmDelete(s: any) {
    await this.authDelete.confirm(
      `${s.first_name} ${s.last_name}`,
      () => this.delete(s.id)
    );
  }
  delete(id: number) {
    this.api.deleteStudent(id).subscribe({
      next: () => { this.loadStudents(); this.toast('Student removed', 'success'); },
      error: () => this.toast('Could not remove student', 'danger')
    });
  }

  async toast(message: string, color: string) {
    const t = await this.toastCtrl.create({ message, duration: 2500, color, position: 'bottom' });
    t.present();
  }

  onSearch() {
    const q = this.searchQuery.toLowerCase().trim();
    this.filtered = q ? this.students.filter(s =>
      (s.first_name||'').toLowerCase().includes(q) ||
      (s.last_name||'').toLowerCase().includes(q) ||
      (s.student_id||'').toLowerCase().includes(q) ||
      (s.section_name||'').toLowerCase().includes(q)
    ) : this.students;
  }
  clearSearch() { this.searchQuery = ''; this.filtered = this.students; }
  goBack() { this.router.navigate(['/dashboard']); }
}