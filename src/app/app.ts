import { Component } from '@angular/core';
import { fromEvent, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, map, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  destroy$ = new Subject<void>(); // هذا السيل سنستخدمه لإشارة الإغلاق
  ngOnInit() {
    // 1. تحديد عنصر الإدخال من الـ DOM وعنصر التحكم في الإغلاق
    const searchInput = document.getElementById('search-box') as HTMLInputElement;

    // 2. بناء تدفق البيانات (Stream)
    const search$ = fromEvent(searchInput, 'input').pipe(
      // تحويل الحدث لاستخراج النص المكتوب فقط
      map((event: any) => event.target.value),

      // انتظر 300 ملي ثانية بعد توقف المستخدم عن الكتابة (لتوفير الطلبات)
      debounceTime(300),

      // لا تمرر القيمة إلا إذا كانت تختلف عن الكلمة السابقة
      distinctUntilChanged(),

      // عملية متقدمة: إذا كتب المستخدم حرفاً جديداً، يتم إلغاء طلب الـ API السابق فوراً
      switchMap((searchTerm: string) => this.mockApiFetch(searchTerm)),

      // حماية الذاكرة: بمجرد أن يطلق destroy$ أي قيمة، سيتم إغلاق هذا الـ Observable نهائياً
      takeUntil(this.destroy$),
    );

    // 3. الاشتراك لتشغيل الكود
    const subscription = search$.subscribe({
      next: (results) => console.log('عرض النتائج:', results),
      error: (err) => console.error('حدث خطأ:', err),
      complete: () => console.log('تم تنظيف الذاكرة وإغلاق التدفق بنجاح!'),
    });
  }
  // دالة وهمية لمحاكاة طلب السيرفر
  mockApiFetch(term: string) {
    return new Response(JSON.stringify({ data: `نتائج البحث عن: ${term}` })).text();
  }

  // --- محاكاة تدمير المكون (عند مغادرة المستخدم للصفحة) ---
  onDestroyComponent() {
    this.destroy$.next(); // إرسال إشارة التدمير
    this.destroy$.complete(); // إغلاق عنصر التحكم نهائياً
  }
}
