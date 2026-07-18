import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  Observable,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  catchError,
  of,
  map,
  startWith,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LargeDataService } from './large-data.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  // 1. Inject modern services
  private dataService = inject(LargeDataService);
  private destroyRef = inject(DestroyRef);

  // 2. Form Control for real-time streaming search
  searchControl = new FormControl('', { nonNullable: true });

  // 3. Declarative stream declaration
  filteredItems$!: Observable<any[]>;
  errorMessage: string | null = null;

  ngOnInit(): void {
    this.initializeSearchStream();
    this.subscribeToCriticalAlerts();
  }

  private initializeSearchStream(): void {
    this.filteredItems$ = this.searchControl.valueChanges.pipe(
      // Wait for user to stop typing for 300ms
      debounceTime(300),
      // Only hit backend if the query actually changed
      distinctUntilChanged(),
      // Switch to the latest HTTP request, canceling old ones if typing continues
      switchMap((query) => {
        this.errorMessage = null; // Reset errors
        return this.dataService.searchLargeDataset(query).pipe(
          // Defensive programming: Catch inner errors so the main outer stream stays alive
          catchError((err) => {
            this.errorMessage = 'Failed to fetch data. Please try again.';
            return of([]); // Fallback to an empty list on failure
          }),
        );
      }),
    );
  }

  /**
   * Example of an explicit side-effect subscription.
   * Uses Angular 18's `takeUntilDestroyed` to automatically clean up when component destroys.
   */
  private subscribeToCriticalAlerts(): void {
    this.dataService.alertStream$
      .pipe(
        // Passes the injection context or automatically finds it if called within constructor/ngOnInit
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (alert: any) => console.warn('System Alert Received:', alert),
        error: (err: any) => console.error('Alert Stream crashed', err),
      });
  }
}
