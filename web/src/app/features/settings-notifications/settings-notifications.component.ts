import { Component } from '@angular/core';

@Component({
  selector: 'app-settings-notifications',
  standalone: true,
  imports: [],
  template: `
    <div class="page" data-testid="settings-notifications-screen">
      <h1 class="page-title">Notification Settings</h1>
    </div>
  `,
})
export class SettingsNotificationsComponent {}
