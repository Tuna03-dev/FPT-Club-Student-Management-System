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
  hasEverExpired?: boolean; // Once true, amount cannot be edited
  totalMembers?: number;
  paidMembers?: number;
  status?: "active" | "completed" | "overdue";
  paidDate?: string;
  transactionReference?: string;
  semesterId?: number; // For MEMBERSHIP fee type
  semesterName?: string; // For display
}

export interface CreateFeeRequest {
  title: string;
  description?: string;
  amount: number;
  feeType: FeeType;
  dueDate: string;
  isMandatory: boolean;
  isDraft?: boolean;
  semesterId?: number; // For MEMBERSHIP fee type
}

export interface UpdateFeeRequest {
  title: string;
  description?: string;
  amount: number;
  feeType: FeeType;
  dueDate: string;
  isMandatory: boolean;
  isDraft?: boolean;
  semesterId?: number; // For MEMBERSHIP fee type
}
