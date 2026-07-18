import { Component, inject } from '@angular/core';
// import { CommonModule } from '@angular/commonmodule';
import { CommonModule } from '@angular/common';

import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  exhaustMap,
  concatMap,
  mergeMap,
  scan,
  Observable,
  shareReplay,
} from 'rxjs';
import { DashboardService } from '../services/dashboard-service';
import { UserMetric, DetailedLog, SystemAlert } from '../interfaces/dashboard-interface';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dashboard-component.html',
  styleUrls: [], // Tailwind framework classes used instead of custom styles
})
export class DashboardComponent {
  private apiService = inject(DashboardService);

  // 1. INPUT SOURCES (Subjects to pipe interaction events into streams)
  searchControl = new FormControl('');

  alertTrigger$ = new Subject<string>();
  detailFetchTrigger$ = new Subject<number>();

  systemForm = new FormGroup({
    title: new FormControl('', [Validators.required, Validators.minLength(3)]),
    body: new FormControl('', [Validators.required]),
  });
  formSubmitTrigger$ = new Subject<{ title: string; body: string }>();

  // 2. OUTPUT STREAMS (Consumed declaratively via async pipe in view layer)

  /**
   * switchMap Scenario: Real-time search engine filtering.
   * Drops previous HTTP calls instantly as new input values arrive.
   */
  filteredUsers$: Observable<UserMetric[]> = this.searchControl.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap((query) => this.apiService.searchUsers(query || '')),
  );

  /**
   * exhaustMap Scenario: Form submission safeguard.
   * Lock down processing until completion, dropping additional clicks.
   */
  formSubmissionResult$: Observable<any> = this.formSubmitTrigger$.pipe(
    exhaustMap((payload) => this.apiService.submitForm(payload)),
  );

  /**
   * concatMap Scenario: Ordered notification stream.
   * Collects triggers and builds an array order sequentially using scan.
   */
  alertLogQueue$: Observable<SystemAlert[]> = this.alertTrigger$.pipe(
    concatMap((msg) => this.apiService.processSequentialAlert(msg)),
    scan((acc: SystemAlert[], currentAlert: SystemAlert) => [currentAlert, ...acc], []),
  );

  /**
   * mergeMap Scenario: Unordered parallel record lookups.
   * Concurrent processing ensures that the fastest network payloads return first.
   */
  concurrentDetails$: Observable<DetailedLog[]> = this.detailFetchTrigger$.pipe(
    mergeMap((id) => this.apiService.fetchUserExtraDetails(id)),
    scan((acc: DetailedLog[], details: DetailedLog) => {
      const filtered = acc.filter((item) => item.userId !== details.userId);
      return [details, ...filtered];
    }, []),
    shareReplay(1),
  );

  // Component methods pushing actions into corresponding streams
  onTriggerAlert(message: string): void {
    this.alertTrigger$.next(message);
  }

  onFetchDetails(userId: number): void {
    this.detailFetchTrigger$.next(userId);
  }

  onSubmitForm(): void {
    if (this.systemForm.valid) {
      const data = this.systemForm.value as { title: string; body: string };
      this.formSubmitTrigger$.next(data);
      this.systemForm.reset();
    }
  }
}
