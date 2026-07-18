import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  Subject,
  BehaviorSubject,
  switchMap,
  debounceTime,
  distinctUntilChanged,
  exhaustMap,
  tap,
  catchError,
  of,
  map,
} from 'rxjs';
import { DashboardService } from '../services/dashboard.service';
import { MetricItem, DashboardState } from '../interfaces/dashboard.interface';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: [],
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);

  // 1. Reactive Form Control for search
  searchControl = new FormControl('', { nonNullable: true });

  // 2. Action streams using Subjects
  private exportTrigger$ = new Subject<MetricItem[]>();

  // 3. Main State Stream using a unified state approach
  private state$ = new BehaviorSubject<DashboardState>({
    metrics: [],
    loading: false,
    error: null,
  });

  // 4. Expose read-only UI Signals via toSignal()
  // This automatically cleans up subscriptions when the component dies -> ZERO memory leaks!
  stateSignal = toSignal(this.state$, { requireSync: true });

  // Derived quick stats using RxJS mapping (could also use computed() signals)
  criticalCount$ = this.state$.pipe(
    map((state) => state.metrics.filter((m) => m.status === 'critical').length),
  );
  criticalCount = toSignal(this.criticalCount$, { initialValue: 0 });

  isExporting = false;

  ngOnInit(): void {
    this.initializeSearchStream();
    this.initializeExportStream();
  }

  private initializeSearchStream(): void {
    // Listen to form control typing events
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300), // Wait 300ms until user stops typing
        distinctUntilChanged(), // Only emit if value actually changed
        tap(() => this.updateState({ loading: true, error: null })),

        // Crucial: switchMap cancels the previous pending search API call if a new character is hit
        switchMap((query) =>
          this.dashboardService.getLargeMetricsData(query).pipe(
            catchError((err) => {
              this.updateState({ error: 'Failed to fetch metrics.', loading: false });
              return of([]); // Return empty array to keep the stream alive
            }),
          ),
        ),
      )
      .subscribe((data) => {
        this.updateState({ metrics: data, loading: false });
      });

    // Seed the initial data pull on load
    this.searchControl.setValue('');
  }

  private initializeExportStream(): void {
    this.exportTrigger$
      .pipe(
        tap(() => (this.isExporting = true)),

        // Crucial: exhaustMap locks down. Clicking button again during export does nothing.
        exhaustMap((currentData) =>
          this.dashboardService
            .exportReport(currentData)
            .pipe(catchError(() => of({ success: false }))),
        ),
      )
      .subscribe((result) => {
        this.isExporting = false;
        if (result.success) {
          alert('Large data report generated and downloaded successfully!');
        }
      });
  }

  // Trigger function mapped to UI event
  onExportClick(): void {
    const currentMetrics = this.stateSignal().metrics;
    this.exportTrigger$.next(currentMetrics);
  }

  // Helper method to mutate state immutably
  private updateState(partialState: Partial<DashboardState>): void {
    this.state$.next({
      ...this.state$.value,
      ...partialState,
    });
  }
}
