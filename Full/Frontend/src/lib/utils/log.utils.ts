// ============================================
// 📄 src/utils/log.utils.ts
// ============================================
// 로그 관련 포멧 정의
// ============================================

export const formatProductId = (id: string | null) => id ?? "Unknown";

export const formatTimestamp = (ts: string) => {
  const data = new Date(ts.replace(" ", "T"));
  const year = data.getFullYear();
  const month = String(data.getMonth() + 1).padStart(2, "0");
  const day = String(data.getDate()).padStart(2, "0");
  const hour = String(data.getHours()).padStart(2, "0");
  const minute = String(data.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

export function statusColor_v2(status: number) {
  return status === 1 ? "#22c55e" : "#ef4444";
}

export function statusColor(status: string) {
  return status === "resolved" ? "#22c55e" : "#ef4444";
}