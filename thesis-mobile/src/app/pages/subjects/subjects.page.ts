import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon, IonSpinner,
  IonFooter, IonRefresher, IonRefresherContent,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, bookOutline } from 'ionicons/icons';
import { ApiService } from '../../services/api';
import { BottomNavComponent } from '../../components/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-subjects',
  templateUrl: './subjects.page.html',
  styleUrls: ['./subjects.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, BottomNavComponent,
    IonHeader, IonToolbar, IonTitle, IonContent, IonFooter,
    IonButtons, IonButton, IonIcon, IonSpinner,
    IonRefresher, IonRefresherContent
  ]
})
export class SubjectsPage implements OnInit {
  subjects: any[] = [];
  filtered: any[] = [];
  searchQuery = '';
  isLoading = false;

  constructor(
    private api: ApiService,
    private router: Router,
    private toastCtrl: ToastController
  ) {
    addIcons({ arrowBackOutline, bookOutline });
  }

  ngOnInit() { this.load(); }

  handleRefresh(event: any) {
    this.load();
    setTimeout(() => event.target.complete(), 1000);
  }

  load() {
    this.isLoading = true;
    this.api.getSubjects().subscribe({
      next: (d: any) => {
        this.subjects = d.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
        this.filtered = this.subjects;
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; this.toast('Could not load subjects', 'danger'); }
    });
  }

  onSearch() {
    const q = this.searchQuery.toLowerCase().trim();
    this.filtered = q ? this.subjects.filter(s =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.code || '').toLowerCase().includes(q)
    ) : this.subjects;
  }
  clearSearch() { this.searchQuery = ''; this.filtered = this.subjects; }
  goBack() { this.router.navigate(['/dashboard']); }

  async toast(message: string, color: string) {
    const t = await this.toastCtrl.create({ message, duration: 2500, color, position: 'bottom' });
    t.present();
  }
}