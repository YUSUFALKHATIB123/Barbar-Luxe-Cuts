
import { Booking } from '../types';

export class CalendarService {
  static isIOS(): boolean {
    if (typeof window === 'undefined') return false;
    return /iPhone|iPad|iPod/i.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  static addToCalendar(booking: Booking): void {
    // كشف المنصة: iOS يستخدم ICS، Android/Desktop يستخدم Google Calendar
    if (this.isIOS()) {
      // iOS: تنزيل ملف ICS
      this.downloadICS(booking);
    } else {
      // Android/Desktop: فتح Google Calendar
      const [dateStr, timeStr] = [booking.date, booking.time];
      const date = new Date(dateStr);
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':');
      let hour24 = parseInt(hours);
      if (period === 'PM' && hour24 !== 12) hour24 += 12;
      if (period === 'AM' && hour24 === 12) hour24 = 0;
      
      date.setHours(hour24, parseInt(minutes), 0, 0);
      const endDate = new Date(date);
      endDate.setHours(hour24 + 1, parseInt(minutes), 0, 0);

      const startISO = date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const endISO = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      const title = encodeURIComponent(`${booking.barberId} - ${booking.service}`);
      const description = encodeURIComponent(
        `Service: ${booking.service}\nBarber: ${booking.barberId}\nBranch: ${booking.branchName}`
      );
      const location = encodeURIComponent(booking.branchName);

      const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startISO}/${endISO}&details=${description}&location=${location}`;
      
      window.open(googleUrl, '_blank');
    }
  }

  static generateICS(booking: Booking): string {
    const [dateStr, timeStr] = [booking.date, booking.time];
    const date = new Date(dateStr);
    const [time, period] = timeStr.split(' ');
    const [hours, minutes] = time.split(':');
    let hour24 = parseInt(hours);
    if (period === 'PM' && hour24 !== 12) hour24 += 12;
    if (period === 'AM' && hour24 === 12) hour24 = 0;
    
    date.setHours(hour24, parseInt(minutes), 0, 0);
    const endDate = new Date(date);
    endDate.setHours(hour24 + 1, parseInt(minutes), 0, 0);

    const formatICSDate = (d: Date) => {
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Luxe Cuts//Booking//EN
BEGIN:VEVENT
UID:${booking.id}@luxecuts.com
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(date)}
DTEND:${formatICSDate(endDate)}
SUMMARY:${booking.barberId} - ${booking.service}
DESCRIPTION:Service: ${booking.service}\\nBarber: ${booking.barberId}\\nBranch: ${booking.branchName}
LOCATION:${booking.branchName}
END:VEVENT
END:VCALENDAR`;
  }

  static downloadICS(booking: Booking): void {
    const icsContent = this.generateICS(booking);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `booking-${booking.id}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
