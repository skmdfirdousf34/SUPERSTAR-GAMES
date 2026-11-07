/**
 * Pure IST (Indian Standard Time, Asia/Kolkata, UTC+5:30) Banking Operating Hours
 *
 * Operational Schedule:
 * - Monday to Friday: 9:00 AM – 9:00 PM IST
 * - Saturday: 9:00 AM – 4:00 PM IST
 * - Sunday: Completely Closed (No Recharges & No Withdrawals)
 */

export interface BankingHoursStatus {
  isOpen: boolean;
  currentDay: string;
  currentISTTime: string;
  message: string;
  nextOpeningText: string;
  schedule: {
    mon_fri: string;
    sat: string;
    sun: string;
  };
}

export function getISTDate(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 3600000 * 5.5); // Fixed UTC + 5:30 (IST)
}

export function getClientBankingHours(): BankingHoursStatus {
  const istDate = getISTDate();
  const day = istDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const currentDay = dayNames[day];

  // Format 12-hour IST time
  const hour12 = hours % 12 || 12;
  const ampm = hours < 12 ? "AM" : "PM";
  const minutePad = minutes.toString().padStart(2, "0");
  const currentISTTime = `${hour12}:${minutePad} ${ampm} IST`;

  const schedule = {
    mon_fri: "Monday – Friday: 9:00 AM – 9:00 PM IST",
    sat: "Saturday: 9:00 AM – 4:00 PM IST",
    sun: "Sunday: Closed (No Recharges & Withdrawals)",
  };

  // 1. Sunday: Fully Closed all day
  if (day === 0) {
    return {
      isOpen: false,
      currentDay,
      currentISTTime,
      message: "Banking Services Closed: Recharges & Withdrawals are closed on Sundays. Desk reopens Monday at 9:00 AM IST.",
      nextOpeningText: "Monday at 9:00 AM IST",
      schedule,
    };
  }

  // 2. Saturday: 9:00 AM (540 mins) to 4:00 PM (960 mins)
  if (day === 6) {
    const openTime = 9 * 60; // 09:00 AM
    const closeTime = 16 * 60; // 04:00 PM (16:00)

    if (currentMinutes < openTime) {
      return {
        isOpen: false,
        currentDay,
        currentISTTime,
        message: "Saturday Banking Hours are 9:00 AM to 4:00 PM IST. Recharges and withdrawals are currently closed.",
        nextOpeningText: "Today (Saturday) at 9:00 AM IST",
        schedule,
      };
    }

    if (currentMinutes >= closeTime) {
      return {
        isOpen: false,
        currentDay,
        currentISTTime,
        message: "Saturday Banking Hours (9:00 AM – 4:00 PM IST) have ended for today. Desk reopens Monday at 9:00 AM IST (Sunday is closed).",
        nextOpeningText: "Monday at 9:00 AM IST",
        schedule,
      };
    }

    return {
      isOpen: true,
      currentDay,
      currentISTTime,
      message: "Banking Services Open (Saturday 9:00 AM – 4:00 PM IST)",
      nextOpeningText: "Open Now until 4:00 PM IST",
      schedule,
    };
  }

  // 3. Monday to Friday: 9:00 AM (540 mins) to 9:00 PM (1260 mins)
  const openTime = 9 * 60; // 09:00 AM
  const closeTime = 21 * 60; // 09:00 PM (21:00)

  if (currentMinutes < openTime) {
    return {
      isOpen: false,
      currentDay,
      currentISTTime,
      message: "Weekday Banking Hours are 9:00 AM to 9:00 PM IST. Recharges and withdrawals are currently closed.",
      nextOpeningText: `Today (${currentDay}) at 9:00 AM IST`,
      schedule,
    };
  }

  if (currentMinutes >= closeTime) {
    const isFriday = day === 5;
    const nextText = isFriday ? "Saturday at 9:00 AM IST" : "Tomorrow at 9:00 AM IST";
    return {
      isOpen: false,
      currentDay,
      currentISTTime,
      message: `Weekday Banking Hours (9:00 AM – 9:00 PM IST) have ended for today. Desk reopens ${nextText}.`,
      nextOpeningText: nextText,
      schedule,
    };
  }

  return {
    isOpen: true,
    currentDay,
    currentISTTime,
    message: "Banking Services Open (Monday – Friday 9:00 AM – 9:00 PM IST)",
    nextOpeningText: "Open Now until 9:00 PM IST",
    schedule,
  };
}
