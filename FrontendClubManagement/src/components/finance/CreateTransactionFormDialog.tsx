import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IncomeTransactionForm } from "./IncomeTransactionForm";
import { OutcomeTransactionForm } from "./OutcomeTransactionForm";
import type { Fee } from "@/types/fee";
import { toast } from "sonner";
import type {
  CreateIncomeTransactionRequest,
  CreateOutcomeTransactionRequest,
} from "@/services/transactionService";
import {
  memberService,
  type SimpleMemberResponse,
} from "@/services/memberService";
import type {
  IncomeTransactionFormValues,
  OutcomeTransactionFormValues,
} from "./transaction-schemas";

interface CreateTransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionType: "INCOME" | "OUTCOME";
  fees: Fee[];
  clubId: number;
  onCreateIncome: (data: CreateIncomeTransactionRequest) => Promise<void>;
  onCreateOutcome: (data: CreateOutcomeTransactionRequest) => Promise<void>;
}

/**
 * CreateTransactionFormDialog - Uses Zod + React Hook Form
 * 
 * This component wraps the IncomeTransactionForm and OutcomeTransactionForm
 * with proper validation using Zod schemas and React Hook Form.
 */
export function CreateTransactionFormDialog({
  open,
  onOpenChange,
  transactionType,
  fees,
  clubId,
  onCreateIncome,
  onCreateOutcome,
}: CreateTransactionFormDialogProps) {
  const [members, setMembers] = React.useState<SimpleMemberResponse[]>([]);
  const [loadingMembers, setLoadingMembers] = React.useState(false);

  // Fetch tất cả active members (cho Income transaction)
  React.useEffect(() => {
    if (open && transactionType === "INCOME") {
      const fetchMembers = async () => {
        setLoadingMembers(true);
        try {
          const response = await memberService.getAllActiveMembers(clubId);
          if (response.code === 200 && response.data) {
            setMembers(response.data);
          }
        } catch (error) {
          console.error("Failed to fetch members:", error);
        } finally {
          setLoadingMembers(false);
        }
      };
      fetchMembers();
    }
  }, [open, transactionType, clubId]);

  const handleIncomeSubmit = async (data: IncomeTransactionFormValues) => {
    try {
      await onCreateIncome(data as CreateIncomeTransactionRequest);
      toast.success("Đã tạo giao dịch thu thành công");
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating income transaction:", error);
      toast.error(
        error instanceof Error ? error.message : "Không thể tạo giao dịch thu"
      );
      throw error; // Re-throw để form handle
    }
  };

  const handleOutcomeSubmit = async (data: OutcomeTransactionFormValues) => {
    try {
      await onCreateOutcome(data as CreateOutcomeTransactionRequest);
      toast.success("Đã tạo giao dịch chi thành công");
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating outcome transaction:", error);
      toast.error(
        error instanceof Error ? error.message : "Không thể tạo giao dịch chi"
      );
      throw error; // Re-throw để form handle
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {transactionType === "INCOME"
              ? "Thêm giao dịch thu mới"
              : "Thêm giao dịch chi mới"}
          </DialogTitle>
        </DialogHeader>

        {transactionType === "INCOME" ? (
          <IncomeTransactionForm
            fees={fees}
            members={members}
            loadingMembers={loadingMembers}
            onSubmit={handleIncomeSubmit}
            onCancel={() => onOpenChange(false)}
          />
        ) : (
          <OutcomeTransactionForm
            onSubmit={handleOutcomeSubmit}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}


