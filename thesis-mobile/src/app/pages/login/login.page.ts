import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent]
})
export class LoginPage {
  email     = '';
  password  = '';
  showPass  = false;
  isLoading = false;
  errorMsg  = '';
  showHelp  = false;

  constructor(private api: ApiService, private router: Router) {}

  login() {
    if (this.isLoading) return;

    if (!this.email || !this.password) {
      this.errorMsg = 'Please enter your email and password.';
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(this.email)) {
      this.errorMsg = 'Please enter a valid email address.';
      return;
    }

    this.isLoading = true;
    this.errorMsg  = '';

    this.api.login(this.email, this.password).subscribe({
      next: (data: any) => {
        this.isLoading = false;

        if (!data.token) {
          this.errorMsg = 'Login failed: no token received. Contact your admin.';
          return;
        }

        if (!data.role) {
          this.errorMsg = 'Login failed: account has no role assigned. Contact your admin.';
          return;
        }

        localStorage.setItem('token',    data.token);
        localStorage.setItem('fullname', data.fullname || 'User');
        localStorage.setItem('email',    this.email);
        localStorage.setItem('role',     data.role);
        localStorage.setItem('gender',   data.gender || '');
        this.router.navigate(['/dashboard'], { replaceUrl: true });
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMsg  = err.error?.error || 'Invalid credentials.';
      }
    });
  }
}