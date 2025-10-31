// src/components/finance/FeesTable.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Edit, Plus, Trash2, HelpCircle, Coins, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import type { Fee, CreateFeeRequest, UpdateFeeRequest, FeeType } from "@/types/fee";
import { useMemo, useState } from "react";
import feeService from "@/services/feeService";
import { Switch } from "@/components/ui/switch";
import { format, addDays } from "date-fns";
import { z } from "zod";
import { useForm, type SubmitHandler, type Resolver } from "react-hook-form";
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

// Errors type
// removed local error type; using zod + FormMessage

interface FeesTableProps {
  fees: Fee[];
  loading?: boolean;
  onAddFee: () => void;
  onDeleteFee: (id: string) => void;
  isAddOpen: boolean;
  setIsAddOpen: (open: boolean) => void;
  onFeeCreated: (fee: Fee) => void;
  clubId: number;
  onReloadFees?: (fees: Fee[]) => void; // optional: prefer re-fetching from backend
}

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
}: FeesTableProps) {
  const getFeeTypeBadge = (type?: FeeType) => {
    const variants = {
      MEMBERSHIP: { label: "Hội viên", color: "bg-blue-500/10 text-blue-500" },
      EVENT: { label: "Sự kiện", color: "bg-emerald-500/10 text-emerald-500" },
      OTHER: { label: "Khác", color: "bg-gray-400/10 text-gray-500" },
    } as const;
    const t = type && variants[type] ? variants[type] : variants.OTHER;
    return <Badge className={t.color}>{t.label}</Badge>;
  };

  // Form state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [editingFee, setEditingFee] = useState<Fee | null>(null);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [deleteFeeId, setDeleteFeeId] = useState<number | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  // Thêm state điều khiển dialog lock
  const [lockDialogFee, setLockDialogFee] = useState<Fee | null>(null);
  const [lockInProgress, setLockInProgress] = useState(false);

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
            .gt(0, { message: "Số tiền phải lớn hơn 0" }),
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
        })
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
            // ignore network errors
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
    },
  });


  const resetForm = () => {
    form.reset({
      title: "",
      amount: 0,
      description: "",
      dueDate: format(addDays(new Date(), 7), "yyyy-MM-dd"),
      feeType: "MEMBERSHIP",
      isMandatory: true,
    });
  };

  const handleCreateFee: SubmitHandler<FormValues> = async (values) => {
    setSubmitting(true);
    try {
      const dto: CreateFeeRequest = {
        title: values.title, // Already trimmed by Zod transform
        description: values.description || "",
        amount: values.amount,
        dueDate: values.dueDate,
        feeType: values.feeType,
        isMandatory: values.isMandatory,
      };
      const apiRes = await feeService.createFee(clubId, dto);
      const createdFee = apiRes?.data;
      if (createdFee) {
        // Re-fetch list to ensure consistency with backend (e.g., server-side defaults/calculated fields)
        try {
          const listRes = await feeService.getFees(clubId);
          if (onReloadFees && listRes?.data) onReloadFees(listRes.data);
          else onFeeCreated(createdFee);
        } catch {
          // fallback to optimistic add if re-fetch fails
          onFeeCreated(createdFee);
        }
        toast.success("Tạo khoản phí thành công!");
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
  };

  // Edit schema (exclude current feeId when checking duplicate title)
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
          amount: z.coerce
            .number()
            .gt(0, { message: "Số tiền phải lớn hơn 0" }),
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
        })
        .superRefine(async (data, ctx) => {
          const name = data.title;
          if (!name || !editingFee) return;
          try {
            const exists = await feeService.checkTitleExists(clubId, name, Number(editingFee.id));
            if (exists) {
              ctx.addIssue({
                code: "custom",
                path: ["title"],
                message: "Tên khoản phí đã tồn tại",
              });
            }
          } catch {
            // ignore network errors
          }
        }),
    [clubId, editingFee]
  );

  type EditFormValues = z.infer<typeof editSchema>;

  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editSchema) as Resolver<EditFormValues>,
    mode: "onChange",
  });

  const handleEditClick = (fee: Fee) => {
    if (fee.isLocked || (fee.paidMembers ?? 0) > 0) return;
    setEditingFee(fee);
    editForm.reset({
      title: fee.title,
      amount: fee.amount,
      description: fee.description || "",
      dueDate: fee.dueDate,
      feeType: fee.feeType,
      isMandatory: fee.isMandatory,
    });
    setIsEditOpen(true);
  };

  const handleUpdateFee: SubmitHandler<EditFormValues> = async (values) => {
    if (!editingFee) return;
    setSubmitting(true);
    try {
      const dto: UpdateFeeRequest = {
        title: values.title,
        description: values.description || "",
        amount: values.amount,
        dueDate: values.dueDate,
        feeType: values.feeType,
        isMandatory: values.isMandatory,
      };
      const apiRes = await feeService.updateFee(clubId, Number(editingFee.id), dto);
      const updatedFee = apiRes?.data;
      if (updatedFee) {
        // Prefer re-fetch from backend to reflect authoritative data
        try {
          const listRes = await feeService.getFees(clubId);
          if (onReloadFees && listRes?.data) onReloadFees(listRes.data);
          else onFeeCreated(updatedFee);
        } catch {
          onFeeCreated(updatedFee);
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
          ? (e as { message?: string }).message || "Đã xảy ra lỗi khi cập nhật phí"
          : "Đã xảy ra lỗi khi cập nhật phí"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (feeId: number) => {
    setDeleteFeeId(feeId);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteFeeId === null) return;
    setDeleteLoading(true);
    try {
      await feeService.deleteFee(clubId, deleteFeeId);
      // Re-fetch list after delete for consistency
      try {
        const listRes = await feeService.getFees(clubId);
        if (onReloadFees && listRes?.data) onReloadFees(listRes.data);
        else onDeleteFee(String(deleteFeeId));
      } catch {
        onDeleteFee(String(deleteFeeId));
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
  };

  const getFeeToDelete = () => {
    if (deleteFeeId === null) return null;
    return fees.find((f) => Number(f.id) === deleteFeeId);
  };

  // Xác nhận khóa/mở khóa phí
  const handleConfirmLock = async (fee: Fee, nextState: boolean) => {
    setLockInProgress(true);
    try {
      await feeService.lockFee(clubId, Number(fee.id), nextState);
      if (onReloadFees) {
        const fetched = await feeService.getFees(clubId);
        if (fetched?.data) onReloadFees(fetched.data);
      }
      toast.success(nextState ? "Đã khóa phí." : "Đã mở khóa phí.");
      setLockDialogFee(null);
    } catch (e) {
      toast.error("Không thể thay đổi trạng thái khóa phí.");
    } finally {
      setLockInProgress(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Quản lý học phí & phí thành viên</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Tạo và theo dõi các khoản phí
            </p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button onClick={onAddFee}>
                <Plus className="w-4 h-4 mr-2" />
                Tạo khoản phí
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md w-full">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Coins className="w-6 h-6 text-primary" /> Tạo khoản phí mới
                </DialogTitle>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" /> Điền thông tin bên dưới để
                  tạo khoản phí với đầy đủ trường cần thiết.
                </span>
              </DialogHeader>
              <Form {...form}>
                <form
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  onSubmit={form.handleSubmit(handleCreateFee)}
                >
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
                              min={0}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                          <div className="text-xs text-muted-foreground">
                            Chỉ nhập số, không đơn vị
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
                            Vd: Đợt thu phí dành cho tất cả hội viên...
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
              <DialogFooter className="mt-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    resetForm();
                  }}
                >
                  Hủy
                </Button>
                <Button
                  onClick={form.handleSubmit(handleCreateFee)}
                  disabled={submitting}
                  type="submit"
                >
                  {submitting ? (
                    <span className="flex items-center gap-1">
                      <span className="animate-spin border-2 border-white rounded-full border-t-transparent w-4 h-4"></span>{" "}
                      Đang tạo...
                    </span>
                  ) : (
                    "Tạo"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Fee Dialog */}
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="max-w-md w-full">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Coins className="w-6 h-6 text-primary" /> Chỉnh sửa khoản phí
                </DialogTitle>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" /> Cập nhật thông tin khoản phí
                </span>
              </DialogHeader>
              <Form {...editForm}>
                <form
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  onSubmit={editForm.handleSubmit(handleUpdateFee)}
                >
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
                          <FormLabel>Số tiền (₫) *</FormLabel>
                          <FormControl>
                            <Input
                              id="edit-fee-amount"
                              type="number"
                              min={0}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                          <div className="text-xs text-muted-foreground">
                            Chỉ nhập số, không đơn vị
                          </div>
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
                            <Input
                              id="edit-fee-due-date"
                              type="date"
                              {...field}
                            />
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
                            Vd: Đợt thu phí dành cho tất cả hội viên...
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
              <DialogFooter className="mt-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setIsEditOpen(false);
                    setEditingFee(null);
                    editForm.reset();
                  }}
                >
                  Hủy
                </Button>
                <Button
                  onClick={editForm.handleSubmit(handleUpdateFee)}
                  disabled={submitting || (!editingFee ? false : !editForm.formState.isDirty)}
                  type="submit"
                >
                  {submitting ? (
                    <span className="flex items-center gap-1">
                      <span className="animate-spin border-2 border-white rounded-full border-t-transparent w-4 h-4"></span>{" "}
                      Đang cập nhật...
                    </span>
                  ) : (
                    "Cập nhật"
                  )}
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
                            ⚠️ Cảnh báo: Khoản phí này đã có{" "}
                            {feeToDelete.paidMembers} thành viên đóng phí. Việc xóa
                            có thể ảnh hưởng đến hồ sơ tài chính.
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
                          {feeToDelete.amount.toLocaleString("vi-VN")} ₫
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
                  {deleteLoading ? (
                    <span className="flex items-center gap-1">
                      <span className="animate-spin border-2 border-white rounded-full border-t-transparent w-4 h-4"></span>{" "}
                      Đang xóa...
                    </span>
                  ) : (
                    "Xóa"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Lock/Unlock Fee Dialog */}
          {lockDialogFee && (
            <Dialog open={!!lockDialogFee} onOpenChange={(v) => !v && setLockDialogFee(null)}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-destructive">
                    {lockDialogFee.isLocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5 text-red-500" />}
                    {lockDialogFee.isLocked ? "Mở khóa khoản phí" : "Khóa khoản phí"}
                  </DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  {(() => {
                    const hasPayments = (lockDialogFee.paidMembers ?? 0) > 0;
                    return (
                      <>
                        <p className="text-sm mb-4">
                          {lockDialogFee.isLocked ? (
                            <>Bạn có chắc chắn muốn <span className="font-semibold">mở khóa</span> khoản phí <span className="font-medium">{lockDialogFee.title}</span>?</>
                          ) : (
                            <>Bạn có chắc chắn muốn <span className="font-semibold">khóa</span> khoản phí <span className="font-medium">{lockDialogFee.title}</span>?</>
                          )}
                        </p>
                        {lockDialogFee.isLocked ? (
                          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
                            <p className="text-sm text-yellow-700 dark:text-yellow-400">
                              ⚠️ Sau khi mở khóa, khoản phí sẽ có thể được chỉnh sửa và xóa trở lại.
                            </p>
                          </div>
                        ) : (
                          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4">
                            <p className="text-sm text-destructive font-medium">
                              ⚠️ Sau khi khóa, mọi thao tác chỉnh sửa và xóa sẽ bị vô hiệu hóa cho đến khi mở khóa.
                            </p>
                          </div>
                        )}
                        {hasPayments && (
                          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4">
                            <p className="text-sm text-destructive font-medium">
                              ⚠️ Khoản phí này đã có {lockDialogFee.paidMembers} thành viên đóng phí. Thay đổi trạng thái khóa có thể ảnh hưởng đến quản lý.
                            </p>
                          </div>
                        )}
                        <div className="text-sm space-y-1 text-muted-foreground">
                          <p>
                            <span className="font-medium">Số tiền:</span>{" "}
                            {lockDialogFee.amount.toLocaleString("vi-VN")} ₫
                          </p>
                          <p>
                            <span className="font-medium">Hạn đóng:</span>{" "}
                            {lockDialogFee.dueDate}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setLockDialogFee(null)} disabled={lockInProgress}>Hủy</Button>
                  <Button
                    variant={lockDialogFee.isLocked ? "default" : "destructive"}
                    onClick={() => handleConfirmLock(lockDialogFee, !lockDialogFee.isLocked)}
                    disabled={lockInProgress}
                  >
                    {lockInProgress
                      ? (lockDialogFee.isLocked ? "Đang mở khóa..." : "Đang khóa...")
                      : (lockDialogFee.isLocked ? "Mở khóa" : "Khóa")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
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
          ) : fees.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <div className="mb-2 text-sm">Chưa có khoản phí nào.</div>
              <div className="text-xs">Nhấn "Tạo khoản phí" để thêm mới.</div>
            </div>
          ) : (
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
                    {fee.title}
                    {fee.isLocked && (
                      <Badge className="ml-2 bg-red-600/20 text-red-700 border-red-600" variant="outline">Đã khóa</Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {fee.amount.toLocaleString("vi-VN")} ₫
                  </TableCell>
                  <TableCell>{fee.dueDate}</TableCell>
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
                                (fee.totalMembers ?? 1)) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getFeeTypeBadge(fee.feeType)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditClick(fee)}
                        disabled={Boolean(fee.isLocked) || (fee.paidMembers ?? 0) > 0}
                        title={fee.isLocked ? "Khoản phí đã bị khóa" : (fee.paidMembers && fee.paidMembers > 0 ? "Không thể chỉnh sửa khoản phí đã có người đóng" : "Chỉnh sửa")}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteClick(Number(fee.id))}
                        disabled={Boolean(fee.isLocked) || (fee.paidMembers ?? 0) > 0}
                        title={fee.isLocked ? "Khoản phí đã bị khóa" : (fee.paidMembers && fee.paidMembers > 0 ? "Không thể xóa khoản phí đã có người đóng" : "Xóa")}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setLockDialogFee(fee)}
                        disabled={(fee.paidMembers ?? 0) > 0}
                        title={(fee.paidMembers && fee.paidMembers > 0 ? "Không thể thay đổi trạng thái khóa cho khoản phí đã có người đóng" : fee.isLocked ? "Mở khóa khoản phí" : "Khóa khoản phí")}
                      >
                        {fee.isLocked ? <Unlock className="w-4 h-4 text-red-500" /> : <Lock className="w-4 h-4 text-gray-500" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}