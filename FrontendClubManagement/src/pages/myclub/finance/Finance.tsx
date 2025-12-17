// src/pages/Finance.tsx (or wherever the main component is)
import { useEffect, useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";
import { payosService } from "@/services/payosService";
import { SummaryCards } from "@/components/finance/SummaryCards";
import {
  TransactionsTable,
  type Transaction,
} from "@/components/finance/TransactionsTable";
import { TransactionFiltersComponent, type TransactionFilters } from "@/components/finance/TransactionFilters";
import { FeesTable } from "@/components/finance/FeesTable";
import { PayOSIntegration } from "@/components/finance/PayOsIntegration";
import { EditTransactionDialog } from "@/components/finance/EditTransactionDialog";
import type { Fee } from "@/types/fee";
import type { PageResponse } from "@/types";
import feeService from "@/services/feeService";
import transactionService, {
  type IncomeTransactionResponse,
  type OutcomeTransactionResponse,
  type CreateIncomeTransactionRequest,
  type CreateOutcomeTransactionRequest,
} from "@/services/transactionService";
import financeService, {
  type FinanceSummaryResponse,
} from "@/services/financeService";

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
  status:
    outcome.status === "SUCCESS" || outcome.status === "COMPLETED"
      ? "COMPLETED"
      : outcome.status === "PENDING"
      ? "PENDING"
      : outcome.status === "FAILED"
      ? "FAILED"
      : "CANCELLED",
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
  const [isEditTransactionOpen, setIsEditTransactionOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [isAddFeeOpen, setIsAddFeeOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [checksumKey, setChecksumKey] = useState("");
  const [payosLoading, setPayosLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [incomePage, setIncomePage] = useState(0);
  const [outcomePage, setOutcomePage] = useState(0);
  const [activeTransactionTab, setActiveTransactionTab] = useState<
    "INCOME" | "OUTCOME"
  >("INCOME");
  const [financeSummary, setFinanceSummary] =
    useState<FinanceSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Filter states for Income
  const [incomeFilters, setIncomeFilters] = useState<TransactionFilters>({
    search: "",
    status: "all",
    fromDate: "",
    toDate: "",
    minAmount: "",
    maxAmount: "",
    source: "all",
    feeId: "all",
  });
  const debouncedIncomeSearch = useDebounce(incomeFilters.search, 500);

  // Filter states for Outcome
  const [outcomeFilters, setOutcomeFilters] = useState<TransactionFilters>({
    search: "",
    status: "all",
    fromDate: "",
    toDate: "",
    minAmount: "",
    maxAmount: "",
    category: "all",
  });
  const debouncedOutcomeSearch = useDebounce(outcomeFilters.search, 500);

  // Pagination metadata
  const [incomeTotalPages, setIncomeTotalPages] = useState(1);
  const [incomeTotalElements, setIncomeTotalElements] = useState(0);
  const [outcomeTotalPages, setOutcomeTotalPages] = useState(1);
  const [outcomeTotalElements, setOutcomeTotalElements] = useState(0);

  const fetchFinanceSummary = useCallback(async () => {
    if (!Number.isFinite(numericClubId) || numericClubId <= 0) return;
    try {
      setSummaryLoading(true);
      const res = await financeService.getFinanceSummary(numericClubId);
      if (res.code === 200 && res.data) {
        setFinanceSummary(res.data);
      }
    } catch (e) {
      console.error("Failed to fetch finance summary", e);
      toast.error("Không thể tải tổng quan tài chính");
    } finally {
      setSummaryLoading(false);
    }
  }, [numericClubId]);

  const fetchIncomeTransactions = useCallback(
    async (page: number = 0) => {
      if (!Number.isFinite(numericClubId) || numericClubId <= 0) return;
      try {
        setIncomeLoading(true);
        const params: Record<string, string | number> = { page, size: PAGE_SIZE };
        
        // Apply filters
        if (debouncedIncomeSearch) params.search = debouncedIncomeSearch;
        if (incomeFilters.status && incomeFilters.status !== "all") params.status = incomeFilters.status;
        if (incomeFilters.fromDate) params.fromDate = incomeFilters.fromDate;
        if (incomeFilters.toDate) params.toDate = incomeFilters.toDate;
        if (incomeFilters.minAmount) params.minAmount = Number(incomeFilters.minAmount);
        if (incomeFilters.maxAmount) params.maxAmount = Number(incomeFilters.maxAmount);
        if (incomeFilters.source && incomeFilters.source !== "all") params.source = incomeFilters.source;
        if (incomeFilters.feeId && incomeFilters.feeId !== "all") params.feeId = Number(incomeFilters.feeId);

        const res = await transactionService.getIncomeTransactions(
          numericClubId,
          params
        );
        if (res.code === 200 && res.data) {
          const transactions = res.data.content.map(convertIncomeToTransaction);
          setIncomeTransactions(transactions);
          setIncomePage(res.data.pageNumber ?? page);
          setIncomeTotalPages(res.data.totalPages ?? 1);
          setIncomeTotalElements(res.data.totalElements ?? 0);
        }
      } catch (e) {
        console.error("Failed to fetch income transactions", e);
        toast.error("Không thể tải danh sách giao dịch thu");
        setIncomeTransactions([]);
      } finally {
        setIncomeLoading(false);
      }
    },
    [numericClubId, debouncedIncomeSearch, incomeFilters]
  );

  const fetchOutcomeTransactions = useCallback(
    async (page: number = 0) => {
      if (!Number.isFinite(numericClubId) || numericClubId <= 0) return;
      try {
        setOutcomeLoading(true);
        const params: Record<string, string | number> = { page, size: PAGE_SIZE };
        
        // Apply filters
        if (debouncedOutcomeSearch) params.search = debouncedOutcomeSearch;
        if (outcomeFilters.status && outcomeFilters.status !== "all") params.status = outcomeFilters.status;
        if (outcomeFilters.fromDate) params.fromDate = outcomeFilters.fromDate;
        if (outcomeFilters.toDate) params.toDate = outcomeFilters.toDate;
        if (outcomeFilters.minAmount) params.minAmount = Number(outcomeFilters.minAmount);
        if (outcomeFilters.maxAmount) params.maxAmount = Number(outcomeFilters.maxAmount);
        if (outcomeFilters.category && outcomeFilters.category !== "all") params.category = outcomeFilters.category;

        const res = await transactionService.getOutcomeTransactions(
          numericClubId,
          params
        );
        if (res.code === 200 && res.data) {
          const transactions = res.data.content.map(
            convertOutcomeToTransaction
          );
          setOutcomeTransactions(transactions);
          setOutcomePage(res.data.pageNumber ?? page);
          setOutcomeTotalPages(res.data.totalPages ?? 1);
          setOutcomeTotalElements(res.data.totalElements ?? 0);
        }
      } catch (e) {
        console.error("Failed to fetch outcome transactions", e);
        toast.error("Không thể tải danh sách giao dịch chi");
        setOutcomeTransactions([]);
      } finally {
        setOutcomeLoading(false);
      }
    },
    [numericClubId, debouncedOutcomeSearch, outcomeFilters]
  );

  const fetchFees = useCallback(
    async (page: number = 0, search?: string, isExpired?: boolean) => {
      if (!Number.isFinite(numericClubId) || numericClubId <= 0) {
        setFeesPage(null);
        return;
      }
      try {
        setFeesLoading(true);
        const res = await feeService.getFees(numericClubId, {
          page,
          size: PAGE_SIZE,
          search,
          isExpired,
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

  // State để track xem tab nào đã được load
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<string>('income');

  useEffect(() => {
    void fetchFinanceSummary();
  }, [fetchFinanceSummary]);

  // Load income transactions khi mount (tab mặc định)
  useEffect(() => {
    if (activeTab === 'income' && !loadedTabs.has('income')) {
      void fetchIncomeTransactions(0);
      setLoadedTabs(prev => new Set(prev).add('income'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Reload income transactions when filters change
  useEffect(() => {
    if (loadedTabs.has('income')) {
      setIncomePage(0);
      void fetchIncomeTransactions(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedIncomeSearch, incomeFilters.status, incomeFilters.fromDate, incomeFilters.toDate, incomeFilters.minAmount, incomeFilters.maxAmount, incomeFilters.source, incomeFilters.feeId]);

  // Load outcome transactions khi chuyển sang tab outcome
  useEffect(() => {
    if (activeTab === 'outcome' && !loadedTabs.has('outcome')) {
      void fetchOutcomeTransactions(0);
      setLoadedTabs(prev => new Set(prev).add('outcome'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Reload outcome transactions when filters change
  useEffect(() => {
    if (loadedTabs.has('outcome')) {
      setOutcomePage(0);
      void fetchOutcomeTransactions(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedOutcomeSearch, outcomeFilters.status, outcomeFilters.fromDate, outcomeFilters.toDate, outcomeFilters.minAmount, outcomeFilters.maxAmount, outcomeFilters.category]);

  // Load fees khi chuyển sang tab fees
  useEffect(() => {
    if (activeTab === 'fees' && !loadedTabs.has('fees')) {
      void fetchFees(0);
      setLoadedTabs(prev => new Set(prev).add('fees'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleReloadFees = useCallback(
    async (page?: number, search?: string, isExpired?: boolean) => {
      const targetPage = page ?? currentPage;
      await fetchFees(targetPage, search, isExpired);
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
      await fetchFinanceSummary();
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
      await fetchFinanceSummary();
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
        await transactionService.rejectTransaction(
          numericClubId,
          Number(id),
          "income"
        );
        await fetchIncomeTransactions(incomePage);
      } else if (type === "OUTCOME") {
        await transactionService.rejectTransaction(
          numericClubId,
          Number(id),
          "outcome"
        );
        await fetchOutcomeTransactions(outcomePage);
      }
      await fetchFinanceSummary();
      toast.warning("Đã hủy giao dịch");
    } catch (e) {
      console.error("Failed to cancel transaction", e);
      toast.error("Không thể hủy giao dịch");
    }
  };

  const handleCreateIncomeTransaction = async (
    data: CreateIncomeTransactionRequest
  ) => {
    try {
      await transactionService.createIncomeTransaction(numericClubId, data);
      await fetchIncomeTransactions(incomePage);
      await fetchFinanceSummary();
    } catch (error) {
      console.error("Failed to create income transaction:", error);
      throw error;
    }
  };

  const handleCreateOutcomeTransaction = async (
    data: CreateOutcomeTransactionRequest
  ) => {
    try {
      await transactionService.createOutcomeTransaction(numericClubId, data);
      await fetchOutcomeTransactions(outcomePage);
      await fetchFinanceSummary();
    } catch (error) {
      console.error("Failed to create outcome transaction:", error);
      throw error;
    }
  };

  const handleUpdateIncomeTransaction = async (
    id: number,
    data: Partial<CreateIncomeTransactionRequest>
  ) => {
    try {
      await transactionService.updateIncomeTransaction(numericClubId, id, data);
      await fetchIncomeTransactions(incomePage);
      await fetchFinanceSummary();
    } catch (error) {
      console.error("Failed to update income transaction:", error);
      throw error;
    }
  };

  const handleUpdateOutcomeTransaction = async (
    id: number,
    data: Partial<CreateOutcomeTransactionRequest>
  ) => {
    try {
      await transactionService.updateOutcomeTransaction(
        numericClubId,
        id,
        data
      );
      await fetchOutcomeTransactions(outcomePage);
      await fetchFinanceSummary();
    } catch (error) {
      console.error("Failed to update outcome transaction:", error);
      throw error;
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
          totalBudget={financeSummary?.balance ?? 0}
          totalIncome={financeSummary?.totalIncome ?? 0}
          totalExpense={financeSummary?.totalExpense ?? 0}
          remaining={financeSummary?.remaining ?? 0}
          loading={summaryLoading}
        />

        <Tabs
          defaultValue="income"
          className="w-full"
          onValueChange={(value) => {
            setActiveTab(value);
            if (value === "income") setActiveTransactionTab("INCOME");
            if (value === "outcome") setActiveTransactionTab("OUTCOME");
          }}
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="income">Thu</TabsTrigger>
            <TabsTrigger value="outcome">Chi</TabsTrigger>
            <TabsTrigger value="fees">Quản lý phí</TabsTrigger>
            <TabsTrigger value="payos">Tích hợp PayOS</TabsTrigger>
          </TabsList>

          <TabsContent value="income" className="space-y-4">
            <TransactionFiltersComponent
              filters={incomeFilters}
              onFiltersChange={setIncomeFilters}
              transactionType="INCOME"
              fees={feesPage?.content ?? []}
            />
            <TransactionsTable
              transactions={incomeTransactions}
              transactionType="INCOME"
              clubId={numericClubId}
              onCreateIncome={handleCreateIncomeTransaction}
              onCreateOutcome={handleCreateOutcomeTransaction}
              onEditTransaction={(transaction) => {
                setEditingTransaction(transaction);
                setIsEditTransactionOpen(true);
              }}
              onDeleteTransaction={(id) =>
                handleDeleteTransaction(id, "INCOME")
              }
              onApproveTransaction={(id) =>
                handleApproveTransaction(id, "INCOME")
              }
              onRejectTransaction={(id) =>
                handleRejectTransaction(id, "INCOME")
              }
              isAddOpen={isAddTransactionOpen && activeTransactionTab === "INCOME"}
              setIsAddOpen={setIsAddTransactionOpen}
              loading={incomeLoading}
              fees={feesPage?.content ?? []}
              currentPage={incomePage}
              totalPages={incomeTotalPages}
              totalElements={incomeTotalElements}
              onPageChange={(page) => void fetchIncomeTransactions(page)}
            />
          </TabsContent>

          <TabsContent value="outcome" className="space-y-4">
            <TransactionFiltersComponent
              filters={outcomeFilters}
              onFiltersChange={setOutcomeFilters}
              transactionType="OUTCOME"
            />
            <TransactionsTable
              transactions={outcomeTransactions}
              transactionType="OUTCOME"
              clubId={numericClubId}
              onCreateIncome={handleCreateIncomeTransaction}
              onCreateOutcome={handleCreateOutcomeTransaction}
              onEditTransaction={(transaction) => {
                setEditingTransaction(transaction);
                setIsEditTransactionOpen(true);
              }}
              onDeleteTransaction={(id) =>
                handleDeleteTransaction(id, "OUTCOME")
              }
              onApproveTransaction={(id) =>
                handleApproveTransaction(id, "OUTCOME")
              }
              onRejectTransaction={(id) =>
                handleRejectTransaction(id, "OUTCOME")
              }
              isAddOpen={isAddTransactionOpen && activeTransactionTab === "OUTCOME"}
              setIsAddOpen={setIsAddTransactionOpen}
              loading={outcomeLoading}
              currentPage={outcomePage}
              totalPages={outcomeTotalPages}
              totalElements={outcomeTotalElements}
              onPageChange={(page) => void fetchOutcomeTransactions(page)}
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

        {/* Dialog is now handled inside TransactionsTable */}

        {/* Edit Transaction Dialog */}
        <EditTransactionDialog
          open={isEditTransactionOpen}
          onOpenChange={setIsEditTransactionOpen}
          transaction={editingTransaction}
          fees={feesPage?.content ?? []}
          clubId={numericClubId}
          onUpdateIncome={handleUpdateIncomeTransaction}
          onUpdateOutcome={handleUpdateOutcomeTransaction}
        />
      </div>
    </div>
  );
}
