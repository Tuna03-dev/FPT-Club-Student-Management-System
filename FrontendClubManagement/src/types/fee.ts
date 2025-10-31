export type FeeType = "MEMBERSHIP" | "EVENT" | "OTHER";

export interface Fee {
  id: string | number;
  title: string;
  description?: string;
  amount: number;
  feeType: FeeType;
  dueDate: string;
  isMandatory: boolean;
  totalMembers?: number;
  paidMembers?: number;
  status?: "active" | "completed" | "overdue";
}

export interface CreateFeeRequest {
  title: string;
  description?: string;
  amount: number;
  feeType: FeeType;
  dueDate: string;
  isMandatory: boolean;
}