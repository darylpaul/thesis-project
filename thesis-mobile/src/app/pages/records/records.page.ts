/// <reference lib="dom" />
declare const Blob: any;
declare const URL: { createObjectURL(obj: any): string; revokeObjectURL(url: string): void };
import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon, IonSpinner,
  IonRefresher, IonRefresherContent,
  AlertController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, barChartOutline, downloadOutline } from 'ionicons/icons';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-records',
  templateUrl: './records.page.html',
  styleUrls: ['./records.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon, IonSpinner, IonRefresher, IonRefresherContent]
})
export class RecordsPage implements OnInit {
  records: any[]  = [];
  filtered: any[]  = [];
  searchQuery      = '';
  sections: any[] = [];
  subjects: any[] = [];
  isLoading = false;
  selectedSection = '';
  selectedSubject = '';
  viewMode: 'list' | 'summary' = 'list';
  colors = ['#2563eb','#16a34a','#7c3aed','#ea580c','#db2777'];

  constructor(
    private api: ApiService,
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    @Inject(DOCUMENT) private doc: any
  ) {
    addIcons({ arrowBackOutline, barChartOutline, downloadOutline });
  }

  ngOnInit() {
    this.api.getSections().subscribe({ next: (d: any) => this.sections = d });
    this.api.getSubjects().subscribe({ next: (d: any) => this.subjects = d });
  }

  handleRefresh(event: any) {
    this.onFilterChange();
    setTimeout(() => event.target.complete(), 1000);
  }

  onFilterChange() {
    if (!this.selectedSection || !this.selectedSubject) return;
    this.isLoading = true;
    this.api.getRecords(parseInt(this.selectedSection), parseInt(this.selectedSubject)).subscribe({
      next: (d: any) => {
        this.records  = d.sort((a: any, b: any) => (a.student_name||'').localeCompare(b.student_name||''));
        this.filtered = this.records;
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  getInitials(name: string) {
    const parts = (name || '').split(' ');
    return ((parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '')).toUpperCase();
  }

  getColor(i: number) { return this.colors[i % this.colors.length]; }

  getGrade(pct: number) {
    if (pct >= 90) return 'A';
    if (pct >= 80) return 'B';
    if (pct >= 70) return 'C';
    if (pct >= 60) return 'D';
    return 'F';
  }

  getGradeClass(pct: number) {
    if (pct >= 80) return 'high';
    if (pct >= 60) return 'mid';
    return 'low';
  }

  getAvg() {
    if (!this.records.length) return 0;
    return Math.round(this.records.reduce((a, r) => a + r.percentage, 0) / this.records.length);
  }

  getHighest() {
    if (!this.records.length) return 0;
    return Math.max(...this.records.map(r => r.percentage));
  }

  getPassRate() {
    if (!this.records.length) return 0;
    return Math.round((this.records.filter(r => r.percentage >= 60).length / this.records.length) * 100);
  }

  onSearch() {
    const q = this.searchQuery.toLowerCase().trim();
    this.filtered = q ? this.records.filter(r =>
      (r.student_name||'').toLowerCase().includes(q) ||
      (r.student_id||'').toString().toLowerCase().includes(q) ||
      (r.section_name||'').toLowerCase().includes(q)
    ) : this.records;
  }

  clearSearch() { this.searchQuery = ''; this.filtered = this.records; }

  exportCSV() {
    if (!this.records.length) { this.toast('No records to export', 'warning'); return; }
    const sectionName = this.sections.find((s: any) => s.id == this.selectedSection)?.name || 'Section';
    const subjectName = this.subjects.find((s: any) => s.id == this.selectedSubject)?.name || 'Subject';

    const sorted = [...this.records].sort((a: any, b: any) =>
      (a.student_name || '').localeCompare(b.student_name || '')
    );

    const headers = ['#','Student Name','Student ID','Section','Subject','Exam','Score','Total','Percentage','Grade','Date'];
    const rows = sorted.map((r: any, i: number) => {
      const pct   = parseFloat(r.percentage) || 0;
      const grade = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F';
      return [
        i + 1,
        `"${r.student_name || ''}"`,
        r.student_id || '',
        `"${r.section_name || ''}"`,
        `"${r.subject_name || ''}"`,
        `"${r.exam_title || ''}"`,
        r.score, r.total,
        pct.toFixed(2) + '%',
        grade,
        `"${new Date(r.created_at).toLocaleDateString()}"`
      ].join(',');
    });

    const csv  = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = this.doc.createElement('a');
    a.href     = url;
    a.download = `records_${sectionName}_${subjectName}.csv`.replace(/\s+/g, '_');
    a.click();
    URL.revokeObjectURL(url);
    this.toast('CSV exported!', 'success');
  }

  async confirmDelete(record: any) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Record',
      message: `Delete the record for <strong>${record.student_name}</strong>?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.api.deleteRecord(record.id).subscribe({
              next: () => {
                this.records = this.records.filter(r => r.id !== record.id);
                this.onSearch();
                this.toast('Record deleted', 'success');
              },
              error: () => this.toast('Failed to delete record', 'danger')
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async toast(message: string, color: string) {
    const t = await this.toastCtrl.create({ message, color, duration: 3000, position: 'bottom' });
    await t.present();
  }

  getStudentSummaries() {
    const map = new Map<string, any>();
    for (const r of this.records) {
      const key = r.student_id || r.student_name;
      if (!map.has(key)) map.set(key, { student_name: r.student_name, student_id: r.student_id, exams: [] });
      map.get(key).exams.push(r);
    }
    return Array.from(map.values()).map(s => {
      const avg  = Math.round(s.exams.reduce((a: number, r: any) => a + r.percentage, 0) / s.exams.length);
      const best = Math.max(...s.exams.map((r: any) => r.percentage));
      return { ...s, avg, best, count: s.exams.length };
    }).sort((a: any, b: any) => (a.student_name || '').localeCompare(b.student_name || ''));
  }

  goBack() { this.router.navigate(['/dashboard']); }
}
