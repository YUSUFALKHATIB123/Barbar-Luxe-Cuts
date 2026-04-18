
import { Booking } from '../types';

export class NotificationService {
  private static scheduledNotifications: Map<string, NodeJS.Timeout> = new Map();
  private static notificationPermission: NotificationPermission = 'default';

  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.notificationPermission = 'granted';
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.notificationPermission = permission;
      return permission === 'granted';
    }

    return false;
  }

  static scheduleBookingNotifications(booking: Booking): void {
    if (!this.notificationPermission || this.notificationPermission !== 'granted') {
      return;
    }

    // إلغاء أي إشعارات سابقة لهذا الحجز
    this.cancelBookingNotifications(booking.id);

    const [dateStr, timeStr] = [booking.date, booking.time];
    const bookingDate = new Date(dateStr);
    const [time, period] = timeStr.split(' ');
    const [hours, minutes] = time.split(':');
    let hour24 = parseInt(hours);
    if (period === 'PM' && hour24 !== 12) hour24 += 12;
    if (period === 'AM' && hour24 === 12) hour24 = 0;
    
    bookingDate.setHours(hour24, parseInt(minutes), 0, 0);
    const now = new Date();
    const bookingTime = bookingDate.getTime();
    const currentTime = now.getTime();

    // إشعار قبل 30 دقيقة
    const thirtyMinutesBefore = bookingTime - (30 * 60 * 1000);
    if (thirtyMinutesBefore > currentTime) {
      const delay30 = thirtyMinutesBefore - currentTime;
      const timeout30 = setTimeout(() => {
        this.showNotification(
          'تذكير بالموعد',
          `موعدك مع ${booking.barberId} بعد 30 دقيقة في ${booking.branchName}`,
          booking.id
        );
      }, delay30);
      this.scheduledNotifications.set(`${booking.id}_30min`, timeout30);
    }

    // إشعار عند الدور (نفس وقت الموعد)
    if (bookingTime > currentTime) {
      const delayNow = bookingTime - currentTime;
      const timeoutNow = setTimeout(() => {
        this.showNotification(
          'حان موعدك',
          `موعدك الآن مع ${booking.barberId} في ${booking.branchName}`,
          booking.id
        );
      }, delayNow);
      this.scheduledNotifications.set(`${booking.id}_now`, timeoutNow);
    }
  }

  static cancelBookingNotifications(bookingId: string): void {
    const keys30 = `${bookingId}_30min`;
    const keysNow = `${bookingId}_now`;
    
    if (this.scheduledNotifications.has(keys30)) {
      clearTimeout(this.scheduledNotifications.get(keys30)!);
      this.scheduledNotifications.delete(keys30);
    }
    if (this.scheduledNotifications.has(keysNow)) {
      clearTimeout(this.scheduledNotifications.get(keysNow)!);
      this.scheduledNotifications.delete(keysNow);
    }
  }

  private static showNotification(title: string, body: string, tag: string): void {
    if (this.notificationPermission !== 'granted') return;

    try {
      new Notification(title, {
        body,
        tag,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: false,
      });
    } catch (error) {
      console.warn('Failed to show notification:', error);
    }
  }

  static async initializeForUser(userId: string): Promise<void> {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      console.log('Notification permission not granted');
      return;
    }

    // جلب حجوزات المستخدم القادمة وجدولة الإشعارات
    const { firebase } = await import('./FirebaseMock');
    const bookings = await firebase.getBookings(userId);
    const upcomingBookings = bookings.filter(b => {
      const [dateStr, timeStr] = [b.date, b.time];
      const bookingDate = new Date(dateStr);
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':');
      let hour24 = parseInt(hours);
      if (period === 'PM' && hour24 !== 12) hour24 += 12;
      if (period === 'AM' && hour24 === 12) hour24 = 0;
      bookingDate.setHours(hour24, parseInt(minutes), 0, 0);
      return bookingDate > new Date() && b.status === 'Approved';
    });

    upcomingBookings.forEach(booking => {
      this.scheduleBookingNotifications(booking);
    });
  }

  static clearAll(): void {
    this.scheduledNotifications.forEach(timeout => clearTimeout(timeout));
    this.scheduledNotifications.clear();
  }
}
