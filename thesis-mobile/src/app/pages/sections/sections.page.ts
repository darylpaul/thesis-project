import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonFooter,
  IonButtons, IonButton, IonIcon, IonSpinner,
  IonRefresher, IonRefresherContent, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, gridOutline } from 'ionicons/icons';
import { ApiService } from '../../services/api';
import { BottomNavComponent } from '../../components/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-sections',
  templateUrl: './sections.page.html',
  styleUrls: ['./sections.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, BottomNavComponent,
    IonHeader, IonToolbar, IonTitle, IonContent, IonFooter,
    IonButtons, IonButton, IonIcon, IonSpinner,
    IonRefresher, IonRefresherContent
  ]
})
export class SectionsPage implements OnInit {
  sections: any[] = [];
  filtered: any[] = [];
  searchQuery     = '';
  isLoading       = false;

  constructor(
    private api: ApiService,
    private router: Router,
    private toastCtrl: ToastController
  ) {
    addIcons({ arrowBackOutline, gridOutline });
  }

  ngOnInit() { this.load(); }

  handleRefresh(event: any) {
    this.load();
    setTimeout(() => event.target.complete(), 1000);
  }

  load() {
    this.isLoading = true;
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

  isAssigned(s: any): boolean { return !!s.is_assigned; }

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
