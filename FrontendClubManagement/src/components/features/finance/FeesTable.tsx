// src/components/finance/FeesTable.tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit, Plus, Trash2, HelpCircle, Coins, Send, Users } from "lucide-react";
import { toast } from "sonner";
import type {
  Fee,
  CreateFeeRequest,
  UpdateFeeRequest,
  FeeType,
} from "@/types/fee";
import { useMemo, useState, useCallback, useEffect } from "react";
import feeService from "@/services/feeService";
import { clubService, type SemesterDTO } from "@/services/clubService";
import { Switch } from "@/components/ui/switch";
import { format, addDays } from "date-fns";
import { z } from "zod";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface FeesTableProps {
  fees: Fee[];
  loading?: boolean;
  onAddFee: () => void;
  onDeleteFee?: (id: string) => void;
  isAddOpen: boolean;
  setIsAddOpen: (open: boolean) => void;
  onFeeCreated?: (fee: Fee) => void;
  clubId: number;
  onReloadFees?: (page?: number, search?: string, isExpired?: boolean) => Promise<void> | void;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  totalElements: number;
  onPageChange?: (page: number) => void;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    amount
  );

const getFeeTypeBadge = (type?: FeeType) => {
  const variants: Record<FeeType, { label: string; color: string }> = {
    MEMBERSHIP: { label: "Hội viên", color: "bg-blue-500/10 text-blue-500" },
    EVENT: { label: "Sự kiện", color: "bg-emerald-500/10 text-emerald-500" },
    OTHER: { label: "Khác", color: "bg-gray-400/10 text-gray-500" },
  };
  const t = type && variants[type] ? variants[type] : variants.OTHER;
  return <Badge className={t.color}>{t.label}</Badge>;
};

