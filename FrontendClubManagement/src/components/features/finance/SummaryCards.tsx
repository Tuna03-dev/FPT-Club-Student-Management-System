// src/components/finance/SummaryCards.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { mockFinanceData } from "./mocks";
import Skeleton from "@/components/common/Skeleton";

interface SummaryCardsProps {
  totalIncome: number;
  totalExpense: number;
  loading?: boolean;
}

export function SummaryCards({
  totalIncome,
  totalExpense,
  loading = false,
}: SummaryCardsProps) {
  const remaining = mockFinanceData.totalBudget + totalIncome - totalExpense;

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Card key={idx} className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton width="60%" height={14} />
              <Skeleton width={16} height={16} circle />
            </CardHeader>
            <CardContent>
              <Skeleton width="80%" height={28} />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Tổng ngân sách
          </CardTitle>
          <Wallet className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {mockFinanceData.totalBudget.toLocaleString("vi-VN")} ₫
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Tổng thu
          </CardTitle>
          <ArrowDownCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-500">
            {totalIncome.toLocaleString("vi-VN")} ₫
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Tổng chi
          </CardTitle>
          <ArrowUpCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-500">
            {totalExpense.toLocaleString("vi-VN")} ₫
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Còn lại
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">
            {remaining.toLocaleString("vi-VN")} ₫
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
