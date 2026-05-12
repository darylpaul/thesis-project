import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonTabBar, IonTabButton, IonLabel } from '@ionic/angular/standalone';

@Component({
  selector: 'app-bottom-nav',
  templateUrl: './bottom-nav.component.html',
  styleUrls: ['./bottom-nav.component.scss'],
  standalone: true,
  imports: [CommonModule, IonTabBar, IonTabButton, IonLabel]
})
export class BottomNavComponent {
  @Input() activePage: string = 'dashboard';

  constructor(private router: Router) {}

  goTo(page: string) {
    this.router.navigate([`/${page}`]);
  }
}