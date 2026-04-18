/**
 * Firestore persistence for Luxe Cuts when real Firebase config is used (not demo placeholder).
 * Collection layout is stable — document IDs match in-app ids where applicable.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import type {
  Booking,
  BranchService,
  BranchSettings,
  BulkNotification,
  BarberAvailability,
  BarberReport,
  BarberService,
  Coupon,
  CustomerNote,
  Favorite,
  FinancialRecord,
  NotificationSettings,
  PaymentHistory,
  Referral,
  Salary,
  WorkingHours,
} from '../types';

const C = {
  bookings: 'bookings',
  favorites: 'favorites',
  coupons: 'coupons',
  financialRecords: 'financialRecords',
  branchCatalog: 'branchCatalog',
  salaries: 'salaries',
  referrals: 'referrals',
  paymentHistory: 'paymentHistory',
  notificationSettings: 'notificationSettings',
  barberAvailability: 'barberAvailability',
  workingHours: 'workingHours',
  customerNotes: 'customerNotes',
  barberServices: 'barberServices',
  barberReports: 'barberReports',
  bulkNotifications: 'bulkNotifications',
  branchSettings: 'branchSettings',
} as const;

function favDocId(userId: string, barberId: string) {
  return `${userId}__${barberId.replace(/\//g, '_')}`;
}

function salaryDocId(barberId: string, branchId: string) {
  return `${barberId}__${branchId.replace(/\//g, '_')}`;
}

/** Firestore rejects undefined field values */
function forFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data)) as T;
}

export async function fsListBookings(): Promise<Booking[]> {
  const snap = await getDocs(collection(db, C.bookings));
  return snap.docs.map((d) => {
    const data = d.data() as Booking;
    return { ...data, id: data.id || d.id };
  });
}

export async function fsSetBooking(b: Booking): Promise<void> {
  const ref = doc(db, C.bookings, b.id);
  await setDoc(ref, forFirestore({ ...b, id: b.id }));
}

export async function fsPatchBooking(id: string, patch: Partial<Booking>): Promise<void> {
  const ref = doc(db, C.bookings, id);
  await updateDoc(ref, forFirestore(patch));
}

export async function fsListFavorites(userId: string): Promise<Favorite[]> {
  const q = query(collection(db, C.favorites), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Favorite);
}

export async function fsAddFavorite(f: Favorite): Promise<void> {
  const id = favDocId(f.userId, f.barberId);
  await setDoc(doc(db, C.favorites, id), f);
}

export async function fsRemoveFavorite(userId: string, barberId: string): Promise<void> {
  await deleteDoc(doc(db, C.favorites, favDocId(userId, barberId)));
}

export async function fsListCoupons(): Promise<Coupon[]> {
  const snap = await getDocs(collection(db, C.coupons));
  return snap.docs.map((d) => {
    const data = d.data() as Coupon;
    return { ...data, id: data.id || d.id };
  });
}

export async function fsSetCoupon(c: Coupon): Promise<void> {
  await setDoc(doc(db, C.coupons, c.id), forFirestore({ ...c, id: c.id }));
}

export async function fsUpdateCoupon(id: string, patch: Partial<Coupon>): Promise<void> {
  await updateDoc(doc(db, C.coupons, id), forFirestore(patch));
}

export async function fsDeleteCoupon(id: string): Promise<void> {
  await deleteDoc(doc(db, C.coupons, id));
}

export async function fsIncrementCouponUse(code: string): Promise<boolean> {
  const all = await fsListCoupons();
  const coupon = all.find((c) => c.code.toUpperCase() === code.toUpperCase());
  if (!coupon) return false;
  const docRef = doc(db, C.coupons, coupon.id);
  await runTransaction(db, async (t) => {
    const cur = await t.get(docRef);
    const data = cur.data() as Coupon;
    t.update(docRef, { usedCount: (data.usedCount ?? 0) + 1 });
  });
  return true;
}

export async function fsListFinancialRecords(): Promise<FinancialRecord[]> {
  const snap = await getDocs(collection(db, C.financialRecords));
  return snap.docs.map((d) => {
    const data = d.data() as FinancialRecord;
    return { ...data, id: data.id || d.id };
  });
}