const getDueStatusBadge = (dueDate?: string) => {
  if (!dueDate) return null;
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const diffDays = Math.floor(
    (d.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) {
    return <Badge className="bg-red-500/10 text-red-500">Đã hết hạn</Badge>;
  }
  if (diffDays === 0) {
    return (
      <Badge className="bg-yellow-500/10 text-yellow-600">Hạn hôm nay</Badge>
    );
  }
  if (diffDays <= 3) {
    return (
      <Badge className="bg-amber-500/10 text-amber-500">Sắp hết hạn</Badge>
    );
  }
  return <Badge className="bg-green-500/10 text-green-500">Còn hạn</Badge>;
};

export function FeesTable({
  fees,
  loading,
  onAddFee,
  onDeleteFee,
  isAddOpen,
  setIsAddOpen,
  onFeeCreated,
  clubId,
  onReloadFees,
  pageNumber,
  pageSize,
  totalPages,
  totalElements,
  onPageChange,
}: FeesTableProps) {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [editingFee, setEditingFee] = useState<Fee | null>(null);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [isAmountLockedInEdit, setIsAmountLockedInEdit] =
    useState<boolean>(false);
  const [deleteFeeId, setDeleteFeeId] = useState<number | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [publishingFeeId, setPublishingFeeId] = useState<number | null>(null);
  const [semesters, setSemesters] = useState<SemesterDTO[]>([]);
  const [loadingSemesters, setLoadingSemesters] = useState<boolean>(false);
  const [isPaidMembersOpen, setIsPaidMembersOpen] = useState<boolean>(false);
  const [selectedFeeForMembers, setSelectedFeeForMembers] = useState<Fee | null>(null);
  const [paidMembers, setPaidMembers] = useState<Array<{
    userId: number;
    fullName: string;
    email: string;
    studentCode: string;
    avatarUrl: string;
    paidDate: string;
    transactionId: number;
    amount: number;
  }>>([]);
  const [loadingPaidMembers, setLoadingPaidMembers] = useState<boolean>(false);
  const [paidMembersPage, setPaidMembersPage] = useState<number>(0);
  const [paidMembersTotalPages, setPaidMembersTotalPages] = useState<number>(0);
  const [paidMembersTotalElements, setPaidMembersTotalElements] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [expiredFilter, setExpiredFilter] = useState<string>("all");

  // Load semesters when component mounts
  useEffect(() => {
    const loadSemesters = async () => {
      setLoadingSemesters(true);
      try {
        const response = await clubService.getSemesters(clubId);
        if (response.code === 200 && response.data) {
          setSemesters(response.data);
        }
      } catch (error) {
        console.error("Error loading semesters:", error);
      } finally {
        setLoadingSemesters(false);
      }
    };
    loadSemesters();
  }, [clubId]);

  const schema = useMemo(
    () =>
      z
        .object({
          title: z
            .string()
            .transform((val) => val.trim())
            .pipe(
              z
                .string()
                .min(1, { message: "Tên khoản phí không được để trống" })
            ),
          amount: z.coerce
            .number()
            .min(2000, { message: "Số tiền tối thiểu là 2,000 VNĐ" }),
          dueDate: z
            .string()
            .refine((v) => !!v, { message: "Chọn hạn đóng" })
            .refine(
              (v) => {
                if (!v) return false;
                const today = new Date();
                const d = new Date(v);
                const startOfToday = new Date(
                  today.getFullYear(),
                  today.getMonth(),
                  today.getDate()
                );
                const dateOnly = new Date(
                  d.getFullYear(),
                  d.getMonth(),
                  d.getDate()
                );
                return dateOnly.getTime() >= startOfToday.getTime();
              },
              { message: "Hạn đóng phải ở tương lai" }
            ),
          feeType: z.enum(["MEMBERSHIP", "EVENT", "OTHER"] as [
            FeeType,
            FeeType,
            FeeType
          ]),
          description: z.string().optional(),
          isMandatory: z.boolean(),
          semesterId: z.coerce.number().optional(),
        })
        .refine(
          (data) => {
            // If feeType is MEMBERSHIP, semesterId is required
            if (data.feeType === "MEMBERSHIP") {
              return !!data.semesterId && data.semesterId > 0;
            }
            return true;
          },
          {
            message: "Vui lòng chọn kỳ học cho phí hội viên",
            path: ["semesterId"],
          }
        )
        .superRefine(async (data, ctx) => {
          const name = data.title;
          if (!name) return;
          try {
            const exists = await feeService.checkTitleExists(clubId, name);
            if (exists) {
              ctx.addIssue({
                code: "custom",
                path: ["title"],
                message: "Tên khoản phí đã tồn tại",
              });
            }
          } catch {
            /* ignore */
          }
        }),
    [clubId]
  );

  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    mode: "onChange",
    defaultValues: {
      title: "",
      amount: 0,
      description: "",
      dueDate: format(addDays(new Date(), 7), "yyyy-MM-dd"),
      feeType: "MEMBERSHIP",
      isMandatory: true,
      semesterId: undefined,
    },
  });

  const resetForm = useCallback(() => {
    form.reset({
      title: "",
      amount: 0,
      description: "",
      dueDate: format(addDays(new Date(), 7), "yyyy-MM-dd"),
      feeType: "MEMBERSHIP",
      isMandatory: true,
      semesterId: undefined,
    });
  }, [form]);

  const refreshFees = useCallback(
    async (page?: number, search?: string, isExpired?: boolean) => {
      if (onReloadFees) {
        await onReloadFees(page, search, isExpired);
      }
    },
    [onReloadFees]
  );

  // Auto search on change with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      const isExpired = expiredFilter === "all" ? undefined : expiredFilter === "expired";
      refreshFees(0, searchTerm || undefined, isExpired);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, expiredFilter, refreshFees]);

  const handleCreateFee = useCallback(
    async (values: FormValues, publishImmediately: boolean) => {
      setSubmitting(true);
      try {
        const dto: CreateFeeRequest = {
          title: values.title,
          description: values.description || "",
          amount: values.amount,
          dueDate: values.dueDate,
          feeType: values.feeType,
          isMandatory: values.isMandatory,
          isDraft: !publishImmediately,
          semesterId: values.semesterId,
        };
        const apiRes = await feeService.createFee(clubId, dto);
        const createdFee = apiRes?.data;
        if (createdFee) {
          const targetPage = publishImmediately ? 0 : pageNumber;
          const isExpired = expiredFilter === "all" ? undefined : expiredFilter === "expired";
          try {
            await refreshFees(targetPage, searchTerm || undefined, isExpired);
          } catch {
            onFeeCreated?.(createdFee);
          }
          toast.success(
            publishImmediately
              ? "Đã tạo và kích hoạt khoản phí!"
              : "Đã lưu khoản phí dưới dạng bản nháp!"
          );
          setIsAddOpen(false);
          resetForm();
        } else {
          throw new Error("Lỗi tạo khoản phí");
        }
      } catch (e: unknown) {
        toast.error(
          e && typeof e === "object" && "message" in e
            ? (e as { message?: string }).message || "Đã xảy ra lỗi khi tạo phí"
            : "Đã xảy ra lỗi khi tạo phí"
        );
      } finally {
        setSubmitting(false);
      }
    },
    [clubId, onFeeCreated, pageNumber, refreshFees, resetForm, setIsAddOpen, searchTerm, expiredFilter]
  );

  const editSchema = useMemo(
    () =>
      z
        .object({
          title: z
            .string()
            .transform((val) => val.trim())
            .pipe(
              z
                .string()
                .min(1, { message: "Tên khoản phí không được để trống" })
            ),
          amount: z.coerce.number(),
          dueDate: z
            .string()
            .refine((v) => !!v, { message: "Chọn hạn đóng" })
            .refine(
              (v) => {
                if (!v) return false;
                const today = new Date();
                const d = new Date(v);
                const startOfToday = new Date(
                  today.getFullYear(),
                  today.getMonth(),
                  today.getDate()
                );
                const dateOnly = new Date(
                  d.getFullYear(),
                  d.getMonth(),
                  d.getDate()
                );
                return dateOnly.getTime() >= startOfToday.getTime();
              },
              { message: "Hạn đóng phải ở tương lai" }
            ),
          feeType: z.enum(["MEMBERSHIP", "EVENT", "OTHER"] as [
            FeeType,
            FeeType,
            FeeType
          ]),
          description: z.string().optional(),
          isMandatory: z.boolean(),
          semesterId: z.coerce.number().optional(),
        })
        .refine(
          (data) => {
            // If feeType is MEMBERSHIP, semesterId is required
            if (data.feeType === "MEMBERSHIP") {
              return !!data.semesterId && data.semesterId > 0;
            }
            return true;
          },
          {
            message: "Vui lòng chọn kỳ học cho phí hội viên",
            path: ["semesterId"],
          }
        )
        .refine(
          (data) => {
            // If anyone has paid, skip amount validation (field is disabled anyway)
            if ((editingFee?.paidMembers ?? 0) > 0) return true;

            // Otherwise, validate amount >= 2000
            return data.amount >= 2000;
          },
          {
            message: "Số tiền tối thiểu là 2,000 VNĐ",
            path: ["amount"],
          }
        )
        .superRefine(async (data, ctx) => {
          const name = data.title;
          if (!name || !editingFee) return;
          try {
            const exists = await feeService.checkTitleExists(
              clubId,
              name,
              Number(editingFee.id)
            );
            if (exists) {
              ctx.addIssue({
                code: "custom",
                path: ["title"],
                message: "Tên khoản phí đã tồn tại",
              });
            }
          } catch {
            /* ignore */
          }
        }),
    [clubId, editingFee]
  );

  type EditFormValues = z.infer<typeof editSchema>;

  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editSchema) as Resolver<EditFormValues>,
    mode: "onChange",
  });

  const handleEditClick = useCallback(
    (fee: Fee) => {
      // Lock amount if anyone has paid this fee
      const isAmountLocked = (fee.paidMembers ?? 0) > 0;
      setIsAmountLockedInEdit(isAmountLocked);

      setEditingFee(fee);
      editForm.reset({
        title: fee.title,
        amount: fee.amount,
        description: fee.description || "",
        dueDate: fee.dueDate,
        feeType: fee.feeType,
        isMandatory: fee.isMandatory,
        semesterId: fee.semesterId,
      });
      setIsEditOpen(true);
    },
    [editForm]
  );

  const handleUpdateFee = useCallback(
    async (values: EditFormValues) => {
      if (!editingFee) return;

      // Security check: Prevent amount change if anyone has paid
      // Backend validates this, but we check client-side for better UX
      if (isAmountLockedInEdit && values.amount !== editingFee.amount) {
        toast.error(
          "⚠️ Không thể thay đổi số tiền! Khoản phí này đã có thành viên đóng tiền nên số tiền đã bị khóa để đảm bảo tính nhất quán của dữ liệu tài chính.",
          { duration: 5000 }
        );
        return;
      }

      setSubmitting(true);
      try {
        const dto: UpdateFeeRequest = {
          title: values.title,
          description: values.description || "",
          amount: values.amount,
          dueDate: values.dueDate,
          feeType: values.feeType,
          isMandatory: values.isMandatory,
          semesterId: values.semesterId,
        };
        const apiRes = await feeService.updateFee(
          clubId,
          Number(editingFee.id),
          dto
        );
        const updatedFee = apiRes?.data;
        if (updatedFee) {
          const isExpired = expiredFilter === "all" ? undefined : expiredFilter === "expired";
          try {
            await refreshFees(pageNumber, searchTerm || undefined, isExpired);
          } catch {
            onFeeCreated?.(updatedFee);
          }
          toast.success("Cập nhật khoản phí thành công!");
          setIsEditOpen(false);
          setEditingFee(null);
          editForm.reset();
        } else {
          throw new Error("Lỗi cập nhật khoản phí");
        }
      } catch (e: unknown) {
        toast.error(
          e && typeof e === "object" && "message" in e
            ? (e as { message?: string }).message ||
                "Đã xảy ra lỗi khi cập nhật phí"
            : "Đã xảy ra lỗi khi cập nhật phí"
        );
      } finally {
        setSubmitting(false);
      }
    },
    [
      clubId,
      editForm,
      editingFee,
      isAmountLockedInEdit,
      onFeeCreated,
      pageNumber,
      refreshFees,
      searchTerm,
      expiredFilter,
    ]
  );

  const handlePublishFee = useCallback(
    async (feeId: number, options?: { closeEdit?: boolean }) => {
      setPublishingFeeId(feeId);
      try {
        await feeService.publishFee(clubId, feeId);
        const isExpired = expiredFilter === "all" ? undefined : expiredFilter === "expired";
        await refreshFees(pageNumber, searchTerm || undefined, isExpired);
        toast.success("Đã kích hoạt khoản phí!");
        if (options?.closeEdit) {
          setIsEditOpen(false);
          setEditingFee(null);
          editForm.reset();
        }
      } catch (e: unknown) {
        toast.error(
          e && typeof e === "object" && "message" in e
            ? (e as { message?: string }).message ||
                "Đã xảy ra lỗi khi kích hoạt phí"
            : "Đã xảy ra lỗi khi kích hoạt phí"
        );
      } finally {
        setPublishingFeeId(null);
      }
    },
    [clubId, editForm, pageNumber, refreshFees, searchTerm, expiredFilter]
  );

  const handleClearSearch = useCallback(() => {
    setSearchTerm("");
    setExpiredFilter("all");
    refreshFees(0, undefined, undefined);
  }, [refreshFees]);

  const handleViewPaidMembers = useCallback(async (fee: Fee, page: number = 0) => {
    setSelectedFeeForMembers(fee);
    setIsPaidMembersOpen(true);
    setLoadingPaidMembers(true);
    try {
      const response = await feeService.getPaidMembers(clubId, Number(fee.id), { page, size: 10 });
      if (response.code === 200 && response.data) {
        setPaidMembers(response.data.content);
        setPaidMembersPage(response.data.pageNumber);
        setPaidMembersTotalPages(response.data.totalPages);
        setPaidMembersTotalElements(response.data.totalElements);
      }
    } catch {
      toast.error("Không thể tải danh sách thành viên đã đóng phí");
    } finally {
      setLoadingPaidMembers(false);
    }
  }, [clubId]);

  const handleDeleteClick = useCallback((feeId: number) => {
    setDeleteFeeId(feeId);
    setIsDeleteOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (deleteFeeId === null) return;
    setDeleteLoading(true);
    try {
      await feeService.deleteFee(clubId, deleteFeeId);
      const isExpired = expiredFilter === "all" ? undefined : expiredFilter === "expired";
      try {
        await refreshFees(pageNumber, searchTerm || undefined, isExpired);
      } catch {
        onDeleteFee?.(String(deleteFeeId));
      }
      toast.success("Xóa khoản phí thành công!");
      setIsDeleteOpen(false);
      setDeleteFeeId(null);
    } catch (e: unknown) {
      const errorMsg =
        e && typeof e === "object" && "message" in e
          ? (e as { message?: string }).message
          : "Đã xảy ra lỗi khi xóa phí";
      toast.error(errorMsg || "Đã xảy ra lỗi khi xóa phí");
    } finally {
      setDeleteLoading(false);
    }
  }, [clubId, deleteFeeId, onDeleteFee, pageNumber, refreshFees, searchTerm, expiredFilter]);

  const getFeeToDelete = useCallback(() => {
    if (deleteFeeId === null) return null;
    return fees.find((f) => Number(f.id) === deleteFeeId) ?? null;
  }, [deleteFeeId, fees]);

  const isLoading = Boolean(loading);
  const hasData = fees.length > 0;

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="mt-4">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() =>
                  onPageChange && onPageChange(Math.max(0, pageNumber - 1))
                }
                className={
                  pageNumber <= 0
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>

            {pageNumber > 2 && (
              <>
                <PaginationItem>
                  <PaginationLink
                    onClick={() => onPageChange && onPageChange(0)}
                    className="cursor-pointer"
                  >
                    1
                  </PaginationLink>
                </PaginationItem>
                {pageNumber > 3 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
              </>
            )}

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i;
              } else if (pageNumber <= 2) {
                pageNum = i;
              } else if (pageNumber >= totalPages - 3) {
                pageNum = totalPages - 5 + i;
              } else {
                pageNum = pageNumber - 2 + i;
              }

              if (pageNum < 0 || pageNum >= totalPages) return null;
              if (pageNumber > 2 && pageNum === 0) return null;
              if (pageNumber < totalPages - 3 && pageNum === totalPages - 1)
                return null;

              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    onClick={() => onPageChange && onPageChange(pageNum)}
                    isActive={pageNumber === pageNum}
                    className="cursor-pointer"
                  >
                    {pageNum + 1}
                  </PaginationLink>
                </PaginationItem>
              );
            })}

            {pageNumber < totalPages - 3 && (
              <>
                {pageNumber < totalPages - 4 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                <PaginationItem>
                  <PaginationLink
                    onClick={() =>
                      onPageChange && onPageChange(Math.max(0, totalPages - 1))
                    }
                    className="cursor-pointer"
                  >
                    {totalPages}
                  </PaginationLink>
                </PaginationItem>
              </>
            )}

            <PaginationItem>
              <PaginationNext
                onClick={() =>
                  onPageChange &&
                  onPageChange(
                    pageNumber < totalPages - 1 ? pageNumber + 1 : pageNumber
                  )
                }
                className={
                  pageNumber >= totalPages - 1
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
        <div className="text-center text-sm text-muted-foreground mt-2">
          Trang {pageNumber + 1} / {totalPages} ({totalElements} khoản phí)
        </div>
        <div className="text-center text-xs text-muted-foreground">
          Hiển thị {fees.length} khoản phí trên tối đa {pageSize} khoản mỗi
          trang.
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Quản lý học phí & phí thành viên</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Tạo và theo dõi các khoản phí, bao gồm bản nháp và đã kích hoạt
            </p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button onClick={onAddFee} className="shrink-0">
                <Plus className="w-4 h-4 mr-2" /> Tạo khoản phí
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md w-full">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Coins className="w-6 h-6 text-primary" /> Tạo khoản phí mới
              </DialogTitle>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <HelpCircle className="w-3 h-3" /> Điền thông tin bên dưới. Có
                thể lưu nháp hoặc kích hoạt ngay.
              </span>
            </DialogHeader>
            <Form {...form}>
              <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tên khoản phí *</FormLabel>
                        <FormControl>
                          <Input
                            id="fee-title"
                            placeholder="Học phí kỳ 1 năm học..."
                            autoFocus
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                        <div className="text-xs text-muted-foreground">
                          Nhập tên ngắn gọn, rõ ràng
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                <div>
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Số tiền (₫) *</FormLabel>
                        <FormControl>
                          <Input
                            id="fee-amount"
                            type="number"
                            min={2000}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                        <div className="text-xs text-muted-foreground">
                          Số tiền tối thiểu 2,000 VNĐ
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                <div>
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hạn đóng *</FormLabel>
                        <FormControl>
                          <Input id="fee-due-date" type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                        <div className="text-xs text-muted-foreground">
                          Mặc định +7 ngày, không thể chọn ngày trong quá khứ
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                <div>
                  <FormField
                    control={form.control}
                    name="feeType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Loại phí *</FormLabel>
                        <FormControl>
                          <select
                            id="fee-type"
                            className="w-full border rounded p-2 mt-1"
                            value={field.value}
                            onChange={(e) =>
                              field.onChange(e.target.value as FeeType)
                            }
                          >
                            <option value="MEMBERSHIP">Hội viên</option>
                            <option value="EVENT">Sự kiện</option>
                            <option value="OTHER">Khác</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                        <div className="text-xs text-muted-foreground">
                          Chọn loại phù hợp để tiện thống kê
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                {form.watch("feeType") === "MEMBERSHIP" && (
                  <div>
                    <FormField
                      control={form.control}
                      name="semesterId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kỳ học *</FormLabel>
                          <FormControl>
                            <select
                              id="fee-semester"
                              className="w-full border rounded p-2 mt-1"
                              value={field.value || ""}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value
                                    ? Number(e.target.value)
                                    : undefined
                                )
                              }
                              disabled={loadingSemesters}
                            >
                              <option value="">-- Chọn kỳ học --</option>
                              {semesters.map((semester) => (
                                <option key={semester.id} value={semester.id}>
                                  {semester.semesterName}
                                  {semester.isCurrent ? " (Hiện tại)" : ""}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                          <div className="text-xs text-muted-foreground">
                            Chọn kỳ học để active thành viên khi đóng phí
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mô tả</FormLabel>
                        <FormControl>
                          <Textarea
                            id="fee-desc"
                            placeholder="Thêm mô tả chi tiết (không bắt buộc)"
                            rows={2}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                        <div className="text-xs text-muted-foreground">
                          Ví dụ: Đợt thu phí dành cho tất cả hội viên...
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex items-center gap-3 col-span-2">
                  <FormField
                    control={form.control}
                    name="isMandatory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="mr-3">Bắt buộc</FormLabel>
                        <FormControl>
                          <Switch
                            id="isMandatory"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <span className="text-xs text-muted-foreground">
                    Khoản phí bắt buộc mọi thành viên phải đóng
                  </span>
                </div>
              </form>
            </Form>
            <DialogFooter className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setIsAddOpen(false);
                  resetForm();
                }}
                className="sm:mr-auto"
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={submitting}
                onClick={() =>
                  form.handleSubmit((values) =>
                    handleCreateFee(values, false)
                  )()
                }
              >
                {submitting ? "Đang lưu..." : "Lưu bản nháp"}
              </Button>
              <Button
                type="button"
                disabled={submitting}
                className="bg-emerald-500 text-white hover:bg-emerald-600"
                onClick={() =>
                  form.handleSubmit((values) => handleCreateFee(values, true))()
                }
              >
                {submitting ? "Đang tạo..." : "Kích hoạt"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>

        {/* Search and Filter Section */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-start mt-4">
            <Input
              placeholder="Tìm kiếm theo tên hoặc mô tả..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-80"
            />
            <select
              value={expiredFilter}
              onChange={(e) => setExpiredFilter(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm bg-background shrink-0 w-full sm:w-auto h-10"
            >
              <option value="all">Tất cả</option>
              <option value="active">Còn hạn</option>
              <option value="expired">Đã hết hạn</option>
            </select>
            {(searchTerm || expiredFilter !== "all") && (
              <Button onClick={handleClearSearch} variant="outline" size="sm" className="shrink-0 w-full sm:w-auto">
                Xóa bộ lọc
              </Button>
            )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, idx) => (
              <div key={idx} className="grid grid-cols-6 gap-4 items-center">
                <Skeleton className="h-4 w-full col-span-2" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <div className="flex justify-end">
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : !hasData ? (
          <div className="text-center py-10 text-muted-foreground">
            <div className="mb-2 text-sm">Chưa có khoản phí nào.</div>
            <div className="text-xs">Nhấn "Tạo khoản phí" để thêm mới.</div>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên khoản phí</TableHead>
                  <TableHead>Số tiền</TableHead>
                  <TableHead>Hạn đóng</TableHead>
                  <TableHead>Tiến độ</TableHead>
                  <TableHead>Loại phí</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fees.map((fee) => (
                  <TableRow key={fee.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          {fee.title}
                          {fee.isDraft && (
                            <Badge
                              className="bg-yellow-500/10 text-yellow-600 border-yellow-500"
                              variant="outline"
                            >
                              Bản nháp
                            </Badge>
                          )}
                        </div>
                        {fee.semesterName && fee.feeType === "MEMBERSHIP" && (
                          <div className="text-xs text-muted-foreground">
                            Kỳ: {fee.semesterName}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(fee.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{fee.dueDate}</span>
                        {getDueStatusBadge(fee.dueDate)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">
                          {fee.paidMembers ?? 0}/{fee.totalMembers ?? 0} thành
                          viên
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{
                              width: `${
                                ((fee.paidMembers ?? 0) /
                                  Math.max(1, fee.totalMembers ?? 1)) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getFeeTypeBadge(fee.feeType)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {(fee.paidMembers ?? 0) > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewPaidMembers(fee)}
                            title="Xem danh sách đã đóng phí"
                          >
                            <Users className="w-4 h-4 mr-1" /> Xem DS
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditClick(fee)}
                          title="Chỉnh sửa"
                        >
                          <Edit className="w-4 h-4 mr-1" /> Chỉnh sửa
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteClick(Number(fee.id))}
                          disabled={(fee.paidMembers ?? 0) > 0}
                          title={
                            fee.paidMembers && fee.paidMembers > 0
                              ? "Không thể xóa khoản phí đã có người đóng"
                              : "Xóa"
                          }
                        >
                          <Trash2 className="w-4 h-4 mr-1 text-destructive" />{" "}
                          Xóa
                        </Button>
                        {fee.isDraft && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="bg-emerald-500 text-white hover:bg-emerald-600"
                            onClick={() => handlePublishFee(Number(fee.id))}
                            disabled={publishingFeeId === Number(fee.id)}
                          >
                            {publishingFeeId === Number(fee.id) ? (
                              <span className="flex items-center gap-1">
                                <span className="animate-spin border-2 border-current rounded-full border-t-transparent w-4 h-4"></span>
                                Đang kích hoạt...
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Send className="w-4 h-4" /> Kích hoạt
                              </span>
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {renderPagination()}
          </>
        )}
      </CardContent>

      {/* Edit Fee Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="w-6 h-6 text-primary" /> Chỉnh sửa khoản phí
              {isAmountLockedInEdit && (
                <span className="text-xs font-normal px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full border border-amber-300 dark:border-amber-700">
                  🔒 Số tiền đã khóa
                </span>
              )}
            </DialogTitle>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <HelpCircle className="w-3 h-3" />
              {isAmountLockedInEdit
                ? "Phí đã có người đóng - Chỉ có thể chỉnh sửa thông tin khác"
                : "Cập nhật thông tin khoản phí"}
            </span>
          </DialogHeader>
          <Form {...editForm}>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <FormField
                  control={editForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tên khoản phí *</FormLabel>
                      <FormControl>
                        <Input
                          id="edit-fee-title"
                          placeholder="Học phí kỳ 1 năm học..."
                          autoFocus
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      <div className="text-xs text-muted-foreground">
                        Nhập tên ngắn gọn, rõ ràng
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              <div>
                <FormField
                  control={editForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Số tiền (₫) *
                        {isAmountLockedInEdit && (
                          <span className="text-xs font-normal text-amber-600 dark:text-amber-500">
                            🔒 Đã khóa
                          </span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          id="edit-fee-amount"
                          type="number"
                          min={2000}
                          disabled={isAmountLockedInEdit}
                          className={
                            isAmountLockedInEdit
                              ? "bg-muted cursor-not-allowed"
                              : ""
                          }
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      {isAmountLockedInEdit ? (
                        <div className="text-xs bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-2 mt-2">
                          <p className="text-amber-800 dark:text-amber-400 font-medium">
                            ⚠️ Không thể chỉnh sửa số tiền
                          </p>
                          <p className="text-amber-700 dark:text-amber-500 mt-1">
                            Khoản phí này đã có thành viên đóng tiền. Bạn có thể gia hạn
                            thêm thời gian nhưng không thể thay đổi số tiền để
                            đảm bảo tính nhất quán của dữ liệu tài chính.
                          </p>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          Số tiền tối thiểu 2,000 VNĐ
                        </div>
                      )}
                    </FormItem>
                  )}
                />
              </div>
              <div>
                <FormField
                  control={editForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hạn đóng *</FormLabel>
                      <FormControl>
                        <Input id="edit-fee-due-date" type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                      <div className="text-xs text-muted-foreground">
                        Không thể chọn ngày trong quá khứ
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              <div>
                <FormField
                  control={editForm.control}
                  name="feeType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loại phí *</FormLabel>
                      <FormControl>
                        <select
                          id="edit-fee-type"
                          className="w-full border rounded p-2 mt-1"
                          value={field.value}
                          onChange={(e) =>
                            field.onChange(e.target.value as FeeType)
                          }
                        >
                          <option value="MEMBERSHIP">Hội viên</option>
                          <option value="EVENT">Sự kiện</option>
                          <option value="OTHER">Khác</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                      <div className="text-xs text-muted-foreground">
                        Chọn loại phù hợp để tiện thống kê
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              {editForm.watch("feeType") === "MEMBERSHIP" && (
                <div>
                  <FormField
                    control={editForm.control}
                    name="semesterId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kỳ học *</FormLabel>
                        <FormControl>
                          <select
                            id="edit-fee-semester"
                            className="w-full border rounded p-2 mt-1"
                            value={field.value || ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? Number(e.target.value)
                                  : undefined
                              )
                            }
                            disabled={loadingSemesters}
                          >
                            <option value="">-- Chọn kỳ học --</option>
                            {semesters.map((semester) => (
                              <option key={semester.id} value={semester.id}>
                                {semester.semesterName}
                                {semester.isCurrent ? " (Hiện tại)" : ""}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                        <div className="text-xs text-muted-foreground">
                          Chọn kỳ học để active thành viên khi đóng phí
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              )}
              <div className="md:col-span-2">
                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mô tả</FormLabel>
                      <FormControl>
                        <Textarea
                          id="edit-fee-desc"
                          placeholder="Thêm mô tả chi tiết (không bắt buộc)"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      <div className="text-xs text-muted-foreground">
                        Ví dụ: Đợt thu phí dành cho tất cả hội viên...
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex items-center gap-3 col-span-2">
                <FormField
                  control={editForm.control}
                  name="isMandatory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="mr-3">Bắt buộc</FormLabel>
                      <FormControl>
                        <Switch
                          id="edit-isMandatory"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <span className="text-xs text-muted-foreground">
                  Khoản phí bắt buộc mọi thành viên phải đóng
                </span>
              </div>
            </form>
          </Form>
          <DialogFooter className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setIsEditOpen(false);
                setEditingFee(null);
                setIsAmountLockedInEdit(false);
                editForm.reset();
              }}
              className="sm:mr-auto"
            >
              Hủy
            </Button>
            {editingFee?.isDraft && (
              <Button
                type="button"
                variant="secondary"
                className="bg-emerald-500 text-white hover:bg-emerald-600"
                disabled={publishingFeeId === Number(editingFee.id)}
                onClick={() =>
                  editingFee &&
                  handlePublishFee(Number(editingFee.id), { closeEdit: true })
                }
              >
                {publishingFeeId === Number(editingFee?.id)
                  ? "Đang kích hoạt..."
                  : "Kích hoạt ngay"}
              </Button>
            )}
            <Button
              onClick={editForm.handleSubmit(handleUpdateFee)}
              disabled={
                submitting ||
                (!editingFee ? false : !editForm.formState.isDirty)
              }
              type="submit"
            >
              {submitting ? "Đang cập nhật..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Paid Members Dialog */}
      <Dialog open={isPaidMembersOpen} onOpenChange={setIsPaidMembersOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Danh sách thành viên đã đóng phí
            </DialogTitle>
            {selectedFeeForMembers && (
              <p className="text-sm text-muted-foreground">
                {selectedFeeForMembers.title} - {formatCurrency(selectedFeeForMembers.amount)}
              </p>
            )}
          </DialogHeader>
          <div className="mt-4">
            {loadingPaidMembers ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : paidMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Chưa có thành viên nào đóng phí</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thành viên</TableHead>
                      <TableHead>MSSV</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Ngày đóng</TableHead>
                      <TableHead className="text-right">Số tiền</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paidMembers.map((member) => (
                      <TableRow key={member.userId}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={member.avatarUrl} alt={member.fullName} />
                              <AvatarFallback>{member.fullName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{member.fullName}</span>
                          </div>
                        </TableCell>
                        <TableCell>{member.studentCode}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{member.email}</TableCell>
                        <TableCell>{new Date(member.paidDate).toLocaleDateString('vi-VN')}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(member.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {paidMembersTotalPages > 1 && (
                  <div className="mt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => selectedFeeForMembers && handleViewPaidMembers(selectedFeeForMembers, Math.max(0, paidMembersPage - 1))}
                            className={paidMembersPage <= 0 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                        {Array.from({ length: Math.min(5, paidMembersTotalPages) }, (_, i) => {
                          let pageNum = i;
                          if (paidMembersTotalPages > 5) {
                            if (paidMembersPage <= 2) pageNum = i;
                            else if (paidMembersPage >= paidMembersTotalPages - 3) pageNum = paidMembersTotalPages - 5 + i;
                            else pageNum = paidMembersPage - 2 + i;
                          }
                          if (pageNum < 0 || pageNum >= paidMembersTotalPages) return null;
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                onClick={() => selectedFeeForMembers && handleViewPaidMembers(selectedFeeForMembers, pageNum)}
                                isActive={paidMembersPage === pageNum}
                                className="cursor-pointer"
                              >
                                {pageNum + 1}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => selectedFeeForMembers && handleViewPaidMembers(selectedFeeForMembers, paidMembersPage < paidMembersTotalPages - 1 ? paidMembersPage + 1 : paidMembersPage)}
                            className={paidMembersPage >= paidMembersTotalPages - 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                    <div className="text-center text-sm text-muted-foreground mt-2">
                      Trang {paidMembersPage + 1} / {paidMembersTotalPages} ({paidMembersTotalElements} thành viên)
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaidMembersOpen(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Xác nhận xóa khoản phí
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {(() => {
              const feeToDelete = getFeeToDelete();
              if (!feeToDelete) return null;
              const hasPayments = (feeToDelete.paidMembers ?? 0) > 0;
              return (
                <>
                  <p className="text-sm mb-4">
                    Bạn có chắc chắn muốn xóa khoản phí{" "}
                    <span className="font-semibold">{feeToDelete.title}</span>?
                  </p>
                  {hasPayments ? (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4">
                      <p className="text-sm text-destructive font-medium">
                        ⚠️ Khoản phí này đã có {feeToDelete.paidMembers} thành
                        viên đóng phí. Việc xóa có thể ảnh hưởng đến hồ sơ tài
                        chính.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">
                        ⚠️ Hành động này không thể hoàn tác. Vui lòng xác nhận
                        cẩn thận.
                      </p>
                    </div>
                  )}
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p>
                      <span className="font-medium">Số tiền:</span>{" "}
                      {formatCurrency(feeToDelete.amount)}
                    </p>
                    <p>
                      <span className="font-medium">Hạn đóng:</span>{" "}
                      {feeToDelete.dueDate}
                    </p>
                  </div>
                </>
              );
            })()}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteOpen(false);
                setDeleteFeeId(null);
              }}
              disabled={deleteLoading}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
