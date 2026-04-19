
import { User, Role, Booking, BookingStatus, FinancialRecord, Salary, BranchService, Favorite, Coupon, Referral, PaymentHistory, NotificationSettings, AvailabilityStatus, BarberAvailability, WorkingHours, CustomerNote, BarberService, BarberReport, BulkNotification, CustomerAnalytics, BranchSettings, BackupData } from '../types';
import { auth, db, googleProvider, storage, IS_DEMO_FIREBASE, USE_FIRESTORE_DATA } from './firebaseConfig';
import * as F from './firestoreData';
import { onAuthStateChanged as subscribeToAuth } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

class FirebaseMock {
  private users: Map<string, User> = new Map();
  // نجعل الحجوزات Static لمحاكاة قاعدة بيانات عالمية يراها الجميع
  private static bookings: Booking[] = [];
  private static financialRecords: FinancialRecord[] = [];
  private static salaries: Salary[] = [];
  private static favorites: Favorite[] = [];
  private static coupons: Coupon[] = [];
  private static referrals: Referral[] = [];
  private static paymentHistory: PaymentHistory[] = [];
  private static notificationSettings: NotificationSettings[] = [];
  private static barberAvailability: BarberAvailability[] = [];
  private static workingHours: WorkingHours[] = [];
  private static customerNotes: CustomerNote[] = [];
  private static barberServices: BarberService[] = [];
  private static barberReports: BarberReport[] = [];
  private static bulkNotifications: BulkNotification[] = [];
  private static branchSettings: BranchSettings[] = [];
  private static branchServices: Record<string, BranchService[]> = {
    'Olaya Main': [
      { id: '1', nameAr: 'قصة شعر ملكية', nameEn: 'Royal Cut', price: 150 },
      { id: '2', nameAr: 'تحديد لحية دقيق', nameEn: 'Precision Beard', price: 80 },
      { id: '3', nameAr: 'تنظيف بشرة بالذهب', nameEn: 'Gold Facial', price: 200 },
    ],
    'Tahlia Branch': [
      { id: '1', nameAr: 'قصة شعر ملكية', nameEn: 'Royal Cut', price: 150 },
      { id: '2', nameAr: 'تحديد لحية دقيق', nameEn: 'Precision Beard', price: 80 },
    ],
    'Nakheel Mall': [
      { id: '1', nameAr: 'قصة شعر ملكية', nameEn: 'Royal Cut', price: 150 },
    ],
  };
  private adminPasscode: string;

  constructor() {
    this.adminPasscode = ((import.meta as any)?.env?.VITE_ADMIN_PASSCODE || '5500').toString();
    // بيانات تجريبية محلية فقط عند مفتاح Demo — مع Firebase الحقيقي تعتمد على مستندات `users` في Firestore
    if (IS_DEMO_FIREBASE) {
      this.seedUser('admin_id', 'Admin Luxe', 'admin@luxecuts.com', 'admin', 'Olaya Main');
      this.seedUser('barber1_id', 'Marcus V.', 'marcus@luxecuts.com', 'barber');
      this.seedUser('barber2_id', 'Daniel B.', 'daniel@luxecuts.com', 'barber');
      this.seedUser('customer_test_id', 'زبون تجريبي', 'customer@luxecuts.com', 'user');
    }
  }

  private seedUser(uid: string, name: string, email: string, role: Role, branchId?: string) {
    this.users.set(uid, { uid, name, email, role, phone: '0500000000', avatar: `https://i.pravatar.cc/150?u=${uid}`, branchId });
  }

  async loginWithGoogle(): Promise<Partial<User>> {
    // تسجيل الدخول الحقيقي عبر Google — بدون أي بديل وهمي
    if (!auth || !googleProvider) {
      throw new Error('Firebase Auth غير مُهيّأ. تأكد من إعدادات .env.local');
    }

    const { signInWithPopup } = await import('firebase/auth');
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // التحقق من وجود المستخدم في قاعدة البيانات
    if (db) {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        // المستخدم موجود - إرجاع بياناته الكاملة (بما فيها phone)
        const userData = userDoc.data() as User;
        return userData;
      }
    }