export async function fsAddFinancialRecord(r: FinancialRecord): Promise<void> {
  await setDoc(doc(db, C.financialRecords, r.id), forFirestore(r));
}

export async function fsListBranchCatalogIds(): Promise<string[]> {
  const snap = await getDocs(collection(db, C.branchCatalog));
  return snap.docs.map((d) => d.id);
}

export async function fsGetBranchServices(branchId: string): Promise<BranchService[]> {
  const ref = doc(db, C.branchCatalog, branchId);
  const s = await getDoc(ref);
  if (!s.exists()) return [];
  const data = s.data() as { services?: BranchService[] };
  return data.services ? [...data.services] : [];
}

export async function fsSetBranchServices(branchId: string, services: BranchService[]): Promise<void> {
  await setDoc(doc(db, C.branchCatalog, branchId), { services }, { merge: true });
}

export async function fsListSalaries(): Promise<Salary[]> {
  const snap = await getDocs(collection(db, C.salaries));
  return snap.docs.map((d) => d.data() as Salary);
}

export async function fsUpsertSalary(s: Salary): Promise<void> {
  const id = salaryDocId(s.barberId, s.branchId);
  await setDoc(doc(db, C.salaries, id), s);
}

export async function fsGetReferral(userId: string): Promise<Referral | null> {
  const s = await getDoc(doc(db, C.referrals, userId));
  if (!s.exists()) return null;
  return s.data() as Referral;
}

export async function fsSetReferral(r: Referral): Promise<void> {
  await setDoc(doc(db, C.referrals, r.userId), r);
}

export async function fsListReferrals(): Promise<Referral[]> {
  const snap = await getDocs(collection(db, C.referrals));
  return snap.docs.map((d) => d.data() as Referral);
}

export async function fsListPaymentHistory(userId: string): Promise<PaymentHistory[]> {
  const q = query(collection(db, C.paymentHistory), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as PaymentHistory;
    return { ...data, id: data.id || d.id };
  });
}

export async function fsAddPaymentHistory(p: PaymentHistory): Promise<void> {
  await setDoc(doc(db, C.paymentHistory, p.id), p);
}

export async function fsGetNotificationSettings(userId: string): Promise<NotificationSettings | null> {
  const s = await getDoc(doc(db, C.notificationSettings, userId));
  if (!s.exists()) return null;
  return s.data() as NotificationSettings;
}

export async function fsSetNotificationSettings(s: NotificationSettings): Promise<void> {
  await setDoc(doc(db, C.notificationSettings, s.userId), s);
}

export async function fsSetBarberAvailability(a: BarberAvailability): Promise<void> {
  await setDoc(doc(db, C.barberAvailability, a.barberId), a);
}

export async function fsGetBarberAvailability(barberId: string): Promise<BarberAvailability | null> {
  const s = await getDoc(doc(db, C.barberAvailability, barberId));
  if (!s.exists()) return null;
  return s.data() as BarberAvailability;
}

export async function fsListBarberAvailability(): Promise<BarberAvailability[]> {
  const snap = await getDocs(collection(db, C.barberAvailability));
  return snap.docs.map((d) => d.data() as BarberAvailability);
}

export async function fsSetWorkingHours(w: WorkingHours): Promise<void> {
  await setDoc(doc(db, C.workingHours, w.barberId), w);
}

export async function fsGetWorkingHours(barberId: string): Promise<WorkingHours | null> {
  const s = await getDoc(doc(db, C.workingHours, barberId));
  if (!s.exists()) return null;
  return s.data() as WorkingHours;
}

export async function fsListWorkingHours(): Promise<WorkingHours[]> {
  const snap = await getDocs(collection(db, C.workingHours));
  return snap.docs.map((d) => d.data() as WorkingHours);
}

export async function fsAddCustomerNote(n: CustomerNote): Promise<void> {
  await setDoc(doc(db, C.customerNotes, n.id), n);
}

