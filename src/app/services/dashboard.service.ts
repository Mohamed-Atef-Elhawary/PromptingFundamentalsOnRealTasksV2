import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, delay, of } from 'rxjs';
import { MetricItem } from '../interfaces/dashboard.interface';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private http = inject(HttpClient);

  // Using a public placeholder API URL for compliance, with a fallback mock for large data
  private apiUrl = 'https://jsonplaceholder.typicode.com/posts';

  /**
   * Simulates fetching a massive enterprise dataset from an API
   */
  getLargeMetricsData(searchQuery: string): Observable<MetricItem[]> {
    // Generates mock data simulating 5,000 corporate metric points
    const mockData: MetricItem[] = Array.from({ length: 5000 }, (_, index) => ({
      id: `metric-${index}`,
      name: `Server Node-${index % 50} ${index}`,
      category: index % 2 === 0 ? 'Infrastructure' : 'Database',
      value: Math.floor(Math.random() * 100),
      status: index % 10 === 0 ? 'critical' : index % 7 === 0 ? 'warning' : 'stable',
      timestamp: new Date().toISOString(),
    }));

    // Filter data based on query
    const filtered = mockData.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    // Using 'of' to mock the stream, adding 'delay' to simulate real network latency
    return of(filtered).pipe(delay(400));
  }

  /**
   * Action trigger requiring exhaustMap to prevent double execution
   */
  exportReport(data: MetricItem[]): Observable<{ success: boolean }> {
    return of({ success: true }).pipe(delay(1500));
  }
}
