import { Component, DestroyRef, inject, signal } from '@angular/core';

import { CommonModule } from '@angular/common';

import { ReactiveFormsModule, FormBuilder } from '@angular/forms';

import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  mergeMap,
  concatMap,
  exhaustMap,
  Subject,
  from,
  tap,
  toArray,
} from 'rxjs';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { DashboardService } from '../services/dashboard.service';

import { User, Todo } from '../interfaces/dashboard.interface';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  private readonly fb = inject(FormBuilder);

  private readonly service = inject(DashboardService);

  private readonly destroyRef = inject(DestroyRef);

  users = signal<User[]>([]);

  todos = signal<Todo[]>([]);

  logs = signal<string[]>([]);

  loading = signal(false);

  readonly searchControl = this.fb.control('');

  readonly saveClick$ = new Subject<void>();

  readonly alertQueue$ = new Subject<number>();

  constructor() {
    this.initializeSearch();

    this.initializeSave();

    this.initializeAlerts();
  }

  // -----------------------------
  // switchMap
  // Search
  // -----------------------------

  private initializeSearch(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(500),

        distinctUntilChanged(),

        switchMap((value) => this.service.searchUsers(value ?? '')),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((users) => {
        this.users.set(users);
      });
  }

  // -----------------------------
  // exhaustMap
  // Save Dashboard
  // -----------------------------

  private initializeSave(): void {
    this.saveClick$
      .pipe(
        tap(() => this.loading.set(true)),

        exhaustMap(() => this.service.saveDashboard()),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        this.logs.update((log) => [...log, result.message]);

        this.loading.set(false);
      });
  }

  // -----------------------------
  // concatMap
  // Sequential Alert Updates
  // -----------------------------

  private initializeAlerts(): void {
    this.alertQueue$
      .pipe(
        concatMap((id) => this.service.updateAlert(id)),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        this.logs.update((log) => [...log, result.message]);
      });
  }

  // -----------------------------
  // mergeMap
  // Parallel Details
  // -----------------------------

  loadTodoDetails(users: User[]): void {
    from(users)
      .pipe(
        mergeMap((user) => this.service.getTodos(user.id)),

        toArray(),

        takeUntilDestroyed(this.destroyRef),
      )

      .subscribe((result) => {
        this.todos.set(result.flat());
      });
  }

  submit(): void {
    this.saveClick$.next();
  }

  updateAlerts(): void {
    [1, 2, 3, 4, 5].forEach((id) => this.alertQueue$.next(id));
  }
}
