// src/pages/Finance.tsx (or wherever the main component is)
import { useEffect, useState } from "react";
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
import feeService from "@/services/feeService";

export default function Finance() {
  const { clubId } = useParams();
  const numericClubId = Number(clubId);
  // const [transactions, setTransactions] = useState(mockTransactions);
  const [fees, setFees] = useState<Fee[]>([]);
  const [feesLoading, setFeesLoading] = useState<boolean>(false);
  // const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isAddFeeOpen, setIsAddFeeOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [checksumKey, setChecksumKey] = useState("");
  const [payosLoading, setPayosLoading] = useState(false);

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
    if (!Number.isFinite(numericClubId) || numericClubId <= 0) return;
    (async () => {
      try {
        setFeesLoading(true);
        const res = await feeService.getFees(numericClubId);
        const feeList = res.data;
        if (Array.isArray(feeList)) setFees(feeList);
      } catch (e) {
        // handle error or show toast
        console.error("Failed to fetch fees", e);
      } finally {
        setFeesLoading(false);
      }
    })();
  }, [numericClubId]);

  // const handleDeleteTransaction = (id: string) => {
  //   setTransactions(transactions.filter((t) => t.id !== id));
  //   toast("Đã xóa giao dịch");
  // };

  const handleDeleteFee = (id: string) => {
    setFees((prev) => prev.filter((f) => f.id !== id));
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

  const handleFeeCreated = (newFee: Fee) =>
    setFees((prev) => [newFee, ...prev]);

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
              fees={fees}
              loading={feesLoading}
              onAddFee={() => setIsAddFeeOpen(true)}
              onDeleteFee={handleDeleteFee}
              isAddOpen={isAddFeeOpen}
              setIsAddOpen={setIsAddFeeOpen}
              onFeeCreated={handleFeeCreated}
              clubId={numericClubId}
              onReloadFees={(list) => setFees(list)}
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
