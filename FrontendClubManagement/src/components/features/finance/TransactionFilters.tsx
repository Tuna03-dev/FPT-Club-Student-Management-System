// src/components/features/finance/TransactionFilters.tsx
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, X } from "lucide-react";
import type { Fee } from "@/types/fee";

export interface TransactionFilters {
  search: string;
  status: string;
  fromDate: string;
  toDate: string;
  minAmount: string;
  maxAmount: string;
  // Income specific
  source?: string;
  feeId?: string;
  // Outcome specific
  category?: string;
}

interface TransactionFiltersProps {
  filters: TransactionFilters;
  onFiltersChange: (filters: TransactionFilters) => void;
  transactionType: "INCOME" | "OUTCOME";
  fees?: Fee[];
}

// Predefined filter options
const STATUS_OPTIONS = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "SUCCESS", label: "Thành công" },
  { value: "PENDING", label: "Chờ xử lý" },
  { value: "FAILED", label: "Thất bại" },
  { value: "CANCELLED", label: "Đã hủy" },
];

const INCOME_SOURCES = [
  { value: "direct", label: "Đóng trực tiếp" },
  { value: "bank", label: "Chuyển khoản ngân hàng" },
  { value: "PayOS", label: "PayOS" },
  { value: "other", label: "Khác" },
];

export function TransactionFiltersComponent({
  filters,
  onFiltersChange,
  transactionType,
  fees = [],
}: TransactionFiltersProps) {
  // Validation for amount range
  const isAmountRangeInvalid =
    filters.minAmount && filters.maxAmount && Number(filters.minAmount) > Number(filters.maxAmount);
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Validation for date range
  const isDateRangeInvalid =
    filters.fromDate && filters.toDate && filters.toDate < filters.fromDate;

  const handleFilterChange = (key: keyof TransactionFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      status: "all",
      fromDate: "",
      toDate: "",
      minAmount: "",
      maxAmount: "",
      source: "all",
      feeId: "all",
      category: "all",
    });
  };

  const hasActiveFilters = () => {
    return (
      filters.search ||
      (filters.status && filters.status !== "all") ||
      filters.fromDate ||
      filters.toDate ||
      filters.minAmount ||
      filters.maxAmount ||
      (filters.source && filters.source !== "all") ||
      (filters.feeId && filters.feeId !== "all") ||
      (filters.category && filters.category !== "all")
    );
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        {/* Always visible: Search + Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="search">Tìm kiếm</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder={
                  transactionType === "INCOME"
                    ? "Tìm theo mã, mô tả, người đóng..."
                    : "Tìm theo mã, mô tả, người nhận..."
                }
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="status">Trạng thái</Label>
            <Select
              value={filters.status || "all"}
              onValueChange={(value) => handleFilterChange("status", value)}
            >
              <SelectTrigger id="status" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Toggle button for advanced filters */}
        <div className="mt-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            {isExpanded ? "Ẩn bộ lọc nâng cao" : "Hiện bộ lọc nâng cao"}
          </Button>

          {hasActiveFilters() && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              Xóa tất cả bộ lọc
            </Button>
          )}
        </div>

        {/* Advanced Filters - Collapsible */}
        {isExpanded && (
          <div className="mt-4 space-y-4 pt-4 border-t">
            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fromDate">Từ ngày</Label>
                <Input
                  id="fromDate"
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) => handleFilterChange("fromDate", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="toDate">Đến ngày</Label>
                <Input
                  id="toDate"
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => handleFilterChange("toDate", e.target.value)}
                  className="mt-1"
                />
                  {isDateRangeInvalid && (
                    <span className="text-xs text-red-500">Ngày kết thúc không được nhỏ hơn ngày bắt đầu</span>
                  )}
              </div>
            </div>

            {/* Amount Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minAmount">Số tiền tối thiểu (₫)</Label>
                <Input
                  id="minAmount"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={filters.minAmount}
                  onChange={(e) => handleFilterChange("minAmount", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="maxAmount">Số tiền tối đa (₫)</Label>
                <Input
                  id="maxAmount"
                  type="number"
                  min="0"
                  placeholder="10,000,000"
                  value={filters.maxAmount}
                  onChange={(e) => handleFilterChange("maxAmount", e.target.value)}
                  className="mt-1"
                />
                  {isAmountRangeInvalid && (
                    <span className="text-xs text-red-500">Số tiền tối đa phải lớn hơn hoặc bằng số tiền tối thiểu</span>
                  )}
              </div>
            </div>

            {/* Income Specific Filters */}
            {transactionType === "INCOME" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="source">Nguồn thu</Label>
                  <Select
                    value={filters.source || "all"}
                    onValueChange={(value) => handleFilterChange("source", value)}
                  >
                    <SelectTrigger id="source" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INCOME_SOURCES.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="feeId">Khoản phí</Label>
                  <Select
                    value={filters.feeId || "all"}
                    onValueChange={(value) => handleFilterChange("feeId", value)}
                  >
                    <SelectTrigger id="feeId" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả khoản phí</SelectItem>
                      {fees
                        .filter((fee) => !fee.isDraft)
                        .map((fee) => (
                          <SelectItem key={fee.id} value={fee.id.toString()}>
                            {fee.title} - {fee.amount.toLocaleString("vi-VN")} ₫
                          </SelectItem>
                        ))}
                      {fees.filter((fee) => !fee.isDraft).length === 0 && (
                        <SelectItem value="none" disabled>
                          Chưa có khoản phí nào
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Filter Info */}
            {hasActiveFilters() && (
              <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  <strong>Đang áp dụng bộ lọc:</strong> Kết quả được lọc theo
                  các tiêu chí đã chọn. Click "Xóa tất cả bộ lọc" để xem toàn bộ
                  giao dịch.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
