import { Injectable } from '@angular/core';
import { Observable, of, delay, map, interval, Subject } from 'rxjs';

// Define strict interfaces for enterprise type safety
export interface LargeDataRecord {
  id: number;
  name: string;
  status: 'Active' | 'Pending' | 'Archived';
  category: string;
}

export interface SystemAlert {
  timestamp: Date;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class LargeDataService {
  // 1. Generate local in-memory dataset (10,000 records)
  private localDataset: LargeDataRecord[] = this.generateMockDataset(10000);

  // 2. Simulate a live WebSocket/SSE streaming server alerts
  private alertSource$ = new Subject<SystemAlert>();
  public alertStream$: Observable<SystemAlert> = this.alertSource$.asObservable();

  constructor() {
    this.startSimulatedAlertStream();
  }

  /**
   * Simulates a heavy search query on a massive database locally.
   * Uses delay() to replicate real-world server latency.
   */
  public searchLargeDataset(query: string): Observable<LargeDataRecord[]> {
    // If the search is empty, return an empty array instantly
    if (!query.trim()) {
      return of([]).pipe(delay(150));
    }

    const lowerQuery = query.toLowerCase();

    // Perform local filtering
    const filteredResults = this.localDataset.filter(
      item => 
        item.name.toLowerCase().includes(lowerQuery) || 
        item.category.toLowerCase().includes(lowerQuery)
    );

    // Limit results to top 50 to mimic backend pagination/safety and prevent DOM lag
    const paginatedResults = filteredResults.slice(0, 50);

    // Wrap in an observable and simulate a 400ms network round-trip time (RTT)
    return of(paginatedResults).pipe(delay(400));
  }

  /**
   * Helper method to generate mock records efficiently on startup
   */
  private generateMockDataset(count: number): LargeDataRecord[] {
    const categories = ['Finance', 'Logistics', 'Security', 'HR', 'Infrastructure'];
    const statuses: ('Active' | 'Pending' | 'Archived')[] = ['Active', 'Pending', 'Archived'];
    const mockData: LargeDataRecord[] = [];

    for (let i = 1; i <= count; i++) {
      mockData.push({
        id: i,
        name: `Enterprise_Record_#${i.toString().padStart(5, '0')}`,
        status: statuses[i % statuses.length],
        category: categories[i % categories.length]
      });
    }

    return mockData;
  }

  /**
   * Pushes mock background telemetry alerts at random intervals 
   * to test components listening to long-lived streams.
   */
  private startSimulatedAlertStream(): void {
    const severities: ('INFO' | 'WARNING' | 'CRITICAL')[] = ['INFO', 'WARNING', 'CRITICAL'];
    
    // Every 5 seconds, push a mock system notification
    interval(5000).subscribe((index) => {
      const selectedSeverity = severities[index % severities.length];
      
      this.alertSource$.next({
        timestamp: new Date(),
        severity: selectedSeverity,
        message: `Automated health check completed. Status level: ${selectedSeverity}`
      });
    });
  }
}