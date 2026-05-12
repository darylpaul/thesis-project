import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent]
})
export class SignupPage {
  fullname = '';
  email = '';
  password = '';
  showPass = false;
  isLoading = false;
  errorMsg = '';

  constructor(private api: ApiService, private router: Router) {}

  signup() {
    if (!this.fullname || !this.email || !this.password) {
      this.errorMsg = 'Please fill in all fields.';
      return;
    }
    if (this.password.length < 6) {
      this.errorMsg = 'Password must be at least 6 characters.';
      return;
    }
    this.isLoading = true;
    this.errorMsg = '';

    this.api.signup(this.fullname, this.email, this.password).subscribe({
      next: () => {
        this.api.login(this.email, this.password).subscribe({
          next: (data: any) => {
            this.isLoading = false;
            localStorage.setItem('token', data.token);
            localStorage.setItem('fullname', data.fullname || this.fullname);
            localStorage.setItem('email', this.email);
            this.router.navigate(['/dashboard'], { replaceUrl: true });
          },
          error: () => {
            this.isLoading = false;
            this.router.navigate(['/login'], { replaceUrl: true });
          }
        });
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMsg = err.error?.error || 'Could not create account.';
      }
    });
  }

  goLogin() {
    this.router.navigate(['/login']);
  }
}