    // مستخدم جديد — لا يوجد في Firestore بعد
    // نُرجع بدون phone حتى يُوجَّه إلى ProfileSetup
    return {
      uid: user.uid,
      email: user.email || '',
      avatar: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
      role: 'user',
      // نمرر اسم Google كحقل إضافي للاقتراح في فورم ProfileSetup
      googleDisplayName: user.displayName || '',
    } as any;
  }

  async signOut() {
    try {
      if (auth) {
        const { signOut: firebaseSignOut } = await import('firebase/auth');
        await firebaseSignOut(auth);
      }
    } catch (error) {
      console.warn('Firebase signOut not available:', error);
    }
  }

  async verifyAdminPasscode(uid: string, passcode: string): Promise<boolean> {
    const user = this.users.get(uid);
    if (!user) {
      // For Firebase-loaded privileged users not present in local mock map,
      // still allow passcode validation.
      return passcode.trim() === this.adminPasscode;
    }
    if (user.role !== 'admin' && user.role !== 'barber') return true;
    return passcode.trim() === this.adminPasscode;
  }

  onAuthStateChanged(callback: (user: Partial<User> | null) => void) {
    if (auth && db) {
      try {
        return subscribeToAuth(auth, async (firebaseUser) => {
          if (firebaseUser) {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              callback(userDoc.data() as User);
            } else {
              callback({
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: firebaseUser.displayName || '',
                avatar: firebaseUser.photoURL || '',
                role: 'user'
              });
            }
          } else {
            callback(null);
          }
        });
      } catch (e) {
        console.warn('Firebase auth state not available');
      }
    }
    return () => {};
  }

  async saveProfile(user: User) {
    try {
      // محاولة حفظ في Firebase Firestore إذا كان متاحاً
      if (db) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, user, { merge: true });
          console.log('User saved to Firestore');
        } catch (firestoreError: any) {
          // إذا فشل الاتصال بـ Firestore (مثل عدم وجود إعدادات صحيحة)، نستخدم النظام المحلي
          console.warn('Firestore not available, using local storage:', firestoreError.message);
        }
      }
      
      // حفظ محلي دائماً
      this.users.set(user.uid, user);
      console.log('User saved locally:', user);
      
      // حفظ في localStorage كنسخة احتياطية
      try {
        if (typeof localStorage !== 'undefined') {
          const usersArray = Array.from(this.users.values());
          localStorage.setItem('luxe_cuts_users', JSON.stringify(usersArray));
        }
      } catch (e) {
        console.warn('localStorage not available');
      }
      
      return user;
    } catch (error) {
      console.error('خطأ في حفظ الملف الشخصي:', error);
      // في حالة الفشل، نستخدم النظام القديم
      this.users.set(user.uid, user);
      return user;
    }
  }

  async updateUserProfile(uid: string, updates: { name?: string; phone?: string; avatar?: string }): Promise<boolean> {
    try {
      let user = this.users.get(uid);
      if (!user && db) {
        try {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            user = userDoc.data() as User;
            this.users.set(uid, user);
          }
        } catch {
          /* ignore */
        }
      }
      if (!user) return false;

      const updatedUser = { ...user, ...updates };
      this.users.set(uid, updatedUser);

      if (db) {
        try {
          const userDocRef = doc(db, 'users', uid);
          await updateDoc(userDocRef, updates);
        } catch (firestoreError: unknown) {
          const msg = firestoreError instanceof Error ? firestoreError.message : String(firestoreError);
          console.warn('Firestore update failed, using local storage:', msg);
        }
      }

      try {
        if (typeof localStorage !== 'undefined') {
          const usersArray = Array.from(this.users.values());
          localStorage.setItem('luxe_cuts_users', JSON.stringify(usersArray));
        }
      } catch {
        console.warn('localStorage not available');
      }

      return true;
    } catch (error) {
      console.error('خطأ في تحديث الملف الشخصي:', error);
      return false;
    }
  }

  async createBooking(booking: Booking) {
    const withReschedule = { ...booking, rescheduleCount: booking.rescheduleCount ?? 0, createdAt: Date.now() } as Booking;
    const existsIn = (list: Booking[]) =>
      list.some(
        (b) =>
          b.barberId === booking.barberId &&
          b.date === booking.date &&
          b.time === booking.time &&
          b.status !== 'Rejected'
      );
    if (USE_FIRESTORE_DATA) {
      const all = await F.fsListBookings();
      if (existsIn(all)) throw new Error('SLOT_TAKEN');
      await F.fsSetBooking(withReschedule);
      return booking.id;
    }
    if (existsIn(FirebaseMock.bookings)) throw new Error('SLOT_TAKEN');
    FirebaseMock.bookings.push(withReschedule);
    return booking.id;
  }

  /** إعادة جدولة موعد: يتطلب أكثر من ساعة قبل الموعد، وألا يكون قد تم استعمال المحاولتين. */
  async requestReschedule(bookingId: string, newDate: string, newTime: string): Promise<{ ok: boolean; error?: string }> {
    const apply = (b: Booking, list: Booking[], index: number) => {
      const count = b.rescheduleCount ?? 0;
      if (count >= 1) return { ok: false as const, error: 'RESCHEDULE_LIMIT_REACHED' as const };
      const bookingDateTime = this.getBookingDateTime(b);
      if (!bookingDateTime) return { ok: false as const, error: 'INVALID_DATE' as const };
      const now = new Date();
      const oneHourMs = 60 * 60 * 1000;
      if (bookingDateTime.getTime() - now.getTime() < oneHourMs) return { ok: false as const, error: 'LESS_THAN_ONE_HOUR' as const };
      const conflict = list.some(
        (x) => x.id !== bookingId && x.barberId === b.barberId && x.date === newDate && x.time === newTime && x.status !== 'Rejected'
      );
      if (conflict) return { ok: false as const, error: 'SLOT_TAKEN' as const };
      return {
        ok: true as const,
        next: {
          ...b,
          date: newDate,
          time: newTime,
          status: 'Pending' as BookingStatus,
          rescheduleCount: count + 1,
        },
      };
    };

    if (USE_FIRESTORE_DATA) {
      const list = await F.fsListBookings();
      const index = list.findIndex((b) => b.id === bookingId);
      if (index === -1) return { ok: false, error: 'BOOKING_NOT_FOUND' };
      const r = apply(list[index], list, index);
      if (!r.ok) return r;
      if ('next' in r) await F.fsPatchBooking(bookingId, r.next);
      return { ok: true };
    }

    const index = FirebaseMock.bookings.findIndex((b) => b.id === bookingId);
    if (index === -1) return { ok: false, error: 'BOOKING_NOT_FOUND' };
    const r = apply(FirebaseMock.bookings[index], FirebaseMock.bookings, index);
    if (!r.ok) return r;
    if ('next' in r) FirebaseMock.bookings[index] = r.next;
    return { ok: true };
  }

  /** إلغاء حجز (الحلاق أو المدير). */
  async cancelBooking(bookingId: string): Promise<{ ok: boolean; error?: string }> {
    if (USE_FIRESTORE_DATA) {
      const list = await F.fsListBookings();
      const b = list.find((x) => x.id === bookingId);
      if (!b) return { ok: false, error: 'BOOKING_NOT_FOUND' };
      await F.fsPatchBooking(bookingId, { status: 'Rejected' });
      return { ok: true };
    }
    const index = FirebaseMock.bookings.findIndex((b) => b.id === bookingId);
    if (index === -1) return { ok: false, error: 'BOOKING_NOT_FOUND' };
    FirebaseMock.bookings[index] = { ...FirebaseMock.bookings[index], status: 'Rejected' };
    return { ok: true };
  }

  /** الحلاق يضيف حجزاً يدوياً (اسم، جوال، خدمة، تاريخ، وقت). */
  async createBookingByBarber(params: {
    barberId: string;
    branchName: string;
    userName: string;
    userPhone?: string;
    service: string;
    date: string;
    time: string;
    amount?: number;
  }): Promise<{ ok: boolean; id?: string; error?: string }> {
    const id = 'booking_' + Date.now();
    const userId = 'guest_' + Date.now();
    const booking: Booking = {
      id,
      userId,
      userName: params.userName,
      barberId: params.barberId,
      branchName: params.branchName,
      service: params.service,
      date: params.date,
      time: params.time,
      status: 'Approved',
      amount: params.amount ?? 0,
      createdAt: Date.now(),
      userPhone: params.userPhone,
    };
    const conflictCheck = (list: Booking[]) =>
      list.some(
        (b) =>
          b.barberId === params.barberId &&
          b.date === params.date &&
          b.time === params.time &&
          b.status !== 'Rejected'
      );
    if (USE_FIRESTORE_DATA) {
      const all = await F.fsListBookings();
      if (conflictCheck(all)) return { ok: false, error: 'SLOT_TAKEN' };
      await F.fsSetBooking(booking);
      return { ok: true, id };
    }
    if (conflictCheck(FirebaseMock.bookings)) return { ok: false, error: 'SLOT_TAKEN' };
    FirebaseMock.bookings.push(booking);
    return { ok: true, id };
  }

  /** مدير الصالة يغيّر موعد حجز (الزبون يُعتبر مُبلّغاً). */
  async adminRescheduleBooking(bookingId: string, newDate: string, newTime: string): Promise<{ ok: boolean; error?: string }> {
    if (USE_FIRESTORE_DATA) {
      const list = await F.fsListBookings();
      const index = list.findIndex((b) => b.id === bookingId);
      if (index === -1) return { ok: false, error: 'BOOKING_NOT_FOUND' };
      const b = list[index];
      const conflict = list.some(
        (x) =>
          x.id !== bookingId &&
          x.barberId === b.barberId &&
          x.date === newDate &&
          x.time === newTime &&
          x.status !== 'Rejected'
      );
      if (conflict) return { ok: false, error: 'SLOT_TAKEN' };
      await F.fsPatchBooking(bookingId, {
        date: newDate,
        time: newTime,
        rescheduledByAdminAt: Date.now(),
      });
      return { ok: true };
    }
    const index = FirebaseMock.bookings.findIndex((b) => b.id === bookingId);
    if (index === -1) return { ok: false, error: 'BOOKING_NOT_FOUND' };
    const b = FirebaseMock.bookings[index];
    const conflict = FirebaseMock.bookings.some(
      (x) =>
        x.id !== bookingId &&
        x.barberId === b.barberId &&
        x.date === newDate &&
        x.time === newTime &&
        x.status !== 'Rejected'
    );
    if (conflict) return { ok: false, error: 'SLOT_TAKEN' };
    FirebaseMock.bookings[index] = {
      ...b,
      date: newDate,
      time: newTime,
      rescheduledByAdminAt: Date.now(),
    };
    return { ok: true };
  }

  /** تسجيل تقييم الزبون بعد انتهاء الموعد */
  async updateBookingRating(bookingId: string, rating: number, ratingComment?: string): Promise<{ ok: boolean; error?: string }> {
    const r = Math.min(5, Math.max(1, Math.round(rating)));
    if (USE_FIRESTORE_DATA) {
      const list = await F.fsListBookings();
      if (!list.some((b) => b.id === bookingId)) return { ok: false, error: 'BOOKING_NOT_FOUND' };
      await F.fsPatchBooking(bookingId, { rating: r, ratingComment: ratingComment ?? undefined });
      return { ok: true };
    }
    const index = FirebaseMock.bookings.findIndex((b) => b.id === bookingId);
    if (index === -1) return { ok: false, error: 'BOOKING_NOT_FOUND' };
    FirebaseMock.bookings[index] = {
      ...FirebaseMock.bookings[index],
      rating: r,
      ratingComment: ratingComment ?? undefined,
    };
    return { ok: true };
  }

  async getBranchServices(branchId: string): Promise<BranchService[]> {
    if (USE_FIRESTORE_DATA) {
      return F.fsGetBranchServices(branchId);
    }
    const list = FirebaseMock.branchServices[branchId];
    return list ? [...list] : [];
  }

  async addBranchService(branchId: string, service: Omit<BranchService, 'id'>): Promise<BranchService> {
    const id = 'svc_' + Date.now();
    const newService: BranchService = { ...service, id };
    if (USE_FIRESTORE_DATA) {
      const list = await F.fsGetBranchServices(branchId);
      await F.fsSetBranchServices(branchId, [...list, newService]);
      return newService;
    }
    if (!FirebaseMock.branchServices[branchId]) FirebaseMock.branchServices[branchId] = [];
    const list = FirebaseMock.branchServices[branchId];
    FirebaseMock.branchServices[branchId] = [...list, newService];
    return newService;
  }

  async updateBranchService(branchId: string, serviceId: string, data: Partial<Omit<BranchService, 'id'>>): Promise<boolean> {
    if (USE_FIRESTORE_DATA) {
      const list = await F.fsGetBranchServices(branchId);
      const i = list.findIndex((s) => s.id === serviceId);
      if (i === -1) return false;
      const next = list.map((s, idx) => (idx === i ? { ...s, ...data } : s));
      await F.fsSetBranchServices(branchId, next);
      return true;
    }
    const list = FirebaseMock.branchServices[branchId] || [];
    const i = list.findIndex((s) => s.id === serviceId);
    if (i === -1) return false;
    FirebaseMock.branchServices[branchId] = list.map((s, idx) => (idx === i ? { ...s, ...data } : s));
    return true;
  }

  async deleteBranchService(branchId: string, serviceId: string): Promise<boolean> {
    if (USE_FIRESTORE_DATA) {
      const list = await F.fsGetBranchServices(branchId);
      const filtered = list.filter((s) => s.id !== serviceId);
      if (filtered.length === list.length) return false;
      await F.fsSetBranchServices(branchId, filtered);
      return true;
    }
    const list = FirebaseMock.branchServices[branchId] || [];
    const filtered = list.filter((s) => s.id !== serviceId);
    if (filtered.length === list.length) return false;
    FirebaseMock.branchServices[branchId] = filtered;
    return true;
  }

  private getBookingDateTime(booking: Booking): Date | null {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(booking.date)
      ? new Date(booking.date)
      : (() => {
          const m = booking.date.match(/(\d+)/);
          if (!m) return null;
          const day = parseInt(m[1], 10);
          const now = new Date();
          return new Date(now.getFullYear(), now.getMonth(), day);
        })();
    if (!d || isNaN(d.getTime())) return null;
    const timePart = (booking.time || '').trim().split(/\s+/);
    if (timePart.length < 2) return null;
    const [hm, period] = timePart;
    const [h, min] = hm.split(':').map(x => parseInt(x, 10));
    if (Number.isNaN(h)) return null;
    let hour24 = h;
    if (/^(PM|م)/i.test(period) && h !== 12) hour24 = h + 12;
    if (/^(AM|ص)/i.test(period) && h === 12) hour24 = 0;
    d.setHours(hour24, Number.isNaN(min) ? 0 : min, 0, 0);
    return d;
  }

  async getBookings(userId?: string, barberName?: string): Promise<Booking[]> {
    if (USE_FIRESTORE_DATA) {
      const all = await F.fsListBookings();
      if (barberName) return all.filter((b) => b.barberId === barberName);
      if (userId) return all.filter((b) => b.userId === userId);
      return all;
    }
    if (barberName) return FirebaseMock.bookings.filter((b) => b.barberId === barberName);
    if (userId) return FirebaseMock.bookings.filter((b) => b.userId === userId);
    return [...FirebaseMock.bookings];
  }

  async updateBookingStatus(id: string, status: BookingStatus) {
    if (USE_FIRESTORE_DATA) {
      await F.fsPatchBooking(id, { status });
      return;
    }
    const index = FirebaseMock.bookings.findIndex((x) => x.id === id);
    if (index !== -1) {
      FirebaseMock.bookings[index] = { ...FirebaseMock.bookings[index], status };
    }
  }

  async compressAndUploadReceipt(file: File): Promise<string> {
    if (IS_DEMO_FIREBASE) {
      return URL.createObjectURL(file);
    }

    if (storage) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `receipts/${Date.now()}_${safeName}`;
      try {
        const r = ref(storage, path);
        await uploadBytes(r, file, { contentType: file.type || 'application/octet-stream' });
        const url = await getDownloadURL(r);
        return url;
      } catch {
        return URL.createObjectURL(file);
      }
    }

    return URL.createObjectURL(file);
  }

  // طريقة مساعدة للاختبار: الحصول على مستخدم حسب الدور
  getTestUserByRole(role: 'admin' | 'barber' | 'user'): User | null {
    const users = Array.from(this.users.values());
    return users.find(u => u.role === role) || null;
  }

  async getBarbers(): Promise<User[]> {
    if (USE_FIRESTORE_DATA && db) {
      const q = query(collection(db, 'users'), where('role', '==', 'barber'));
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as User);
    }
    return Array.from(this.users.values()).filter((u) => u.role === 'barber');
  }

  async updateBarber(uid: string, patch: { branchId?: string; disabled?: boolean }): Promise<boolean> {
    const user = this.users.get(uid);
    if (USE_FIRESTORE_DATA && db && !user) {
      const ref = doc(db, 'users', uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) return false;
      await updateDoc(ref, patch);
      return true;
    }
    if (!user) return false;
    this.users.set(uid, { ...user, ...patch });
    if (USE_FIRESTORE_DATA && db) {
      await updateDoc(doc(db, 'users', uid), patch);
    }
    return true;
  }

  // دوال المالية
  async createFinancialRecord(record: Omit<FinancialRecord, 'id' | 'createdAt'>): Promise<string> {
    const id = 'fin_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const newRecord: FinancialRecord = {
      ...record,
      id,
      createdAt: Date.now()
    };
    if (USE_FIRESTORE_DATA) {
      await F.fsAddFinancialRecord(newRecord);
      return id;
    }
    FirebaseMock.financialRecords.push(newRecord);
    return id;
  }

  async getFinancialRecords(branchId?: string, startDate?: string, endDate?: string): Promise<FinancialRecord[]> {
    let records: FinancialRecord[];
    if (USE_FIRESTORE_DATA) {
      records = await F.fsListFinancialRecords();
    } else {
      records = [...FirebaseMock.financialRecords];
    }
    if (branchId) {
      records = records.filter((r) => r.branchId === branchId);
    }
    if (startDate) {
      records = records.filter((r) => r.date >= startDate);
    }
    if (endDate) {
      records = records.filter((r) => r.date <= endDate);
    }
    return records.sort((a, b) => b.createdAt - a.createdAt);
  }

  async getBarberRevenue(barberId: string, period: 'day' | 'week' | 'month' = 'month'): Promise<number> {
    const now = new Date();
    let startDate: Date;
    if (period === 'day') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    const startDateStr = startDate.toISOString().split('T')[0];

    const allBookings = USE_FIRESTORE_DATA ? await F.fsListBookings() : FirebaseMock.bookings;
    const bookings = allBookings.filter(
      (b) => b.barberId === barberId && b.status === 'Approved' && b.date >= startDateStr
    );
    return bookings.reduce((sum, b) => sum + b.amount, 0);
  }

  async calculateProfitLoss(branchId: string, period: 'day' | 'week' | 'month' = 'month'): Promise<{
    revenue: number;
    expenses: number;
    profit: number;
    profitMargin: number;
  }> {
    const now = new Date();
    let startDate: Date;
    if (period === 'day') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    const startDateStr = startDate.toISOString().split('T')[0];

    const records = await this.getFinancialRecords(branchId, startDateStr);
    const revenue = records
      .filter(r => r.type === 'revenue')
      .reduce((sum, r) => sum + r.amount, 0);
    const expenses = records
      .filter(r => r.type === 'expense')
      .reduce((sum, r) => sum + r.amount, 0);
    const profit = revenue - expenses;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return { revenue, expenses, profit, profitMargin };
  }

  async getBarberPerformance(branchId?: string): Promise<Array<{
    barberId: string;
    barberName: string;
    totalBookings: number;
    approvedBookings: number;
    rejectedBookings: number;
    totalRevenue: number;
    acceptanceRate: number;
  }>> {
    const allB = USE_FIRESTORE_DATA ? await F.fsListBookings() : FirebaseMock.bookings;
    const bookings = branchId ? allB.filter((b) => b.branchName === branchId) : allB;

    const barberMap = new Map<string, {
      barberId: string;
      barberName: string;
      totalBookings: number;
      approvedBookings: number;
      rejectedBookings: number;
      totalRevenue: number;
    }>();

    bookings.forEach(b => {
      if (!barberMap.has(b.barberId)) {
        barberMap.set(b.barberId, {
          barberId: b.barberId,
          barberName: b.barberId,
          totalBookings: 0,
          approvedBookings: 0,
          rejectedBookings: 0,
          totalRevenue: 0
        });
      }
      const stats = barberMap.get(b.barberId)!;
      stats.totalBookings++;
      if (b.status === 'Approved') {
        stats.approvedBookings++;
        stats.totalRevenue += b.amount;
      } else if (b.status === 'Rejected') {
        stats.rejectedBookings++;
      }
    });

    return Array.from(barberMap.values()).map(stats => ({
      ...stats,
      acceptanceRate: stats.totalBookings > 0 
        ? (stats.approvedBookings / stats.totalBookings) * 100 
        : 0
    }));
  }

  async createSalary(salary: Salary): Promise<void> {
    if (USE_FIRESTORE_DATA) {
      await F.fsUpsertSalary(salary);
      return;
    }
    const existing = FirebaseMock.salaries.findIndex(
      (s) => s.barberId === salary.barberId && s.branchId === salary.branchId
    );
    if (existing >= 0) {
      FirebaseMock.salaries[existing] = salary;
    } else {
      FirebaseMock.salaries.push(salary);
    }
  }

  async getSalaries(branchId?: string): Promise<Salary[]> {
    if (USE_FIRESTORE_DATA) {
      let list = await F.fsListSalaries();
      if (branchId) list = list.filter((s) => s.branchId === branchId);
      return list;
    }
    if (branchId) {
      return FirebaseMock.salaries.filter((s) => s.branchId === branchId);
    }
    return [...FirebaseMock.salaries];
  }

  // ========== ميزات الزبون ==========
  
  async addFavorite(userId: string, barberId: string, barberName: string): Promise<boolean> {
    if (USE_FIRESTORE_DATA) {
      const list = await F.fsListFavorites(userId);
      if (list.some((f) => f.barberId === barberId)) return false;
      await F.fsAddFavorite({ userId, barberId, barberName, createdAt: Date.now() });
      return true;
    }
    const exists = FirebaseMock.favorites.some((f) => f.userId === userId && f.barberId === barberId);
    if (exists) return false;
    FirebaseMock.favorites.push({ userId, barberId, barberName, createdAt: Date.now() });
    return true;
  }

  async removeFavorite(userId: string, barberId: string): Promise<boolean> {
    if (USE_FIRESTORE_DATA) {
      const list = await F.fsListFavorites(userId);
      if (!list.some((f) => f.barberId === barberId)) return false;
      await F.fsRemoveFavorite(userId, barberId);
      return true;
    }
    const index = FirebaseMock.favorites.findIndex((f) => f.userId === userId && f.barberId === barberId);
    if (index === -1) return false;
    FirebaseMock.favorites.splice(index, 1);
    return true;
  }

  async getFavorites(userId: string): Promise<Favorite[]> {
    if (USE_FIRESTORE_DATA) {
      return F.fsListFavorites(userId);
    }
    return FirebaseMock.favorites.filter((f) => f.userId === userId);
  }

  async isFavorite(userId: string, barberId: string): Promise<boolean> {
    if (USE_FIRESTORE_DATA) {
      const list = await F.fsListFavorites(userId);
      return list.some((f) => f.barberId === barberId);
    }
    return FirebaseMock.favorites.some((f) => f.userId === userId && f.barberId === barberId);
  }

  async getCoupons(branchId?: string): Promise<Coupon[]> {
    const now = Date.now();
    const pool = USE_FIRESTORE_DATA ? await F.fsListCoupons() : FirebaseMock.coupons;
    return pool.filter((c) => {
      if (!c.isActive) return false;
      const validFrom = new Date(c.validFrom).getTime();
      const validTo = new Date(c.validTo).getTime();
      if (now < validFrom || now > validTo) return false;
      if (c.usageLimit && c.usedCount >= c.usageLimit) return false;
      if (branchId && c.branchId && c.branchId !== branchId) return false;
      return true;
    });
  }

  async validateCoupon(code: string, amount: number, branchId?: string): Promise<{ valid: boolean; discount: number; error?: string }> {
    const pool = USE_FIRESTORE_DATA ? await F.fsListCoupons() : FirebaseMock.coupons;
    const coupon = pool.find((c) => c.code.toUpperCase() === code.toUpperCase());
    if (!coupon) return { valid: false, discount: 0, error: 'INVALID_CODE' };
    if (!coupon.isActive) return { valid: false, discount: 0, error: 'INACTIVE' };
    const now = Date.now();
    const validFrom = new Date(coupon.validFrom).getTime();
    const validTo = new Date(coupon.validTo).getTime();
    if (now < validFrom || now > validTo) return { valid: false, discount: 0, error: 'EXPIRED' };
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return { valid: false, discount: 0, error: 'LIMIT_REACHED' };
    if (coupon.minAmount && amount < coupon.minAmount) return { valid: false, discount: 0, error: 'MIN_AMOUNT_NOT_MET' };
    if (branchId && coupon.branchId && coupon.branchId !== branchId) return { valid: false, discount: 0, error: 'BRANCH_MISMATCH' };
    
    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (amount * coupon.discountValue) / 100;
      if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    } else {
      discount = coupon.discountValue;
    }
    return { valid: true, discount };
  }

  async useCoupon(code: string): Promise<boolean> {
    if (USE_FIRESTORE_DATA) {
      return F.fsIncrementCouponUse(code);
    }
    const coupon = FirebaseMock.coupons.find((c) => c.code.toUpperCase() === code.toUpperCase());
    if (!coupon) return false;
    coupon.usedCount++;
    return true;
  }

  async getReferralCode(userId: string): Promise<string> {
    if (USE_FIRESTORE_DATA) {
      let referral = await F.fsGetReferral(userId);
      if (!referral) {
        const code = 'REF' + userId.substring(0, 6).toUpperCase();
        referral = { userId, referralCode: code, referredUsers: [], rewardsEarned: 0, createdAt: Date.now() };
        await F.fsSetReferral(referral);
      }
      return referral.referralCode;
    }
    let referral = FirebaseMock.referrals.find((r) => r.userId === userId);
    if (!referral) {
      const code = 'REF' + userId.substring(0, 6).toUpperCase();
      referral = { userId, referralCode: code, referredUsers: [], rewardsEarned: 0, createdAt: Date.now() };
      FirebaseMock.referrals.push(referral);
    }
    return referral.referralCode;
  }

  async applyReferralCode(code: string, newUserId: string): Promise<{ ok: boolean; error?: string }> {
    if (USE_FIRESTORE_DATA) {
      const all = await F.fsListReferrals();
      const referral = all.find((r) => r.referralCode === code);
      if (!referral) return { ok: false, error: 'INVALID_CODE' };
      if (referral.userId === newUserId) return { ok: false, error: 'SELF_REFERRAL' };
      if (referral.referredUsers.includes(newUserId)) return { ok: false, error: 'ALREADY_USED' };
      const next: Referral = {
        ...referral,
        referredUsers: [...referral.referredUsers, newUserId],
        rewardsEarned: referral.rewardsEarned + 50,
      };
      await F.fsSetReferral(next);
      return { ok: true };
    }
    const referral = FirebaseMock.referrals.find((r) => r.referralCode === code);
    if (!referral) return { ok: false, error: 'INVALID_CODE' };
    if (referral.userId === newUserId) return { ok: false, error: 'SELF_REFERRAL' };
    if (referral.referredUsers.includes(newUserId)) return { ok: false, error: 'ALREADY_USED' };
    referral.referredUsers.push(newUserId);
    referral.rewardsEarned += 50;
    return { ok: true };
  }

  async getPaymentHistory(userId: string): Promise<PaymentHistory[]> {
    if (USE_FIRESTORE_DATA) {
      return (await F.fsListPaymentHistory(userId)).sort((a, b) => b.createdAt - a.createdAt);
    }
    return FirebaseMock.paymentHistory.filter((p) => p.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
  }

  async addPaymentHistory(payment: Omit<PaymentHistory, 'id' | 'createdAt'>): Promise<PaymentHistory> {
    const id = 'pay_' + Date.now();
    const newPayment: PaymentHistory = { ...payment, id, createdAt: Date.now() };
    if (USE_FIRESTORE_DATA) {
      await F.fsAddPaymentHistory(newPayment);
      return newPayment;
    }
    FirebaseMock.paymentHistory.push(newPayment);
    return newPayment;
  }

  async getNotificationSettings(userId: string): Promise<NotificationSettings> {
    const defaults: NotificationSettings = {
      userId,
      enabled: true,
      reminderMinutes: [30, 60, 1440],
      bookingReminders: true,
      promotionalNotifications: true,
    };
    if (USE_FIRESTORE_DATA) {
      const s = await F.fsGetNotificationSettings(userId);
      if (s) return s;
      await F.fsSetNotificationSettings(defaults);
      return defaults;
    }
    let settings = FirebaseMock.notificationSettings.find((s) => s.userId === userId);
    if (!settings) {
      settings = defaults;
      FirebaseMock.notificationSettings.push(settings);
    }
    return settings;
  }

  async updateNotificationSettings(userId: string, updates: Partial<NotificationSettings>): Promise<boolean> {
    if (USE_FIRESTORE_DATA) {
      const cur = await this.getNotificationSettings(userId);
      await F.fsSetNotificationSettings({ ...cur, ...updates, userId });
      return true;
    }
    const index = FirebaseMock.notificationSettings.findIndex((s) => s.userId === userId);
    if (index === -1) {
      FirebaseMock.notificationSettings.push({ userId, ...updates } as NotificationSettings);
    } else {
      FirebaseMock.notificationSettings[index] = { ...FirebaseMock.notificationSettings[index], ...updates };
    }
    return true;
  }

  // ========== ميزات الحلاق ==========

  async setBarberAvailability(barberId: string, status: AvailabilityStatus): Promise<boolean> {
    const availability: BarberAvailability = { barberId, status, updatedAt: Date.now() };
    if (USE_FIRESTORE_DATA) {
      await F.fsSetBarberAvailability(availability);
      return true;
    }
    const index = FirebaseMock.barberAvailability.findIndex((a) => a.barberId === barberId);
    if (index === -1) {
      FirebaseMock.barberAvailability.push(availability);
    } else {
      FirebaseMock.barberAvailability[index] = availability;
    }
    return true;
  }

  async getBarberAvailability(barberId: string): Promise<AvailabilityStatus> {
    if (USE_FIRESTORE_DATA) {
      const a = await F.fsGetBarberAvailability(barberId);
      return a?.status || 'available';
    }
    const availability = FirebaseMock.barberAvailability.find((a) => a.barberId === barberId);
    return availability?.status || 'available';
  }

  async setWorkingHours(barberId: string, hours: WorkingHours['days']): Promise<boolean> {
    const workingHours: WorkingHours = { barberId, days: hours, updatedAt: Date.now() };
    if (USE_FIRESTORE_DATA) {
      await F.fsSetWorkingHours(workingHours);
      return true;
    }
    const index = FirebaseMock.workingHours.findIndex((w) => w.barberId === barberId);
    if (index === -1) {
      FirebaseMock.workingHours.push(workingHours);
    } else {
      FirebaseMock.workingHours[index] = workingHours;
    }
    return true;
  }

  async getWorkingHours(barberId: string): Promise<WorkingHours | null> {
    if (USE_FIRESTORE_DATA) {
      return F.fsGetWorkingHours(barberId);
    }
    return FirebaseMock.workingHours.find((w) => w.barberId === barberId) || null;
  }

  async addCustomerNote(barberId: string, userId: string, userName: string, note: string): Promise<CustomerNote> {
    const id = 'note_' + Date.now();
    const newNote: CustomerNote = { id, barberId, userId, userName, note, createdAt: Date.now() };
    if (USE_FIRESTORE_DATA) {
      await F.fsAddCustomerNote(newNote);
      return newNote;
    }
    FirebaseMock.customerNotes.push(newNote);
    return newNote;
  }

  async getCustomerNotes(barberId: string, userId?: string): Promise<CustomerNote[]> {
    if (USE_FIRESTORE_DATA) {
      let notes = (await F.fsListCustomerNotes()).filter((n) => n.barberId === barberId);
      if (userId) notes = notes.filter((n) => n.userId === userId);
      return notes.sort((a, b) => b.createdAt - a.createdAt);
    }
    let notes = FirebaseMock.customerNotes.filter((n) => n.barberId === barberId);
    if (userId) notes = notes.filter((n) => n.userId === userId);
    return notes.sort((a, b) => b.createdAt - a.createdAt);
  }

  async deleteCustomerNote(noteId: string): Promise<boolean> {
    if (USE_FIRESTORE_DATA) {
      await F.fsDeleteCustomerNote(noteId);
      return true;
    }
    const index = FirebaseMock.customerNotes.findIndex((n) => n.id === noteId);
    if (index === -1) return false;
    FirebaseMock.customerNotes.splice(index, 1);
    return true;
  }

  async addBarberService(barberId: string, service: Omit<BarberService, 'id' | 'barberId' | 'createdAt'>): Promise<BarberService> {
    const id = 'bsvc_' + Date.now();
    const newService: BarberService = { ...service, id, barberId, createdAt: Date.now() };
    if (USE_FIRESTORE_DATA) {
      await F.fsAddBarberService(newService);
      return newService;
    }
    FirebaseMock.barberServices.push(newService);
    return newService;
  }

  async getBarberServices(barberId: string): Promise<BarberService[]> {
    if (USE_FIRESTORE_DATA) {
      const all = await F.fsListBarberServices();
      return all.filter((s) => s.barberId === barberId && s.isActive);
    }
    return FirebaseMock.barberServices.filter((s) => s.barberId === barberId && s.isActive);
  }

  async updateBarberService(serviceId: string, updates: Partial<Omit<BarberService, 'id' | 'barberId' | 'createdAt'>>): Promise<boolean> {
    if (USE_FIRESTORE_DATA) {
      await F.fsPatchBarberService(serviceId, updates);
      return true;
    }
    const index = FirebaseMock.barberServices.findIndex((s) => s.id === serviceId);
    if (index === -1) return false;
    FirebaseMock.barberServices[index] = { ...FirebaseMock.barberServices[index], ...updates };
    return true;
  }

  async deleteBarberService(serviceId: string): Promise<boolean> {
    if (USE_FIRESTORE_DATA) {
      await F.fsPatchBarberService(serviceId, { isActive: false });
      return true;
    }
    const index = FirebaseMock.barberServices.findIndex((s) => s.id === serviceId);
    if (index === -1) return false;
    FirebaseMock.barberServices[index].isActive = false;
    return true;
  }

  async generateBarberReport(barberId: string, period: 'day' | 'week' | 'month', date: string): Promise<BarberReport> {
    const allBookings = USE_FIRESTORE_DATA ? await F.fsListBookings() : FirebaseMock.bookings;
    const bookings = allBookings.filter((b) => b.barberId === barberId);
    const reportDate = new Date(date);
    let filteredBookings: Booking[] = [];
    
    if (period === 'day') {
      filteredBookings = bookings.filter(b => b.date === date);
    } else if (period === 'week') {
      const weekStart = new Date(reportDate);
      weekStart.setDate(reportDate.getDate() - reportDate.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      filteredBookings = bookings.filter(b => {
        const bookingDate = new Date(b.date);
        return bookingDate >= weekStart && bookingDate <= weekEnd;
      });
    } else {
      filteredBookings = bookings.filter(b => {
        const bookingDate = new Date(b.date);
        return bookingDate.getMonth() === reportDate.getMonth() && bookingDate.getFullYear() === reportDate.getFullYear();
      });
    }

    const completedBookings = filteredBookings.filter(b => b.status === 'Approved');
    const cancelledBookings = filteredBookings.filter(b => b.status === 'Rejected');
    const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
    const ratings = completedBookings.filter(b => b.rating).map(b => b.rating!);
    const averageRating = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0;

    // حساب أوقات الذروة
    const hourCounts: Record<string, number> = {};
    completedBookings.forEach(b => {
      const hour = b.time.split(':')[0] + (b.time.includes('PM') && parseInt(b.time) !== 12 ? 12 : 0);
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const peakHours = Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const report: BarberReport = {
      barberId,
      period,
      date,
      totalBookings: filteredBookings.length,
      completedBookings: completedBookings.length,
      cancelledBookings: cancelledBookings.length,
      totalRevenue,
      averageRating,
      peakHours
    };

    if (USE_FIRESTORE_DATA) {
      await F.fsAddBarberReport(report);
    } else {
      FirebaseMock.barberReports.push(report);
    }
    return report;
  }

  // ========== ميزات صاحب الصالة ==========

  async createCoupon(coupon: Omit<Coupon, 'id' | 'usedCount' | 'createdAt'>): Promise<Coupon> {
    const id = 'coupon_' + Date.now();
    const newCoupon: Coupon = { ...coupon, id, usedCount: 0, createdAt: Date.now() };
    if (USE_FIRESTORE_DATA) {
      await F.fsSetCoupon(newCoupon);
      return newCoupon;
    }
    FirebaseMock.coupons.push(newCoupon);
    return newCoupon;
  }

  async updateCoupon(couponId: string, updates: Partial<Omit<Coupon, 'id' | 'createdAt'>>): Promise<boolean> {
    if (USE_FIRESTORE_DATA) {
      await F.fsUpdateCoupon(couponId, updates);
      return true;
    }
    const index = FirebaseMock.coupons.findIndex((c) => c.id === couponId);
    if (index === -1) return false;
    FirebaseMock.coupons[index] = { ...FirebaseMock.coupons[index], ...updates };
    return true;
  }

  async deleteCoupon(couponId: string): Promise<boolean> {
    if (USE_FIRESTORE_DATA) {
      await F.fsDeleteCoupon(couponId);
      return true;
    }
    const index = FirebaseMock.coupons.findIndex((c) => c.id === couponId);
    if (index === -1) return false;
    FirebaseMock.coupons.splice(index, 1);
    return true;
  }

  async getAllCoupons(branchId?: string): Promise<Coupon[]> {
    let coupons = USE_FIRESTORE_DATA ? await F.fsListCoupons() : [...FirebaseMock.coupons];
    if (branchId) coupons = coupons.filter((c) => !c.branchId || c.branchId === branchId);
    return coupons.sort((a, b) => b.createdAt - a.createdAt);
  }

  async createBulkNotification(notification: Omit<BulkNotification, 'id' | 'createdAt'>): Promise<BulkNotification> {
    const id = 'notif_' + Date.now();
    const newNotification: BulkNotification = { ...notification, id, createdAt: Date.now() };
    if (USE_FIRESTORE_DATA) {
      await F.fsCreateBulkNotification(newNotification);
      return newNotification;
    }
    FirebaseMock.bulkNotifications.push(newNotification);
    return newNotification;
  }

  async getBulkNotifications(branchId: string): Promise<BulkNotification[]> {
    if (USE_FIRESTORE_DATA) {
      return F.fsListBulkNotifications(branchId);
    }
    return FirebaseMock.bulkNotifications.filter((n) => n.branchId === branchId).sort((a, b) => b.createdAt - a.createdAt);
  }

  async sendBulkNotification(notificationId: string): Promise<boolean> {
    if (USE_FIRESTORE_DATA) {
      const notification = await F.fsGetBulkNotification(notificationId);
      if (!notification) return false;
      await F.fsPatchBulkNotification(notificationId, { status: 'sent', sentAt: Date.now() });
      return true;
    }
    const notification = FirebaseMock.bulkNotifications.find((n) => n.id === notificationId);
    if (!notification) return false;
    notification.status = 'sent';
    notification.sentAt = Date.now();
    return true;
  }

  async getCustomerAnalytics(branchId: string, period: 'day' | 'week' | 'month' | 'year', date: string): Promise<CustomerAnalytics> {
    const allB = USE_FIRESTORE_DATA ? await F.fsListBookings() : FirebaseMock.bookings;
    const bookings = allB.filter((b) => b.branchName === branchId);
    const reportDate = new Date(date);
    let filteredBookings: Booking[] = [];
    
    if (period === 'day') {
      filteredBookings = bookings.filter(b => b.date === date);
    } else if (period === 'week') {
      const weekStart = new Date(reportDate);
      weekStart.setDate(reportDate.getDate() - reportDate.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      filteredBookings = bookings.filter(b => {
        const bookingDate = new Date(b.date);
        return bookingDate >= weekStart && bookingDate <= weekEnd;
      });
    } else if (period === 'month') {
      filteredBookings = bookings.filter(b => {
        const bookingDate = new Date(b.date);
        return bookingDate.getMonth() === reportDate.getMonth() && bookingDate.getFullYear() === reportDate.getFullYear();
      });
    } else {
      filteredBookings = bookings.filter(b => {
        const bookingDate = new Date(b.date);
        return bookingDate.getFullYear() === reportDate.getFullYear();
      });
    }

    const uniqueUsers = new Set(filteredBookings.map(b => b.userId));
    const totalCustomers = uniqueUsers.size;
    const completedBookings = filteredBookings.filter(b => b.status === 'Approved');
    const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
    const averageBookingValue = completedBookings.length > 0 ? totalRevenue / completedBookings.length : 0;

    // حساب الخدمات الأكثر طلباً
    const serviceCounts: Record<string, { count: number; revenue: number }> = {};
    completedBookings.forEach(b => {
      if (!serviceCounts[b.service]) {
        serviceCounts[b.service] = { count: 0, revenue: 0 };
      }
      serviceCounts[b.service].count++;
      serviceCounts[b.service].revenue += b.amount || 0;
    });
    const topServices = Object.entries(serviceCounts)
      .map(([service, data]) => ({ service, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // حساب العملاء الجدد والعائدين
    const userFirstBooking: Record<string, number> = {};
    filteredBookings.forEach(b => {
      if (!userFirstBooking[b.userId] || b.createdAt < userFirstBooking[b.userId]) {
        userFirstBooking[b.userId] = b.createdAt;
      }
    });
    const periodStart = period === 'day' ? reportDate.getTime() : 
                       period === 'week' ? new Date(reportDate.setDate(reportDate.getDate() - reportDate.getDay())).getTime() :
                       period === 'month' ? new Date(reportDate.getFullYear(), reportDate.getMonth(), 1).getTime() :
                       new Date(reportDate.getFullYear(), 0, 1).getTime();
    const newCustomers = Object.values(userFirstBooking).filter(ts => ts >= periodStart).length;
    const returningCustomers = totalCustomers - newCustomers;

    // حساب معدل الاحتفاظ (مبسط)
    const previousPeriodBookings = bookings.filter(b => {
      const bookingDate = new Date(b.date);
      const prevDate = new Date(reportDate);
      if (period === 'day') prevDate.setDate(prevDate.getDate() - 1);
      else if (period === 'week') prevDate.setDate(prevDate.getDate() - 7);
      else if (period === 'month') prevDate.setMonth(prevDate.getMonth() - 1);
      else prevDate.setFullYear(prevDate.getFullYear() - 1);
      return bookingDate >= prevDate && bookingDate < reportDate;
    });
    const previousUsers = new Set(previousPeriodBookings.map(b => b.userId));
    const retainedUsers = Array.from(uniqueUsers).filter(uid => previousUsers.has(uid)).length;
    const customerRetentionRate = previousUsers.size > 0 ? (retainedUsers / previousUsers.size) * 100 : 0;

    return {
      branchId,
      period,
      date,
      totalCustomers,
      newCustomers,
      returningCustomers,
      averageBookingValue,
      topServices,
      customerRetentionRate
    };
  }

  async getBranchSettings(branchId: string): Promise<BranchSettings | null> {
    if (USE_FIRESTORE_DATA) {
      return F.fsGetBranchSettings(branchId);
    }
    return FirebaseMock.branchSettings.find((s) => s.branchId === branchId) || null;
  }

  async updateBranchSettings(branchId: string, settings: Partial<BranchSettings>): Promise<boolean> {
    const updatedSettings: BranchSettings = {
      branchId,
      name: settings.name || '',
      location: settings.location || '',
      phone: settings.phone || '',
      images: settings.images || [],
      bookingRules: settings.bookingRules || {
        advanceBookingDays: 30,
        cancellationHours: 24,
        rescheduleLimit: 1,
        minBookingGap: 30
      },
      operatingHours: settings.operatingHours || {},
      updatedAt: Date.now(),
      ...settings
    };
    if (USE_FIRESTORE_DATA) {
      await F.fsSetBranchSettings(updatedSettings);
      return true;
    }
    const index = FirebaseMock.branchSettings.findIndex((s) => s.branchId === branchId);
    if (index === -1) {
      FirebaseMock.branchSettings.push(updatedSettings);
    } else {
      FirebaseMock.branchSettings[index] = updatedSettings;
    }
    return true;
  }

  async exportFinancialReport(branchId: string, format: 'pdf' | 'excel', period: 'month' | 'year'): Promise<string> {
    const records = USE_FIRESTORE_DATA
      ? (await F.fsListFinancialRecords()).filter((r) => r.branchId === branchId)
      : FirebaseMock.financialRecords.filter((r) => r.branchId === branchId);
    const reportData = {
      branchId,
      period,
      records,
      totalRevenue: records.filter((r) => r.type === 'revenue').reduce((sum, r) => sum + r.amount, 0),
      totalExpenses: records.filter((r) => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0),
      generatedAt: new Date().toISOString()
    };
    return JSON.stringify(reportData);
  }

  async backupData(branchId?: string): Promise<BackupData> {
    if (USE_FIRESTORE_DATA) {
      const allBookings = await F.fsListBookings();
      const allFin = await F.fsListFinancialRecords();
      const allCoupons = await F.fsListCoupons();
      const allBranchSettings = await F.fsListBranchSettings();
      const branchServices: Record<string, BranchService[]> = {};
      const catalogIds = branchId ? [branchId] : await F.fsListBranchCatalogIds();
      const branchIds =
        catalogIds.length > 0 ? catalogIds : ['Olaya Main', 'Tahlia Branch', 'Nakheel Mall'];
      for (const bid of branchIds) {
        branchServices[bid] = await F.fsGetBranchServices(bid);
      }
      return {
        version: '1.0',
        timestamp: Date.now(),
        bookings: branchId ? allBookings.filter((b) => b.branchName === branchId) : allBookings,
        users: Array.from(this.users.values()),
        financialRecords: branchId ? allFin.filter((r) => r.branchId === branchId) : allFin,
        branchServices: branchId ? { [branchId]: branchServices[branchId] || [] } : branchServices,
        coupons: branchId ? allCoupons.filter((c) => !c.branchId || c.branchId === branchId) : allCoupons,
        branchSettings: branchId ? allBranchSettings.filter((s) => s.branchId === branchId) : allBranchSettings
      };
    }
    const backup: BackupData = {
      version: '1.0',
      timestamp: Date.now(),
      bookings: branchId ? FirebaseMock.bookings.filter((b) => b.branchName === branchId) : FirebaseMock.bookings,
      users: Array.from(this.users.values()),
      financialRecords: branchId ? FirebaseMock.financialRecords.filter((r) => r.branchId === branchId) : FirebaseMock.financialRecords,
      branchServices: branchId ? { [branchId]: FirebaseMock.branchServices[branchId] || [] } : FirebaseMock.branchServices,
      coupons: branchId ? FirebaseMock.coupons.filter((c) => !c.branchId || c.branchId === branchId) : FirebaseMock.coupons,
      branchSettings: branchId ? FirebaseMock.branchSettings.filter((s) => s.branchId === branchId) : FirebaseMock.branchSettings
    };
    return backup;
  }

  async restoreData(backup: BackupData): Promise<boolean> {
    try {
      if (USE_FIRESTORE_DATA) {
        await F.fsRestoreFromBackup({
          bookings: backup.bookings,
          financialRecords: backup.financialRecords,
          branchServices: backup.branchServices,
          coupons: backup.coupons,
          branchSettings: backup.branchSettings
        });
        if (backup.users) backup.users.forEach((u) => this.users.set(u.uid, u));
        return true;
      }
      if (backup.bookings) FirebaseMock.bookings = backup.bookings;
      if (backup.users) backup.users.forEach((u) => this.users.set(u.uid, u));
      if (backup.financialRecords) FirebaseMock.financialRecords = backup.financialRecords;
      if (backup.branchServices) FirebaseMock.branchServices = { ...FirebaseMock.branchServices, ...backup.branchServices };
      if (backup.coupons) FirebaseMock.coupons = backup.coupons;
      if (backup.branchSettings) FirebaseMock.branchSettings = backup.branchSettings;
      return true;
    } catch (error) {
      console.error('خطأ في استعادة البيانات:', error);
      return false;
    }
  }
}

export const firebase = new FirebaseMock();
