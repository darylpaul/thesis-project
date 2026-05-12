import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage) },
  { path: 'signup', redirectTo: 'login', pathMatch: 'full' }, // Disabled - admin creates accounts
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.page').then(m => m.DashboardPage) },
  { path: 'sections', loadComponent: () => import('./pages/sections/sections.page').then(m => m.SectionsPage) },
  { path: 'students', loadComponent: () => import('./pages/students/students.page').then(m => m.StudentsPage) },
  { path: 'subjects', loadComponent: () => import('./pages/subjects/subjects.page').then(m => m.SubjectsPage) },
  { path: 'questionnaires', loadComponent: () => import('./pages/questionnaires/questionnaires.page').then(m => m.QuestionnairesPage) },
  { path: 'answer-keys', loadComponent: () => import('./pages/answer-keys/answer-keys.page').then(m => m.AnswerKeysPage) },
  { path: 'records', loadComponent: () => import('./pages/records/records.page').then(m => m.RecordsPage) },
  { path: 'print', loadComponent: () => import('./pages/print/print.page').then(m => m.PrintPage) },
  { path: 'scan', loadComponent: () => import('./pages/scan/scan.page').then(m => m.ScanPage) },
  { path: 'test-bank', loadComponent: () => import('./pages/test-bank/test-bank.page').then(m => m.TestBankPage) }
];