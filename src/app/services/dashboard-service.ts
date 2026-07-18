/*
// services/dashboard-service.ts
//
// Dependencies:
// @angular/core
// @angular/common/http
// rxjs
//
// All requests hit JSONPlaceholder (https://jsonplaceholder.typicode.com),
// a free, public, no-auth REST API — safe to run this example as-is.
*/
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { AlertItem, Post, User, UserDetail } from '../interfaces/dashboard-interface';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://jsonplaceholder.typicode.com';

  /** Used by the switchMap typeahead search. */
  searchUsers(query: string): Observable<User[]> {
    const params = new HttpParams().set('q', query);
    return this.http.get<User[]>(`${this.baseUrl}/users`, { params });
  }

  /** Used by the exhaustMap form-submission flow. */
  submitPost(post: Partial<Post>): Observable<Post> {
    return this.http.post<Post>(`${this.baseUrl}/posts`, post);
  }

  /** Used by the concatMap sequential alert-processing queue. */
  markAlertAsRead(alertId: number): Observable<AlertItem> {
    // JSONPlaceholder echoes back whatever we PATCH, so we map the
    // response into the shape our UI actually needs.
    return this.http
      .patch<{ id: number }>(`${this.baseUrl}/posts/${alertId}`, { status: 'read' })
      .pipe(map((res) => ({ id: res.id, message: '', status: 'read' as const })));
  }

  /** Used by the mergeMap parallel details-fetch flow. */
  getUserDetails(userId: number): Observable<UserDetail> {
    return this.http.get<UserDetail>(`${this.baseUrl}/users/${userId}`);
  }
}
