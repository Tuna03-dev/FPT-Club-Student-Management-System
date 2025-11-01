import { Fee } from "./fee";
import { PaymentStatus } from "@/utils/feeUtils";

/**
 * Extended Fee interface for member payment view
 * Includes payment status and optional fields
 */
export interface MemberFee extends Fee {
  /**
   * Payment status: paid, pending, or overdue
   */
  paymentStatus?: PaymentStatus;
  
  /**
   * Whether the fee is required (alias for isMandatory)
   */
  required?: boolean;
  
  /**
   * Payment date if paid
   */
  paidDate?: string;
  
  /**
   * Transaction ID if paid
   */
  transactionId?: string;
}

