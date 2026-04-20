export function parseDateValue(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function getTodayDateValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const day = `${today.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const WEEKDAY_LABELS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

export function getWeekdayLabel(dateValue: string) {
  return WEEKDAY_LABELS[parseDateValue(dateValue).getDay()];
}

export function formatDisplayDate(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const weekday = WEEKDAY_LABELS[parseDateValue(dateValue).getDay()];
  return `${year}年${month}月${day}日 ${weekday}`;
}

export function isInCurrentMonth(dateValue: string) {
  const target = parseDateValue(dateValue);
  const current = new Date();

  return (
    target.getFullYear() === current.getFullYear() &&
    target.getMonth() === current.getMonth()
  );
}

export function isWithinLastDays(dateValue: string, days: number) {
  const target = parseDateValue(dateValue);
  const current = new Date();
  const start = new Date(current.getFullYear(), current.getMonth(), current.getDate() - (days - 1));
  const end = new Date(current.getFullYear(), current.getMonth(), current.getDate(), 23, 59, 59, 999);

  return target >= start && target <= end;
}