export async function fsListCustomerNotes(): Promise<CustomerNote[]> {
  const snap = await getDocs(collection(db, C.customerNotes));
  return snap.docs.map((d) => {
    const data = d.data() as CustomerNote;
    return { ...data, id: data.id || d.id };
  });
}

export async function fsDeleteCustomerNote(noteId: string): Promise<void> {
  await deleteDoc(doc(db, C.customerNotes, noteId));
}

export async function fsAddBarberService(s: BarberService): Promise<void> {
  await setDoc(doc(db, C.barberServices, s.id), s);
}

export async function fsListBarberServices(): Promise<BarberService[]> {
  const snap = await getDocs(collection(db, C.barberServices));
  return snap.docs.map((d) => {
    const data = d.data() as BarberService;
    return { ...data, id: data.id || d.id };
  });
}

export async function fsPatchBarberService(id: string, patch: Partial<BarberService>): Promise<void> {
  await updateDoc(doc(db, C.barberServices, id), forFirestore(patch));
}

export async function fsAddBarberReport(r: BarberReport): Promise<void> {
  const id = `rep_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  await setDoc(doc(db, C.barberReports, id), { ...r, _id: id });
}

export async function fsCreateBulkNotification(n: BulkNotification): Promise<void> {
  await setDoc(doc(db, C.bulkNotifications, n.id), forFirestore(n));
}

export async function fsGetBulkNotification(id: string): Promise<BulkNotification | null> {
  const s = await getDoc(doc(db, C.bulkNotifications, id));
  if (!s.exists()) return null;
  const data = s.data() as BulkNotification;
  return { ...data, id: data.id || id };
}

export async function fsListBulkNotifications(branchId: string): Promise<BulkNotification[]> {
  const q = query(collection(db, C.bulkNotifications), where('branchId', '==', branchId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as BulkNotification;
    return { ...data, id: data.id || d.id };
  });
}

export async function fsPatchBulkNotification(id: string, patch: Partial<BulkNotification>): Promise<void> {
  await updateDoc(doc(db, C.bulkNotifications, id), forFirestore(patch));
}

export async function fsGetBranchSettings(branchId: string): Promise<BranchSettings | null> {
  const s = await getDoc(doc(db, C.branchSettings, branchId));
  if (!s.exists()) return null;
  return s.data() as BranchSettings;
}

export async function fsSetBranchSettings(s: BranchSettings): Promise<void> {
  await setDoc(doc(db, C.branchSettings, s.branchId), s);
}

export async function fsListBranchSettings(): Promise<BranchSettings[]> {
  const snap = await getDocs(collection(db, C.branchSettings));
  return snap.docs.map((d) => d.data() as BranchSettings);
}

/** Replace in-memory backup restore for cloud */
export async function fsRestoreFromBackup(data: {
  bookings?: Booking[];
  financialRecords?: FinancialRecord[];
  branchServices?: Record<string, BranchService[]>;
  coupons?: Coupon[];
  branchSettings?: BranchSettings[];
}): Promise<void> {
  if (data.bookings) {
    for (const b of data.bookings) {
      await setDoc(doc(db, C.bookings, b.id), forFirestore({ ...b, id: b.id }));
    }
  }
  if (data.financialRecords) {
    for (const r of data.financialRecords) {
      await setDoc(doc(db, C.financialRecords, r.id), forFirestore(r));
    }
  }
  if (data.branchServices) {
    for (const [branchId, services] of Object.entries(data.branchServices)) {
      await setDoc(doc(db, C.branchCatalog, branchId), { services }, { merge: true });
    }
  }
  if (data.coupons) {
    for (const c of data.coupons) {
      await setDoc(doc(db, C.coupons, c.id), forFirestore({ ...c, id: c.id }));
    }
  }
  if (data.branchSettings) {
    for (const s of data.branchSettings) {
      await setDoc(doc(db, C.branchSettings, s.branchId), forFirestore(s));
    }
  }
}

export async function fsGetCouponByCode(code: string): Promise<Coupon | null> {
  const all = await fsListCoupons();
  return all.find((c) => c.code.toUpperCase() === code.toUpperCase()) ?? null;
}
