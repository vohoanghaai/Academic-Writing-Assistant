/**
 * BẢNG MÃ LỖI (ERROR DICTIONARY)
 * File này dùng để chú thích các mã lỗi (Error Codes) có thể xảy ra trong hệ thống để dev dễ theo dõi.
 * 
 * - ERROR 429: Lỗi vượt quá giới hạn API (Quota Exceeded / Rate Limit) của Google Gemini. API Key của bạn đã hết lượt request miễn phí, cần chờ hoặc nâng cấp tài khoản.
 * - ERROR 503: Lỗi mạng (Network Error), mất kết nối hoặc không thể gọi tới máy chủ.
 * - ERROR 422: Lỗi phân tích cú pháp (Parse Error), AI trả về cấu trúc JSON không hợp lệ, không đúng chuẩn đã yêu cầu.
 * - ERROR 400: Lỗi Bad Request, dữ liệu gửi lên (văn bản) bị rỗng hoặc dung lượng quá lớn không hợp lệ.
 * - ERROR 500: Lỗi hệ thống Backend không xác định (Internal Server Error / Unknown).
 */

export function getShortErrorCode(err: any): string {
  const msg = (err?.message || String(err)).toLowerCase();

  if (msg.includes('429') || msg.includes('quota') || msg.includes('exhausted') || msg.includes('rate limit')) {
    return 'ERROR 429';
  }
  if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('timeout')) {
    return 'ERROR 503';
  }
  if (msg.includes('json') || msg.includes('parse') || msg.includes('syntax')) {
    return 'ERROR 422';
  }
  if (msg.includes('400')) {
    return 'ERROR 400';
  }
  
  return 'ERROR 500';
}
