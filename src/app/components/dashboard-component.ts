// components/dashboard-component.ts
//
// Dependencies:
// @angular/core            (Component, inject, DestroyRef, signal, computed)
// @angular/common          (CommonModule / *ngIf, *ngFor)
// @angular/forms           (ReactiveFormsModule, FormControl, FormGroup, Validators)
// @angular/core/rxjs-interop (takeUntilDestroyed)
// rxjs, rxjs/operators
//
// Angular version: 18+ (standalone components, functional inject(), signals)

import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, of } from 'rxjs';
import {
  catchError,
  concatMap,
  debounceTime,
  distinctUntilChanged,
  exhaustMap,
  filter,
  finalize,
  map,
  mergeMap,
  switchMap,
  tap,
} from 'rxjs/operators';

import { DashboardService } from '../services/dashboard-service';
import { AlertItem, Post, User, UserDetail } from '../interfaces/dashboard-interface';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dashboard-component.html',
})
export class DashboardComponent {
  private readonly dashboardService = inject(DashboardService);
  // DestroyRef gives us a hook into the component's teardown lifecycle
  // without needing OnDestroy + a manual Subscription bag.
  private readonly destroyRef = inject(DestroyRef);

  // =========================================================
  // 1. TYPEAHEAD SEARCH — switchMap
  // Every keystroke should cancel the previous in-flight request.
  // Only the latest search term matters; stale responses must be dropped.
  // =========================================================
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly searchResults = signal<User[]>([]);
  readonly isSearching = signal(false);

  // =========================================================
  // 2. FORM SUBMISSION — exhaustMap
  // Once a submit is in flight, ignore further clicks entirely
  // (prevents duplicate POSTs from double-clicks / accidental resubmits).
  // =========================================================
  readonly postForm = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    body: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  private readonly submitTrigger$ = new Subject<void>();
  readonly isSubmitting = signal(false);
  readonly lastSubmittedPost = signal<Post | null>(null);

  // =========================================================
  // 3. ALERT QUEUE — concatMap
  // Alerts must be acknowledged with the backend strictly one at a time,
  // in the order the user clicked them (order-sensitive audit trail).
  // =========================================================
  private readonly alertQueue$ = new Subject<AlertItem>();
  readonly alerts = signal<AlertItem[]>([
    { id: 1, message: 'Server load high', status: 'pending' },
    { id: 2, message: 'New user registered', status: 'pending' },
    { id: 3, message: 'Payment failed', status: 'pending' },
  ]);

  // =========================================================
  // 4. PARALLEL DETAILS FETCH — mergeMap
  // Fetching details for several selected users at once; order of
  // arrival doesn't matter, but we cap concurrency to be API-friendly.
  // =========================================================
  private readonly userIdsToFetch$ = new Subject<number>();
  private readonly pendingFetchCount = signal(0);
  readonly isFetchingDetails = computed(() => this.pendingFetchCount() > 0);
  readonly userDetails = signal<UserDetail[]>([]);

  constructor() {
    this.initSearchStream();
    this.initSubmitStream();
    this.initAlertQueueStream();
    this.initParallelDetailsStream();
  }

  // ---- Stream wiring -------------------------------------------------

  private initSearchStream(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        filter((term) => term.trim().length > 1),
        tap(() => this.isSearching.set(true)),
        // switchMap: a new term arriving cancels the previous HTTP call
        // and its subscription — no wasted requests, no race conditions.
        switchMap((term) =>
          this.dashboardService.searchUsers(term).pipe(
            catchError(() => of([] as User[])),
            finalize(() => this.isSearching.set(false)),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((users) => this.searchResults.set(users));
  }

  private initSubmitStream(): void {
    this.submitTrigger$
      .pipe(
        filter(() => this.postForm.valid),
        tap(() => this.isSubmitting.set(true)),
        // exhaustMap: while a submit is in flight, new submitTrigger$
        // emissions are dropped on the floor rather than queued or cancelled.
        exhaustMap(() =>
          this.dashboardService.submitPost(this.postForm.getRawValue() as Partial<Post>).pipe(
            catchError(() => of(null)),
            finalize(() => this.isSubmitting.set(false)),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((post) => {
        if (post) {
          this.lastSubmittedPost.set(post);
          this.postForm.reset();
        }
      });
  }

  private initAlertQueueStream(): void {
    this.alertQueue$
      .pipe(
        // concatMap: each alert waits for the previous PATCH to complete
        // before starting the next one — strict FIFO ordering.
        concatMap((alert) =>
          this.dashboardService.markAlertAsRead(alert.id).pipe(
            map(() => alert.id),
            catchError(() => of(null)),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((alertId) => {
        if (alertId !== null) {
          this.alerts.update((list) =>
            list.map((a) => (a.id === alertId ? { ...a, status: 'read' as const } : a)),
          );
        }
      });
  }

  private initParallelDetailsStream(): void {
    this.userIdsToFetch$
      .pipe(
        tap(() => this.pendingFetchCount.update((c) => c + 1)),
        // mergeMap: up to 3 requests run concurrently. The concurrency
        // limit (2nd argument) protects the API and the browser's
        // connection pool from being flooded by a large selection.
        mergeMap(
          (id) =>
            this.dashboardService.getUserDetails(id).pipe(
              catchError(() => of(null)),
              finalize(() => this.pendingFetchCount.update((c) => c - 1)),
            ),
          3,
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((detail) => {
        if (detail) {
          this.userDetails.update((list) => [...list, detail]);
        }
      });
  }

  // ---- Template-facing handlers --------------------------------------

  onSubmitPost(): void {
    this.submitTrigger$.next();
  }

  onMarkAlertRead(alert: AlertItem): void {
    if (alert.status === 'pending') {
      this.alertQueue$.next(alert);
    }
  }

  onFetchDetails(userIds: number[]): void {
    this.userDetails.set([]);
    userIds.forEach((id) => this.userIdsToFetch$.next(id));
  }
}
