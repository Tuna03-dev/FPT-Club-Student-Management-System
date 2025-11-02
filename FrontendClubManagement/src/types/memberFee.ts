import type { Fee } from "./fee";
import type { PaymentStatus } from "@/utils/feeUtils";


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

