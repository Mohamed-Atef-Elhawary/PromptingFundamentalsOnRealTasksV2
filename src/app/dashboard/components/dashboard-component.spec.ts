import 'zone.js';
import 'zone.js/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { of, delay } from 'rxjs';
import { DashboardComponent } from './dashboard-component';
import { DashboardService } from '../services/dashboard-service';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockService: any;

  beforeEach(() => {
    // بناء Mock Object للخدمة لتوليد قيم متحكم بها في التوقيت
    mockService = {
      searchUsers: vi.fn().mockReturnValue(of([{ id: 1, name: 'Leanne' }])),
      submitForm: vi.fn().mockReturnValue(of({ id: 200 }).pipe(delay(1000))),
      processSequentialAlert: vi.fn((msg) =>
        of({ id: 'a1', message: msg, timestamp: new Date() }).pipe(delay(500)),
      ),
      fetchUserExtraDetails: vi.fn((id) =>
        of({ userId: id, actionCount: 50, lastActive: '12:00', status: 'OK' }),
      ),
    };

    TestBed.configureTestingModule({
      imports: [DashboardComponent, ReactiveFormsModule],
      providers: [{ provide: DashboardService, useValue: mockService }],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  // 1. فحص آلية الـ switchMap مع الـ Search input
  it('should handle search input using switchMap with debounceTime', async () => {
    let result: any[] = [];
    component.filteredUsers$.subscribe((res) => (result = res));

    component.searchControl.setValue('Lea');
    await new Promise((r) => setTimeout(r, 100)); // وقت أقل من الـ debounceTime (300ms)
    expect(mockService.searchUsers).not.toHaveBeenCalled();

    await new Promise((r) => setTimeout(r, 250)); // تخطي الـ 300ms الإجمالية
    expect(mockService.searchUsers).toHaveBeenCalledWith('Lea');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Leanne');
  });

  // 2. فحص آلية الـ exhaustMap للحماية من النقرات المزدوجة على النماذج
  it('should ignore subsequent form submissions while process is active (exhaustMap)', async () => {
    component.systemForm.setValue({ title: 'Alert Title', body: 'Alert Content' });

    // محاكاة ضغطتين متتاليتين بسرعة (Double Click)
    component.onSubmitForm();
    component.onSubmitForm();

    await new Promise((r) => setTimeout(r, 1200)); // إنهاء تـأخير الـ Async stream الحالي

    // يجب أن يتم استدعاء الخدمة مرة واحدة فقط لأن exhaustMap تجاهل الضغطة الثانية
    expect(mockService.submitForm).toHaveBeenCalledTimes(1);
  });

  // 3. فحص آلية الـ concatMap لجدولة العمليات بالتوالي
  it('should queue alerts and process them sequentially (concatMap)', async () => {
    let currentLogs: any[] = [];
    component.alertLogQueue$.subscribe((logs) => (currentLogs = logs));

    component.onTriggerAlert('First Failure');
    component.onTriggerAlert('Second Failure');

    // بعد 500ms يتم حل التنبيه الأول فقط وتحديث الـ scan array
    await new Promise((r) => setTimeout(r, 500));
    expect(currentLogs).toHaveLength(1);
    expect(currentLogs[0].message).toBe('First Failure');

    // بعد 500ms إضافية يتم حل التنبيه الثاني
    await new Promise((r) => setTimeout(r, 500));
    expect(currentLogs).toHaveLength(2);
    expect(currentLogs[0].message).toBe('Second Failure'); // تمت إضافته في المقدمة عبر الدالة scan
  });

  // 4. فحص آلية الـ mergeMap لمعالجة البيانات بالتوازي (Concurrent)
  it('should fetch user details concurrently without blocking (mergeMap)', async () => {
    let detailedLogs: any[] = [];
    component.concurrentDetails$.subscribe((logs) => (detailedLogs = logs));

    component.onFetchDetails(1);
    component.onFetchDetails(2);

    await new Promise((r) => setTimeout(r, 1000)); // وقت كافٍ لمعالجة الطلبين معاً

    expect(mockService.fetchUserExtraDetails).toHaveBeenCalledTimes(2);
    expect(detailedLogs).toHaveLength(2);
  });
});
