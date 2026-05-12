/// <reference lib="dom" />
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonFooter, ToastController } from '@ionic/angular/standalone';
import { BottomNavComponent } from '../../components/bottom-nav/bottom-nav.component';
import { ApiService } from '../../services/api';
import { lastValueFrom, interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonFooter, BottomNavComponent]
})
export class DashboardPage implements OnInit, OnDestroy {
  fullname = 'User';
  email    = '';
  menuOpen = false;
  private sessionSubscription?: Subscription;

  // Tutorial
  showTutorial = false;
  tutorialStep = 0;
  readonly TUTORIAL_STEPS = [
    { icon: '🎓', title: 'Welcome!', text: 'This quick tour covers all the key features of the Exam Management System. Tap Next to continue.' },
    { icon: '📸', title: 'Scan Exams', text: 'Use your camera to scan student answer sheets. The app automatically detects and grades bubble answers using OCR.' },
    { icon: '📝', title: 'Questionnaires', text: 'Create exams with multiple parts — Multiple Choice, True or False, Identification, and Essay. Upload a .json file to reuse a past exam, or import from the Test Bank.' },
    { icon: '👥', title: 'Students', text: 'Manage your student roster and assign each student to a section. Student IDs are matched to their exam records automatically.' },
    { icon: '📖', title: 'Subjects', text: 'Browse available subjects. Subjects are managed by admin and linked to your questionnaires and exam records.' },
    { icon: '📋', title: 'Sections', text: 'Organize students into class sections (e.g., Grade 7 - Einstein). Sections filter questionnaires, records, and more.' },
    { icon: '✅', title: 'Answer Keys', text: 'Answer keys are auto-generated whenever you save a questionnaire. They are read-only and used by the scanner for grading.' },
    { icon: '📈', title: 'Exam Records', text: 'View graded results filtered by section and subject. See class averages, pass rates, and individual student summaries. Export to CSV.' },
    { icon: '🗄️', title: 'Test Bank', text: 'Browse a shared library of reusable questions organized by subject and topic. Suggest questions for admin approval, or import a whole topic into any questionnaire.' },
    { icon: '🎉', title: "You're all set!", text: "You now know all the main features. Tap the ❓ button on the Dashboard anytime to replay this guide." }
  ];
  stats: any = {
    sections: '—', students: '—', subjects: '—',
    questionnaires: '—', answerkeys: '—', records: '—'
  };

  constructor(
    private router: Router,
    private api: ApiService,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    const token = localStorage.getItem('token');
    if (!token) { this.router.navigate(['/login'], { replaceUrl: true }); return; }

    this.checkSession();
    this.sessionSubscription = interval(5 * 60 * 1000).subscribe(() => this.checkSession());

    this.fullname = localStorage.getItem('fullname') || 'User';
    this.email    = localStorage.getItem('email') || '';
    this.loadStats();
    if (!localStorage.getItem('mobile_tour_seen')) {
      setTimeout(() => { this.showTutorial = true; }, 800);
    }
  }

  ngOnDestroy() {
    this.sessionSubscription?.unsubscribe();
  }

  async loadStats() {
    try {
      const [sections, students, subjects, questionnaires, answerkeys, records]: any[] =
        await Promise.all([
          lastValueFrom(this.api.getSections()),
          lastValueFrom(this.api.getStudents()),
          lastValueFrom(this.api.getSubjects()),
          lastValueFrom(this.api.getQuestionnaires()),
          lastValueFrom(this.api.getAnswerKeys()),
          lastValueFrom(this.api.getRecords()),
        ]);
      this.stats = {
        sections:       (sections      || []).length,
        students:       (students       || []).length,
        subjects:       (subjects       || []).length,
        questionnaires: (questionnaires || []).length,
        answerkeys:     (answerkeys     || []).length,
        records:        (records        || []).length,
      };
    } catch (err) { console.error(err); }
  }

  openMenu()  { this.menuOpen = true;  }
  closeMenu() { this.menuOpen = false; }
  navigate(page: string) { this.closeMenu(); this.router.navigate([`/${page}`]); }
  goTo(page: string)     { this.router.navigate([`/${page}`]); }

  logout() {
    this.closeMenu();
    localStorage.clear();
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  checkSession() {
    const token = localStorage.getItem('token');
    if (!token) { this.router.navigate(['/login'], { replaceUrl: true }); return; }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now     = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        localStorage.clear();
        this.toast('Session expired. Please log in again.', 'warning');
        this.router.navigate(['/login'], { replaceUrl: true });
      }
    } catch {}
  }

  openTutorial()  { this.tutorialStep = 0; this.showTutorial = true; }
  closeTutorial() { this.showTutorial = false; localStorage.setItem('mobile_tour_seen', '1'); }
  tutorialNext()  {
    if (this.tutorialStep < this.TUTORIAL_STEPS.length - 1) { this.tutorialStep++; }
    else { this.closeTutorial(); }
  }
  tutorialPrev()  { if (this.tutorialStep > 0) this.tutorialStep--; }

  async toast(message: string, color: string) {
    const t = await this.toastCtrl.create({
      message, color, duration: 3000, position: 'bottom'
    });
    await t.present();
  }
}