export function formatDateTimeVN(dateString?: string | null): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    const parts = new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(date);

    const map: Record<string, string> = {};
    parts.forEach((p) => {
      if (p.type !== "literal") map[p.type] = p.value;
    });

    const hour = map.hour || "00";
    const minute = map.minute || "00";
    const day = map.day || "01";
    const month = map.month || "01";
    const year = map.year || "1970";

    return `${hour}:${minute} ${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
}
