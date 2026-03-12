const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;
const WEEK = 604800;
const MONTH = 2592000;
const YEAR = 31536000;

export function timeAgo(dateString: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / 1000,
  );

  if (seconds < MINUTE) return "just now";
  if (seconds < HOUR) {
    const m = Math.floor(seconds / MINUTE);
    return `${m} ${m === 1 ? "minute" : "minutes"} ago`;
  }
  if (seconds < DAY) {
    const h = Math.floor(seconds / HOUR);
    return `${h} ${h === 1 ? "hour" : "hours"} ago`;
  }
  if (seconds < WEEK) {
    const d = Math.floor(seconds / DAY);
    return `${d} ${d === 1 ? "day" : "days"} ago`;
  }
  if (seconds < MONTH) {
    const w = Math.floor(seconds / WEEK);
    return `${w} ${w === 1 ? "week" : "weeks"} ago`;
  }
  if (seconds < YEAR) {
    const mo = Math.floor(seconds / MONTH);
    return `${mo} ${mo === 1 ? "month" : "months"} ago`;
  }
  const y = Math.floor(seconds / YEAR);
  return `${y} ${y === 1 ? "year" : "years"} ago`;
}
