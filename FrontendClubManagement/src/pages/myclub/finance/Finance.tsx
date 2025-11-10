// src/pages/Finance.tsx (or wherever the main component is)
import { useEffect, useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { payosService } from "@/services/payosService";
// import { SummaryCards } from "@/components/features/finance/SummaryCards";
// import { TransactionsTable } from "@/components/features/finance/TransactionsTable";
import { FeesTable } from "@/components/features/finance/FeesTable";
import { PayOSIntegration } from "@/components/features/finance/PayOsIntegration";
// import { mockTransactions } from "@/components/features/finance/mocks";
import type { Fee } from "@/types/fee";
import type { PageResponse } from "@/types";
import feeService from "@/services/feeService";

const PAGE_SIZE = 10;

export default function Finance() {
  const { clubId } = useParams();
  const numericClubId = Number(clubId);
  // const [transactions, setTransactions] = useState(mockTransactions);
  const [feesPage, setFeesPage] = useState<PageResponse<Fee> | null>(null);
  const [feesLoading, setFeesLoading] = useState<boolean>(false);
  // const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isAddFeeOpen, setIsAddFeeOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [checksumKey, setChecksumKey] = useState("");
  const [payosLoading, setPayosLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

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

  // const handleDeleteTransaction = (id: string) => {
  //   setTransactions(transactions.filter((t) => t.id !== id));
  //   toast("Đã xóa giao dịch");
  // };

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

  // const handleApproveTransaction = (id: string) => {
  //   setTransactions(
  //     transactions.map((t) => (t.id === id ? { ...t, status: "completed" } : t))
  //   );
  //   toast("Đã duyệt giao dịch");
  // };

  // const handleRejectTransaction = (id: string) => {
  //   setTransactions(
  //     transactions.map((t) => (t.id === id ? { ...t, status: "rejected" } : t))
  //   );
  //   toast("Đã từ chối giao dịch");
  // };

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

  // const totalIncome = transactions
  //   .filter((t) => t.type === "income" && t.status === "completed")
  //   .reduce((sum, t) => sum + t.amount, 0);
  // const totalExpense = transactions
  //   .filter((t) => t.type === "expense" && t.status === "completed")
  //   .reduce((sum, t) => sum + t.amount, 0);

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

        {/* <SummaryCards totalIncome={totalIncome} totalExpense={totalExpense} /> */}

        <Tabs defaultValue="transactions" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="transactions">Giao dịch</TabsTrigger>
            <TabsTrigger value="fees">Quản lý phí</TabsTrigger>
            <TabsTrigger value="payos">Tích hợp PayOS</TabsTrigger>
          </TabsList>

          {/* <TabsContent value="transactions" className="space-y-4">
            <TransactionsTable
              transactions={transactions}
              onAddTransaction={() => setIsAddTransactionOpen(true)}
              onEditTransaction={() => {}}
              onDeleteTransaction={handleDeleteTransaction}
              onApproveTransaction={handleApproveTransaction}
              onRejectTransaction={handleRejectTransaction}
              isAddOpen={isAddTransactionOpen}
              setIsAddOpen={setIsAddTransactionOpen}
            />
          </TabsContent> */}

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
