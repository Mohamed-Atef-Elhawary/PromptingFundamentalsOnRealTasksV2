import { Component, inject, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Subject, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, exhaustMap, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface Product {
  id: number;
  name: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="p-6">
      <!-- Search Stream UI -->
      <label class="block mb-2 font-bold">Search Products (switchMap):</label>
      <input
        [formControl]="searchControl"
        type="text"
        class="border p-2 w-full rounded mb-4"
        placeholder="Type to search..."
      />

      <ul class="list-disc pl-5 mb-6">
        <li *ngFor="let product of products$ | async">{{ product.name }}</li>
      </ul>

      <!-- Action Stream UI -->
      <button
        (click)="saveTrigger$.next()"
        class="bg-blue-600 text-white px-4 py-2 rounded font-medium"
      >
        Save Changes (exhaustMap)
      </button>

      <p *ngIf="isSaving" class="text-amber-600 mt-2 font-medium">
        Saving data... Submissions are locked.
      </p>
    </div>
  `,
})
export class App implements OnInit {
  private http = inject(HttpClient);

  // Forms and Trigger Subjects
  searchControl = new FormControl('');
  saveTrigger$ = new Subject<void>();

  // Observables
  products$!: Observable<Product[]>;
  isSaving = false;

  constructor() {
    // Standard rule: use takeUntilDestroyed in the constructor
    // where injection context is available out-of-the-box.
    this.setupSaveStream();
  }

  ngOnInit(): void {
    this.setupSearchStream();
  }

  private setupSearchStream(): void {
    this.products$ = this.searchControl.valueChanges.pipe(
      debounceTime(300), // Wait until the user stops typing for 300ms
      distinctUntilChanged(), // Only emit if the current value is different from the last
      switchMap((searchTerm) => {
        // If a new keystroke passes through, this HTTP request is immediately aborted
        // by RxJS, preventing race conditions and unnecessary network overhead.
        return this.http.get<Product[]>(`/api/products?search=${searchTerm}`);
      }),
    );
    // NOTE: We don't subscribe in TS! The `| async` pipe in the template
    // handles subscription and automagically unsubscribes on destroy.
  }

  private setupSaveStream(): void {
    this.saveTrigger$
      .pipe(
        tap(() => (this.isSaving = true)),
        exhaustMap(() => {
          // While this POST request is pending, any further clicks on the save button
          // are completely ignored. No double-submits.
          return this.http.post('/api/products/save', { timestamp: Date.now() });
        }),
        tap(() => (this.isSaving = false)),
        // Clean up automatically when the component dies. Zero memory leaks.
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (response) => console.log('Saved successfully', response),
        error: (err) => {
          console.error('Error saving data', err);
          this.isSaving = false; // Reset state on error
        },
      });
  }
}
