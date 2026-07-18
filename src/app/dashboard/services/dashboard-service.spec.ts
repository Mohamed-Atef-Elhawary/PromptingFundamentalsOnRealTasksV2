import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { DashboardService } from './dashboard-service';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DashboardService],
    });

    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  // التأكد من عدم وجود أي طلبات معلقة بعد كل اختبار لمنع تسريب الذاكرة
  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('searchUsers (switchMap baseline)', () => {
    it('should return empty array if query is empty', () => {
      service.searchUsers('').subscribe((users) => {
        expect(users).toEqual([]);
      });
    });

    it('should fetch users matching the query from API', () => {
      const mockUsers = [{ id: 1, name: 'Ervin Howell', email: 'ervin@example.com', role: 'Dev' }];

      service.searchUsers('Ervin').subscribe((users) => {
        expect(users).toHaveLength(1);
        expect(users).toEqual(mockUsers);
      });

      const req = httpMock.expectOne('https://jsonplaceholder.typicode.com/users?q=Ervin');
      expect(req.request.method).toBe('GET');
      req.flush(mockUsers); // إرسال البيانات الوهمية
    });
  });

  describe('submitForm (exhaustMap baseline)', () => {
    it('should POST payload to the server', () => {
      const payload = { title: 'Test Title', body: 'Test Body' };
      const mockResponse = { id: 101, ...payload };

      // نستخدم الـ vi.useFakeTimers() لأن الخدمة تحتوي على عامل delay(1500)
      vi.useFakeTimers();

      service.submitForm(payload).subscribe((res) => {
        expect(res).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('https://jsonplaceholder.typicode.com/posts');
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);

      vi.runAllTimers();
      vi.useRealTimers();
    });
  });

  describe('processSequentialAlert (concatMap baseline)', () => {
    it('should create an alert object with delay', () => {
      vi.useFakeTimers();

      service.processSequentialAlert('CPU Warning').subscribe((alert) => {
        expect(alert.message).toBe('CPU Warning');
        expect(alert.id).toBeDefined();
        expect(alert.timestamp).toBeInstanceOf(Date);
      });

      vi.runAllTimers();
      vi.useRealTimers();
    });
  });

  describe('fetchUserExtraDetails (mergeMap baseline)', () => {
    it('should generate detailed log for a specific userId', () => {
      vi.useFakeTimers();

      service.fetchUserExtraDetails(5).subscribe((log) => {
        expect(log.userId).toBe(5);
        expect(log.status).toBe('Active Internal Node');
        expect(log.actionCount).toBeGreaterThanOrEqual(12);
      });

      vi.runAllTimers();
      vi.useRealTimers();
    });
  });
});
