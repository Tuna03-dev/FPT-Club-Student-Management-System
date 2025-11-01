/**
 * Format currency to Vietnamese Dong (VND)
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
};

/**
 * Payment status types for member fees
 */
export type PaymentStatus = "paid" | "pending" | "overdue";

/**
 * Get payment status label
 */
export const getPaymentStatusLabel = (status: PaymentStatus | string): string => {
  switch (status) {
    case "paid":
      return "Đã đóng";
    case "pending":
      return "Chưa đóng";
    case "overdue":
      return "Quá hạn";
    default:
      return "";
  }
};

/**
 * Calculate payment status based on due date and payment status
 */
export const calculatePaymentStatus = (
  dueDate: string,
  isPaid: boolean
): PaymentStatus => {
  if (isPaid) return "paid";
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  if (due < today) return "overdue";
  return "pending";
};

/**
 * Format date to Vietnamese locale
 */
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('vi-VN');
};

/**
 * Check if fee is overdue
 */
export const isOverdue = (dueDate: string): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  return due < today;
};

