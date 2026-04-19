
export enum Screen {
  Splash = 'SPLASH',
  Onboarding = 'ONBOARDING',
  Auth = 'AUTH',
  ProfileSetup = 'PROFILE_SETUP',
  Home = 'HOME',
  BarberProfile = 'BARBER_PROFILE',
  Payment = 'PAYMENT',
  Confirmation = 'CONFIRMATION',
  Settings = 'SETTINGS',
  BarberDashboard = 'BARBER_DASHBOARD',
  BranchManagerDashboard = 'BRANCH_MANAGER_DASHBOARD',
  BookingHistory = 'BOOKING_HISTORY'
}

export type Role = 'user' | 'admin' | 'barber';

export interface User {
  uid: string;
  name: string;
  phone: string;
  email: string;
  role: Role;
  avatar?: string;
  branchId?: string; // للحلاقين المرتبطين بفرع معين
  disabled?: boolean; // تعطيل حساب الحلاق من مدير الصالة
}

export type BookingStatus = 'Pending' | 'Approved' | 'Rejected';

export interface Booking {
  id: string;
  userId: string;
  userName: string;
  barberId: string; // اسم الحلاق
  branchName: string;
  service: string;
  date: string;
  time: string;
  status: BookingStatus;
  receiptUrl?: string;
  amount: number;
  createdAt: number;
  /** عدد مرات إعادة الجدولة التي استخدمها الزبون (0 أو 1) */
  rescheduleCount?: number;
  /** وقت آخر تعديل من مدير الصالة (لإظهار إشعار للزبون) */
  rescheduledByAdminAt?: number;
  /** رقم جوال الزبون (للحجوزات المضافة من الحلاق) */
  userPhone?: string;
  /** تقييم الزبون 1–5 بعد انتهاء الموعد */
  rating?: number;
  /** تعليق الزبون مع التقييم */
  ratingComment?: string;
}

export interface Branch {
  id: string;
  name: string;
  location: string;
  image: string;
}

export interface BranchService {
  id: string;
  nameAr: string;
  nameEn: string;
  price: number;
}

export interface FinancialRecord {
  id: string;
  type: 'revenue' | 'expense';
  category: 'rent' | 'utilities' | 'salary' | 'supplies' | 'maintenance' | 'service';
  amount: number;
  date: string;
  description: string;
  branchId?: string;
  barberId?: string; // للإيرادات
  createdAt: number;
}

export interface Salary {
  barberId: string;
  barberName: string;
  monthlyAmount: number;
  paidDate?: string;
  branchId: string;
}

// ميزات جديدة للزبون
export interface Favorite {
  userId: string;
  barberId: string;
  barberName: string;
  createdAt: number;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minAmount?: number;
  maxDiscount?: number;
  validFrom: string;
  validTo: string;
  usageLimit?: number;
  usedCount: number;
  branchId?: string;
  isActive: boolean;
  createdAt: number;
}

export interface Referral {
  userId: string;
  referralCode: string;
  referredUsers: string[];
  rewardsEarned: number;
  createdAt: number;
}

export interface PaymentHistory {
  id: string;
  userId: string;
  bookingId: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'online';
  status: 'completed' | 'pending' | 'failed';
  date: string;
  createdAt: number;
}

export interface NotificationSettings {
  userId: string;
  enabled: boolean;
  reminderMinutes: number[]; // [30, 60, 1440] = 30 دقيقة، ساعة، يوم
  bookingReminders: boolean;
  promotionalNotifications: boolean;
}

// ميزات جديدة للحلاق
export type AvailabilityStatus = 'available' | 'busy' | 'unavailable';

export interface BarberAvailability {
  barberId: string;
  status: AvailabilityStatus;
  updatedAt: number;
}

export interface WorkingHours {
  barberId: string;
  days: {
    [key: string]: { // 'monday', 'tuesday', etc.
      enabled: boolean;
      startTime: string; // '09:00'
      endTime: string; // '18:00'
      breaks?: Array<{ start: string; end: string }>;
    };
  };
  updatedAt: number;
}

export interface CustomerNote {
  id: string;
  barberId: string;
  userId: string;
  userName: string;
  note: string;
  createdAt: number;
}

export interface BarberService {
  id: string;
  barberId: string;
  nameAr: string;
  nameEn: string;
  price: number;
  duration: number; // بالدقائق
  isActive: boolean;
  createdAt: number;
}

export interface BarberReport {
  barberId: string;
  period: 'day' | 'week' | 'month';
  date: string;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  averageRating: number;
  peakHours: Array<{ hour: string; count: number }>;
}

// ميزات جديدة لصاحب الصالة
export interface BulkNotification {
  id: string;
  branchId: string;
  title: string;
  message: string;
  targetAudience: 'all' | 'customers' | 'barbers' | 'specific';
  targetUserIds?: string[];
  sentAt?: number;
  scheduledFor?: number;
  status: 'draft' | 'scheduled' | 'sent';
  createdAt: number;
}

export interface CustomerAnalytics {
  branchId: string;
  period: 'day' | 'week' | 'month' | 'year';
  date: string;
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  averageBookingValue: number;
  topServices: Array<{ service: string; count: number; revenue: number }>;
  customerRetentionRate: number;
}

export interface BranchSettings {
  branchId: string;
  name: string;
  nameAr?: string;
  location: string;
  locationAr?: string;
  phone: string;
  email?: string;
  images: string[];
  bookingRules: {
    advanceBookingDays: number;
    cancellationHours: number;
    rescheduleLimit: number;
    minBookingGap: number; // بالدقائق
  };
  operatingHours: {
    [key: string]: { start: string; end: string; closed: boolean };
  };
  updatedAt: number;
}

export interface BackupData {
  version: string;
  timestamp: number;
  bookings: Booking[];
  users: User[];
  financialRecords: FinancialRecord[];
  branchServices: Record<string, BranchService[]>;
  coupons: Coupon[];
  branchSettings: BranchSettings[];
}
