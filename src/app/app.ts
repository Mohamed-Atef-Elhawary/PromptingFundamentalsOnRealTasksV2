import { Component, signal } from '@angular/core';
import { DashboardComponent } from './components/dashboard-component';

@Component({
  selector: 'app-root',
  imports: [DashboardComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('PromptingFundamentalsOnRealTasks');
}
