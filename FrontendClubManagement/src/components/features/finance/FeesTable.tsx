// src/components/finance/FeesTable.tsx
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
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
import { Edit, Plus, Trash2, HelpCircle, Coins } from "lucide-react";
import { toast } from "sonner";
import type { Fee, CreateFeeRequest, FeeType } from "@/types/fee";
import { useState } from "react";
import feeService from "@/services/feeService";
import { Switch } from "@/components/ui/switch";
import { format, addDays } from "date-fns";

// Errors type
interface FeeFormErrors {
  title?: string;
  amount?: string;
  dueDate?: string;
}

interface FeesTableProps {
  fees: Fee[];
  onAddFee: () => void;
  onDeleteFee: (id: string) => void;
  isAddOpen: boolean;
  setIsAddOpen: (open: boolean) => void;
  onFeeCreated: (fee: Fee) => void;
  clubId: number;
}

export function FeesTable({ 
  fees, 
  onAddFee, 
  onDeleteFee, 
  isAddOpen, 
  setIsAddOpen,
  onFeeCreated,
  clubId,
}: FeesTableProps) {
  const getFeeStatusBadge = (status?: Fee["status"]) => {
    const variants = {
      active: { label: "Đang mở", color: "bg-blue-500/10 text-blue-500" },
      completed: { label: "Hoàn thành", color: "bg-green-500/10 text-green-500" },
      overdue: { label: "Quá hạn", color: "bg-red-500/10 text-red-500" },
    } as const;
    const fallback = { label: "Khác", color: "bg-gray-400/10 text-gray-500" };
    const v = status && variants[status] ? variants[status] : fallback;
    return (<Badge className={v.color}>{v.label}</Badge>);
  };

  // Form state
  const [title, setTitle] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>(format(addDays(new Date(), 7), "yyyy-MM-dd"));
  const [feeType, setFeeType] = useState<FeeType>("MEMBERSHIP");
  const [isMandatory, setIsMandatory] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<FeeFormErrors>({});

  const resetForm = () => {
    setTitle("");
    setAmount(0);
    setDescription("");
    setDueDate(format(addDays(new Date(), 7), "yyyy-MM-dd"));
    setFeeType("MEMBERSHIP");
    setIsMandatory(true);
  };

  const validate = (): FeeFormErrors => {
    const err: FeeFormErrors = {};
    if (!title.trim()) err.title = "Tên khoản phí không được để trống";
    if (amount <= 0) err.amount = "Số tiền phải lớn hơn 0";
    if (!dueDate) err.dueDate = "Chọn hạn đóng";
    else if (new Date(dueDate) < new Date()) err.dueDate = "Hạn đóng phải ở tương lai";
    return err;
  };

  const handleCreateFee = async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    try {
      const dto: CreateFeeRequest = {
        title,
        description,
        amount,
        dueDate,
        feeType,
        isMandatory,
      };
      const apiRes = await feeService.createFee(clubId, dto);
      const createdFee = apiRes?.data;
      if (createdFee) {
        onFeeCreated(createdFee);
        toast.success("Tạo khoản phí thành công!");
        setIsAddOpen(false);
        resetForm();
        setErrors({});
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
      setLoading(false);
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
                  <HelpCircle className="w-3 h-3" /> Điền thông tin bên dưới để tạo khoản phí với đầy đủ trường cần thiết.
                </span>
              </DialogHeader>
              <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={e => {e.preventDefault();handleCreateFee();}}>
                <div className="md:col-span-2">
                  <Label htmlFor="fee-title">Tên khoản phí *</Label>
                  <Input id="fee-title" placeholder="Học phí kỳ 1 năm học..." value={title} onChange={e => setTitle(e.target.value)} required autoFocus />
                  {errors.title && <div className="text-xs text-red-500 mt-1">{errors.title}</div>}
                  <div className="text-xs text-muted-foreground">Nhập tên ngắn gọn, rõ ràng</div>
                </div>
                <div>
                  <Label htmlFor="fee-amount">Số tiền (₫) *</Label>
                  <Input id="fee-amount" type="number" min={0} value={amount} onChange={e => setAmount(Number(e.target.value))} required />
                  {errors.amount && <div className="text-xs text-red-500 mt-1">{errors.amount}</div>}
                  <div className="text-xs text-muted-foreground">Chỉ nhập số, không đơn vị</div>
                </div>
                <div>
                  <Label htmlFor="fee-due-date">Hạn đóng *</Label>
                  <Input id="fee-due-date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
                  {errors.dueDate && <div className="text-xs text-red-500 mt-1">{errors.dueDate}</div>}
                  <div className="text-xs text-muted-foreground">Mặc định +7 ngày, không thể chọn ngày trong quá khứ</div>
                </div>
                <div>
                  <Label htmlFor="fee-type">Loại phí *</Label>
                  <select id="fee-type" value={feeType} onChange={e => setFeeType(e.target.value as FeeType)} className="w-full border rounded p-2 mt-1">
                    <option value="MEMBERSHIP">Hội viên</option>
                    <option value="EVENT">Sự kiện</option>
                    <option value="OTHER">Khác</option>
                  </select>
                  <div className="text-xs text-muted-foreground">Chọn loại phù hợp để tiện thống kê</div>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="fee-desc">Mô tả</Label>
                  <Textarea id="fee-desc" placeholder="Thêm mô tả chi tiết (không bắt buộc)" value={description} onChange={e => setDescription(e.target.value)} rows={2}/>
                  <div className="text-xs text-muted-foreground">Vd: Đợt thu phí dành cho tất cả hội viên...</div>
                </div>
                <div className="flex items-center gap-3 col-span-2">
                  <Label>Bắt buộc</Label>
                  <Switch checked={isMandatory} onCheckedChange={setIsMandatory} id="isMandatory" />
                  <span className="text-xs text-muted-foreground">Khoản phí bắt buộc mọi thành viên phải đóng</span>
                </div>
              </form>
              <DialogFooter className="mt-2">
                <Button variant="outline" type="button" onClick={() => { setIsAddOpen(false); setErrors({}); }}>Hủy</Button>
                <Button onClick={handleCreateFee} disabled={loading} type="submit">
                  {loading ? <span className="flex items-center gap-1"><span className="animate-spin border-2 border-white rounded-full border-t-transparent w-4 h-4"></span> Đang tạo...</span> : "Tạo"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên khoản phí</TableHead>
                <TableHead>Số tiền</TableHead>
                <TableHead>Hạn đóng</TableHead>
                <TableHead>Tiến độ</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fees.map((fee) => (
                <TableRow key={fee.id}>
                  <TableCell className="font-medium">{fee.title}</TableCell>
                  <TableCell className="font-semibold">{fee.amount.toLocaleString("vi-VN")} ₫</TableCell>
                  <TableCell>{fee.dueDate}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm">
                        {(fee.paidMembers ?? 0)}/{fee.totalMembers ?? 0} thành viên
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${((fee.paidMembers ?? 0) / ((fee.totalMembers ?? 1))) * 100}%` }} />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getFeeStatusBadge(fee.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="ghost">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDeleteFee(String(fee.id))}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}