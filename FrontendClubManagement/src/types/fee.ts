export type FeeType = "MEMBERSHIP" | "EVENT" | "OTHER";

export interface Fee {
  id: string | number;
  title: string;
  description?: string;
  amount: number;
  feeType: FeeType;
  dueDate: string;
  isMandatory: boolean;
  isDraft?: boolean;
  totalMembers?: number;
  paidMembers?: number;
  status?: "active" | "completed" | "overdue";
  paidDate?: string;
  transactionReference?: string;
}

export interface CreateFeeRequest {
  title: string;
  description?: string;
  amount: number;
  feeType: FeeType;
  dueDate: string;
  isMandatory: boolean;
  isDraft?: boolean;
}

export interface UpdateFeeRequest {
  title: string;
  description?: string;
  amount: number;
  feeType: FeeType;
  dueDate: string;
  isMandatory: boolean;
  isDraft?: boolean;
}