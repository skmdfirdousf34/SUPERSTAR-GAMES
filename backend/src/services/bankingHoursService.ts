/**
 * Banking Hours Service (Indian Standard Time - Asia/Kolkata)
 *
 * Operational Schedule:
 * - Monday to Friday: 9:00 AM – 9:00 PM IST
 * - Saturday: 9:00 AM – 4:00 PM IST
 * - Sunday: Closed (No Recharges & No Withdrawals)
 */

export interface BankingHoursStatus {
  isOpen: boolean;
  currentDay: string;
  currentISTTime: string;
  message: string;
  schedule: {
    mon_fri: string;
    sat: string;
    sun: string;
  };
}

export function getBankingHoursStatus(): BankingHoursStatus {
  const now = new Date();

  // Convert current time to IST (Asia/Kolkata) string and parse
  const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const istDate = new Date(istString);

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

  const timeFormatted = istDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const schedule = {
    mon_fri: "Monday – Friday: 9:00 AM – 9:00 PM IST",
    sat: "Saturday: 9:00 AM – 4:00 PM IST",
    sun: "Sunday: Closed (No Recharges & Withdrawals)",
  };

  // Sunday (day === 0): Fully Closed
  if (day === 0) {
    return {
      isOpen: false,
      currentDay,
      currentISTTime: timeFormatted,
      message:
        "Banking Services Closed: Recharges & Withdrawals are closed on Sundays. Service resumes Monday at 9:00 AM IST.",
      schedule,
    };
  }

  // Saturday (day === 6): 9:00 AM (540 mins) to 4:00 PM (960 mins)
  if (day === 6) {
    const openTime = 9 * 60; // 09:00
    const closeTime = 16 * 60; // 16:00 (4:00 PM)

    if (currentMinutes < openTime || currentMinutes >= closeTime) {
      return {
        isOpen: false,
        currentDay,
        currentISTTime: timeFormatted,
        message:
          "Saturday Banking Hours are 9:00 AM to 4:00 PM IST. Recharges and withdrawals are currently closed.",
        schedule,
      };
    }
    return {
      isOpen: true,
      currentDay,
      currentISTTime: timeFormatted,
      message: "Banking Services Open (Saturday 9:00 AM – 4:00 PM IST)",
      schedule,
    };
  }

  // Monday to Friday (day >= 1 && day <= 5): 9:00 AM (540 mins) to 9:00 PM (1260 mins)
  const openTime = 9 * 60; // 09:00
  const closeTime = 21 * 60; // 21:00 (9:00 PM)

  if (currentMinutes < openTime || currentMinutes >= closeTime) {
    return {
      isOpen: false,
      currentDay,
      currentISTTime: timeFormatted,
      message:
        "Weekday Banking Hours are 9:00 AM to 9:00 PM IST. Recharges and withdrawals are currently closed.",
      schedule,
    };
  }

  return {
    isOpen: true,
    currentDay,
    currentISTTime: timeFormatted,
    message: "Banking Services Open (Mon–Fri 9:00 AM – 9:00 PM IST)",
    schedule,
  };
}
