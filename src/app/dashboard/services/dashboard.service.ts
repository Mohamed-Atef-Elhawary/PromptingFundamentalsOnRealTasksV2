import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay } from 'rxjs';

import { User, Todo, Post, SaveResponse } from '../interfaces/dashboard.interface';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly http = inject(HttpClient);

  private readonly api = 'https://jsonplaceholder.typicode.com';

  searchUsers(keyword: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.api}/users`);
  }

  getTodos(userId: number): Observable<Todo[]> {
    return this.http.get<Todo[]>(`${this.api}/users/${userId}/todos`);
  }

  updateAlert(id: number): Observable<SaveResponse> {
    return of({
      success: true,
      message: `Alert ${id} Updated`,
    }).pipe(delay(1000));
  }

  saveDashboard(): Observable<SaveResponse> {
    return of({
      success: true,
      message: 'Dashboard Saved',
    }).pipe(delay(3000));
  }
}
