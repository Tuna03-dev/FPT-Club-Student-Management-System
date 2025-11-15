// src/pages/Finance.tsx (or wherever the main component is)
import { useEffect, useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { payosService } from "@/services/payosService";
import { SummaryCards } from "@/components/features/finance/SummaryCards";
import {
  TransactionsTable,
  type Transaction,
} from "@/components/features/finance/TransactionsTable";
import { FeesTable } from "@/components/features/finance/FeesTable";
import { PayOSIntegration } from "@/components/features/finance/PayOsIntegration";
import type { Fee } from "@/types/fee";
import type { PageResponse } from "@/types";
import feeService from "@/services/feeService";
import transactionService, {
  type IncomeTransactionResponse,
  type OutcomeTransactionResponse,
} from "@/services/transactionService";

const PAGE_SIZE = 10;

// Helper function để convert API response sang Transaction type
const convertIncomeToTransaction = (
  income: IncomeTransactionResponse
): Transaction => ({
  id: income.id,
  code: income.reference,
  amount: income.amount,
  description: income.description,
  transactionDate: income.transactionDate,
  type: "INCOME",
  status:
    income.status === "SUCCESS"
      ? "COMPLETED"
      : income.status === "PENDING"
      ? "PENDING"
      : income.status === "FAILED"
      ? "FAILED"
      : "CANCELLED",
  source: income.source,
  feeId: income.feeId ?? undefined,
  feeTitle: income.feeTitle ?? undefined,
  userName: income.userName ?? undefined,
  userEmail: income.userEmail ?? undefined,
  notes: income.notes ?? undefined,
  createdBy: income.createdByName ?? undefined,
  createdAt: income.createdAt,
  updatedAt: income.updatedAt,
});

const convertOutcomeToTransaction = (
  outcome: OutcomeTransactionResponse
): Transaction => ({
  id: outcome.id,
  code: outcome.transactionCode,
  amount: outcome.amount,
  description: outcome.description,
  transactionDate: outcome.transactionDate,
  type: "OUTCOME",
  status: outcome.status,
  recipient: outcome.recipient,
  purpose: outcome.purpose,
  receiptUrl: outcome.receiptUrl ?? undefined,
  notes: outcome.notes ?? undefined,
  createdBy: outcome.createdByName ?? undefined,
  createdAt: outcome.createdAt,
  updatedAt: outcome.updatedAt,
});

// Mock data cho transactions (match với backend entities)

export default function Finance() {
  const { clubId } = useParams();
  const numericClubId = Number(clubId);
  const [incomeTransactions, setIncomeTransactions] = useState<Transaction[]>(
    []
  );
  const [outcomeTransactions, setOutcomeTransactions] = useState<Transaction[]>(
    []
  );
  const [incomeLoading, setIncomeLoading] = useState(false);
  const [outcomeLoading, setOutcomeLoading] = useState(false);
  const [feesPage, setFeesPage] = useState<PageResponse<Fee> | null>(null);
  const [feesLoading, setFeesLoading] = useState<boolean>(false);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isAddFeeOpen, setIsAddFeeOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [checksumKey, setChecksumKey] = useState("");
  const [payosLoading, setPayosLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [incomePage, setIncomePage] = useState(0);
  const [outcomePage, setOutcomePage] = useState(0);

  const fetchIncomeTransactions = useCallback(
    async (page: number = 0) => {
      if (!Number.isFinite(numericClubId) || numericClubId <= 0) return;
      try {
        setIncomeLoading(true);
        const res = await transactionService.getIncomeTransactions(
          numericClubId,
          { page, size: PAGE_SIZE }
        );
        if (res.code === 200 && res.data) {
          const transactions = res.data.content.map(convertIncomeToTransaction);
          setIncomeTransactions(transactions);
          setIncomePage(res.data.pageNumber ?? page);
        }
      } catch (e) {
        console.error("Failed to fetch income transactions", e);
        toast.error("Không thể tải danh sách giao dịch thu");
        setIncomeTransactions([]);
      } finally {
        setIncomeLoading(false);
      }
    },
    [numericClubId]
  );

  const fetchOutcomeTransactions = useCallback(
    async (page: number = 0) => {
      if (!Number.isFinite(numericClubId) || numericClubId <= 0) return;
      try {
        setOutcomeLoading(true);
        const res = await transactionService.getOutcomeTransactions(
          numericClubId,
          { page, size: PAGE_SIZE }
        );
        if (res.code === 200 && res.data) {
          const transactions = res.data.content.map(
            convertOutcomeToTransaction
          );
          setOutcomeTransactions(transactions);
          setOutcomePage(res.data.pageNumber ?? page);
        }
      } catch (e) {
        console.error("Failed to fetch outcome transactions", e);
        toast.error("Không thể tải danh sách giao dịch chi");
        setOutcomeTransactions([]);
      } finally {
        setOutcomeLoading(false);
      }
    },
    [numericClubId]
  );

  const fetchFees = useCallback(
    async (page: number = 0) => {
      if (!Number.isFinite(numericClubId) || numericClubId <= 0) {
        setFeesPage(null);
        return;
      }
      try {
        setFeesLoading(true);
        const res = await feeService.getFees(numericClubId, {
          page,
          size: PAGE_SIZE,
        });
        if (res.code === 200 && res.data) {
          const pageData = res.data;
          if (
            page > 0 &&
            Array.isArray(pageData.content) &&
            pageData.content.length === 0 &&
            pageData.totalPages > 0 &&
            page >= pageData.totalPages
          ) {
            await fetchFees(pageData.totalPages - 1);
            return;
          }
          setFeesPage(pageData);
          setCurrentPage(pageData.pageNumber ?? page);
        } else {
          setFeesPage({
            content: [],
            pageNumber: page,
            pageSize: PAGE_SIZE,
            totalElements: 0,
            totalPages: 0,
            hasNext: false,
            hasPrevious: false,
          });
        }
      } catch (e) {
        console.error("Failed to fetch fees", e);
        toast.error("Không thể tải danh sách khoản phí");
        setFeesPage({
          content: [],
          pageNumber: page,
          pageSize: PAGE_SIZE,
          totalElements: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        });
      } finally {
        setFeesLoading(false);
      }
    },
    [numericClubId]
  );

  useEffect(() => {
    if (!Number.isFinite(numericClubId) || numericClubId <= 0) return;
    (async () => {
      try {
        const res = await payosService.getConfig(numericClubId);
        const cfg = res.data;
        if (cfg?.clientId) setClientId(cfg.clientId);
      } catch {
        /* ignore */
      }
    })();
  }, [numericClubId]);

  useEffect(() => {
    void fetchIncomeTransactions(0);
  }, [fetchIncomeTransactions]);

  useEffect(() => {
    void fetchOutcomeTransactions(0);
  }, [fetchOutcomeTransactions]);

  useEffect(() => {
    void fetchFees(0);
  }, [fetchFees]);

  const handleReloadFees = useCallback(
    async (page?: number) => {
      const targetPage = page ?? currentPage;
      await fetchFees(targetPage);
    },
    [currentPage, fetchFees]
  );

  const handlePageChange = useCallback(
    async (page: number) => {
      await fetchFees(page);
    },
    [fetchFees]
  );

  const handleDeleteTransaction = async (
    id: string,
    type?: "INCOME" | "OUTCOME"
  ) => {
    try {
      // Gọi API xóa
      if (type === "INCOME") {
        await transactionService.deleteIncomeTransaction(
          numericClubId,
          Number(id)
        );
        await fetchIncomeTransactions(incomePage);
      } else if (type === "OUTCOME") {
        await transactionService.deleteOutcomeTransaction(
          numericClubId,
          Number(id)
        );
        await fetchOutcomeTransactions(outcomePage);
      }
      toast.success("Đã xóa giao dịch");
    } catch (e) {
      console.error("Failed to delete transaction", e);
      toast.error("Không thể xóa giao dịch");
    }
  };

  const handleFeeRemovedLocally = (id: string) => {
    setFeesPage((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        content: prev.content.filter((fee) => String(fee.id) !== String(id)),
        totalElements: prev.totalElements > 0 ? prev.totalElements - 1 : 0,
      };
    });
    toast("Đã xóa khoản phí");
  };

  const handleApproveTransaction = async (
    id: string,
    type?: "INCOME" | "OUTCOME"
  ) => {
    try {
      if (type === "INCOME") {
        await transactionService.approveTransaction(
          numericClubId,
          Number(id),
          "income"
        );
        await fetchIncomeTransactions(incomePage);
      } else if (type === "OUTCOME") {
        await transactionService.approveTransaction(
          numericClubId,
          Number(id),
          "outcome"
        );
        await fetchOutcomeTransactions(outcomePage);
      }
      toast.success("Đã duyệt giao dịch thành công");
    } catch (e) {
      console.error("Failed to approve transaction", e);
      toast.error("Không thể duyệt giao dịch");
    }
  };

  const handleRejectTransaction = async (
    id: string,
    type?: "INCOME" | "OUTCOME"
  ) => {
    try {
      if (type === "INCOME") {
        await transactionService.cancelTransaction(
          numericClubId,
          Number(id),
          "income"
        );
        await fetchIncomeTransactions(incomePage);
      } else if (type === "OUTCOME") {
        await transactionService.cancelTransaction(
          numericClubId,
          Number(id),
          "outcome"
        );
        await fetchOutcomeTransactions(outcomePage);
      }
      toast.warning("Đã hủy giao dịch");
    } catch (e) {
      console.error("Failed to cancel transaction", e);
      toast.error("Không thể hủy giao dịch");
    }
  };

  const handleFeeCreated = (newFee: Fee) => {
    setFeesPage((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        content: [newFee, ...prev.content],
        totalElements: prev.totalElements + 1,
      };
    });
  };

  const totalIncome = incomeTransactions
    .filter((t) => t.status === "COMPLETED")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = outcomeTransactions
    .filter((t) => t.status === "COMPLETED")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Quản lý tài chính
          </h1>
          <p className="text-muted-foreground">
            Theo dõi ngân sách, thu chi và học phí của CLB
          </p>
        </div>

        <SummaryCards
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          loading={incomeLoading || outcomeLoading}
        />

        <Tabs defaultValue="income" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="income">Thu (Income)</TabsTrigger>
            <TabsTrigger value="outcome">Chi (Outcome)</TabsTrigger>
            <TabsTrigger value="fees">Quản lý phí</TabsTrigger>
            <TabsTrigger value="payos">Tích hợp PayOS</TabsTrigger>
          </TabsList>

          <TabsContent value="income" className="space-y-4">
            <TransactionsTable
              transactions={incomeTransactions}
              transactionType="INCOME"
              onAddTransaction={() => setIsAddTransactionOpen(true)}
              onEditTransaction={() => {}}
              onDeleteTransaction={(id) =>
                handleDeleteTransaction(id, "INCOME")
              }
              onApproveTransaction={(id) =>
                handleApproveTransaction(id, "INCOME")
              }
              onRejectTransaction={(id) =>
                handleRejectTransaction(id, "INCOME")
              }
              isAddOpen={isAddTransactionOpen}
              setIsAddOpen={setIsAddTransactionOpen}
              loading={incomeLoading}
            />
          </TabsContent>

          <TabsContent value="outcome" className="space-y-4">
            <TransactionsTable
              transactions={outcomeTransactions}
              transactionType="OUTCOME"
              onAddTransaction={() => setIsAddTransactionOpen(true)}
              onEditTransaction={() => {}}
              onDeleteTransaction={(id) =>
                handleDeleteTransaction(id, "OUTCOME")
              }
              onApproveTransaction={(id) =>
                handleApproveTransaction(id, "OUTCOME")
              }
              onRejectTransaction={(id) =>
                handleRejectTransaction(id, "OUTCOME")
              }
              isAddOpen={isAddTransactionOpen}
              setIsAddOpen={setIsAddTransactionOpen}
              loading={outcomeLoading}
            />
          </TabsContent>

          <TabsContent value="fees" className="space-y-4">
            <FeesTable
              fees={feesPage?.content ?? []}
              loading={feesLoading}
              onAddFee={() => setIsAddFeeOpen(true)}
              onDeleteFee={handleFeeRemovedLocally}
              isAddOpen={isAddFeeOpen}
              setIsAddOpen={setIsAddFeeOpen}
              onFeeCreated={handleFeeCreated}
              clubId={numericClubId}
              onReloadFees={handleReloadFees}
              pageNumber={feesPage?.pageNumber ?? 0}
              pageSize={feesPage?.pageSize ?? PAGE_SIZE}
              totalPages={feesPage?.totalPages ?? 0}
              totalElements={feesPage?.totalElements ?? 0}
              onPageChange={handlePageChange}
            />
          </TabsContent>

          <TabsContent value="payos" className="space-y-4">
            <PayOSIntegration
              clientId={clientId}
              apiKey={apiKey}
              checksumKey={checksumKey}
              setClientId={setClientId}
              setApiKey={setApiKey}
              setChecksumKey={setChecksumKey}
              payosLoading={payosLoading}
              numericClubId={numericClubId}
              setPayosLoading={setPayosLoading}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
