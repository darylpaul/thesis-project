import { Injectable } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular/standalone';
import { ApiService } from './api';

@Injectable({ providedIn: 'root' })
export class AuthDeleteService {

  constructor(
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private api: ApiService
  ) {}

  // Call this instead of direct delete
  // Usage: this.authDelete.confirm('Section BC7MB', () => this.deleteSection(id))
  async confirm(itemName: string, onConfirmed: () => void) {
    const alert = await this.alertCtrl.create({
      header: '🔐 Confirm Delete',
      subHeader: `Deleting: "${itemName}"`,
      message: 'Enter your password to confirm this action.',
      inputs: [
        {
          name: 'password',
          type: 'password',
          placeholder: 'Your account password',
          attributes: { autocomplete: 'current-password' }
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async (data) => {
            if (!data.password) {
              this.toast('Please enter your password.', 'warning');
              return false; // keep alert open
            }
            try {
              const res: any = await this.api.verifyPassword(data.password).toPromise();
              if (res?.verified) {
                onConfirmed();
                return true;
              } else {
                this.toast('❌ Incorrect password. Try again.', 'danger');
                return false;
              }
            } catch {
              this.toast('❌ Incorrect password. Try again.', 'danger');
              return false;
            }
          }
        }
      ],
      cssClass: 'auth-delete-alert'
    });
    await alert.present();
  }

  private async toast(message: string, color: string) {
    const t = await this.toastCtrl.create({ message, duration: 3000, color, position: 'bottom' });
    t.present();
  }
}