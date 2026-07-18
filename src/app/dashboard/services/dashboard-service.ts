import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, delay, of } from 'rxjs';
import { SystemAlert, UserMetric, DetailedLog } from '../interfaces/dashboard-interface';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private http = inject(HttpClient);

  // Base URLs for public mock REST APIs
  private baseUsersUrl = 'https://jsonplaceholder.typicode.com/users';

  /**
   * Used by switchMap: Cancels prior requests for rapid typings
   */
  searchUsers(query: string): Observable<UserMetric[]> {
    if (!query.trim()) return of([]);
    return this.http.get<UserMetric[]>(`${this.baseUsersUrl}?q=${encodeURIComponent(query)}`);
  }

  /**
   * Used by exhaustMap: Ignores duplicate clicks until execution completes
   */
  submitForm(payload: { title: string; body: string }): Observable<any> {
    const postUrl = 'https://jsonplaceholder.typicode.com/posts';
    return this.http.post(postUrl, payload).pipe(delay(1500)); // Simulating network latency
  }

  /**
   * Used by concatMap: Resolves requests one after another to guarantee order
   */
  processSequentialAlert(message: string): Observable<SystemAlert> {
    const mockAlert: SystemAlert = {
      id: Math.random().toString(36).substring(2, 9),
      message,
      timestamp: new Date(),
    };
    return of(mockAlert).pipe(delay(800)); // Artificial buffer preserving sequence
  }

  /**
   * Used by mergeMap: Processes lookups concurrently to fetch all items instantly
   */
  fetchUserExtraDetails(userId: number): Observable<DetailedLog> {
    const mockDetails: DetailedLog = {
      userId,
      actionCount: Math.floor(Math.random() * 200) + 12,
      lastActive: new Date().toLocaleTimeString(),
      status: 'Active Internal Node',
    };
    return of(mockDetails).pipe(delay(Math.random() * 1000)); // Disordered resolution speeds
  }
}
