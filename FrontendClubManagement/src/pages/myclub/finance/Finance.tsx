import { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
  ExternalLink,
  CheckCircle,
  Clock,
  XCircle,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useParams } from "react-router-dom";
import { payosService } from "@/services/payosService";

type TransactionType = "income" | "expense" | "fee";
type TransactionStatus = "completed" | "pending" | "rejected";

interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  date: string;
  status: TransactionStatus;
  category?: string;
  submittedBy?: string;
}

interface Fee {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  totalMembers: number;
  paidMembers: number;
  status: "active" | "completed" | "overdue";
}

const mockTransactions: Transaction[] = [
  {
    id: "1",
    type: "expense",
    description: "Mua thiết bị sự kiện",
    amount: 5000000,
    date: "2024-01-15",
    status: "completed",
    category: "Sự kiện",
    submittedBy: "Nguyễn Văn A",
  },
  {
    id: "2",
    type: "income",
    description: "Tài trợ từ nhà tài trợ A",
    amount: 10000000,
    date: "2024-01-14",
    status: "completed",
    category: "Tài trợ",
  },
  {
    id: "3",
    type: "expense",
    description: "Chi phí văn phòng phẩm",
    amount: 500000,
    date: "2024-01-12",
    status: "completed",
    category: "Văn phòng",
    submittedBy: "Trần Thị B",
  },
  {
    id: "4",
    type: "expense",
    description: "Phí địa điểm sự kiện",
    amount: 3000000,
    date: "2024-01-10",
    status: "pending",
    category: "Sự kiện",
    submittedBy: "Lê Văn C",
  },
  {
    id: "5",
    type: "income",
    description: "Học phí thành viên kỳ 1",
    amount: 15000000,
    date: "2024-01-08",
    status: "completed",
    category: "Học phí",
  },
];

const mockFees: Fee[] = [
  {
    id: "1",
    name: "Học phí kỳ 1 năm 2024",
    amount: 500000,
    dueDate: "2024-02-15",
    totalMembers: 50,
    paidMembers: 30,
    status: "active",
  },
  {
    id: "2",
    name: "Phí sự kiện Tết",
    amount: 200000,
    dueDate: "2024-01-20",
    totalMembers: 50,
    paidMembers: 50,
    status: "completed",
  },
  {
    id: "3",
    name: "Học phí kỳ 2 năm 2023",
    amount: 500000,
    dueDate: "2023-12-15",
    totalMembers: 45,
    paidMembers: 42,
    status: "overdue",
  },
];

const mockFinanceData = {
  totalBudget: 50000000,
  spent: 32000000,
  remaining: 18000000,
};

export default function Finance() {
  const { clubId = "0" } = useParams();
  const numericClubId = Number(clubId);
  const [transactions, setTransactions] =
    useState<Transaction[]>(mockTransactions);
  const [fees, setFees] = useState<Fee[]>(mockFees);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isAddFeeOpen, setIsAddFeeOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [editingFee, setEditingFee] = useState<Fee | null>(null);
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

  const handleDeleteTransaction = (id: string) => {
    setTransactions(transactions.filter((t) => t.id !== id));
    toast("Đã xóa giao dịch");
  };

  const handleDeleteFee = (id: string) => {
    setFees(fees.filter((f) => f.id !== id));
    toast("Đã xóa khoản phí");
  };

  const handleApproveTransaction = (id: string) => {
    setTransactions(
      transactions.map((t) =>
        t.id === id ? { ...t, status: "completed" as TransactionStatus } : t
      )
    );
    toast("Đã duyệt giao dịch");
  };

  const handleRejectTransaction = (id: string) => {
    setTransactions(
      transactions.map((t) =>
        t.id === id ? { ...t, status: "rejected" as TransactionStatus } : t
      )
    );
    toast("Đã từ chối giao dịch");
  };

  const getStatusBadge = (status: TransactionStatus) => {
    const variants = {
      completed: {
        label: "Hoàn thành",
        icon: CheckCircle,
        color: "bg-green-500/10 text-green-500",
      },
      pending: {
        label: "Chờ duyệt",
        icon: Clock,
        color: "bg-yellow-500/10 text-yellow-500",
      },
      rejected: {
        label: "Từ chối",
        icon: XCircle,
        color: "bg-red-500/10 text-red-500",
      },
    } as const;
    const variant = variants[status];
    const Icon = variant.icon;
    return (
      <Badge className={variant.color}>
        <Icon className="w-3 h-3 mr-1" />
        {variant.label}
      </Badge>
    );
  };

  const getFeeStatusBadge = (status: Fee["status"]) => {
    const variants = {
      active: { label: "Đang mở", color: "bg-blue-500/10 text-blue-500" },
      completed: {
        label: "Hoàn thành",
        color: "bg-green-500/10 text-green-500",
      },
      overdue: { label: "Quá hạn", color: "bg-red-500/10 text-red-500" },
    } as const;
    return (
      <Badge className={variants[status].color}>{variants[status].label}</Badge>
    );
  };

  const totalIncome = transactions
    .filter((t) => t.type === "income" && t.status === "completed")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "expense" && t.status === "completed")
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

        {/* Summary Cards */}
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
                {(
                  mockFinanceData.totalBudget +
                  totalIncome -
                  totalExpense
                ).toLocaleString("vi-VN")}{" "}
                ₫
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="transactions" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="transactions">Giao dịch</TabsTrigger>
            <TabsTrigger value="fees">Quản lý phí</TabsTrigger>
            <TabsTrigger value="payos">Tích hợp PayOS</TabsTrigger>
          </TabsList>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Danh sách giao dịch</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Quản lý thu chi của CLB
                  </p>
                </div>
                <Dialog
                  open={isAddTransactionOpen}
                  onOpenChange={setIsAddTransactionOpen}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Thêm giao dịch
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Thêm giao dịch mới</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Loại giao dịch</Label>
                        <select className="w-full mt-1 px-3 py-2 border rounded-md">
                          <option value="income">Thu</option>
                          <option value="expense">Chi</option>
                        </select>
                      </div>
                      <div>
                        <Label>Mô tả</Label>
                        <Input placeholder="Nhập mô tả giao dịch" />
                      </div>
                      <div>
                        <Label>Danh mục</Label>
                        <Input placeholder="Ví dụ: Sự kiện, Văn phòng, Tài trợ..." />
                      </div>
                      <div>
                        <Label>Số tiền (₫)</Label>
                        <Input type="number" placeholder="0" />
                      </div>
                      <div>
                        <Label>Ngày</Label>
                        <Input type="date" />
                      </div>
                      <div>
                        <Label>Ghi chú</Label>
                        <Textarea placeholder="Thêm ghi chú (tùy chọn)" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsAddTransactionOpen(false)}
                      >
                        Hủy
                      </Button>
                      <Button
                        onClick={() => {
                          toast("Đã thêm giao dịch");
                          setIsAddTransactionOpen(false);
                        }}
                      >
                        Lưu
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ngày</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Mô tả</TableHead>
                      <TableHead>Danh mục</TableHead>
                      <TableHead>Người tạo</TableHead>
                      <TableHead className="text-right">Số tiền</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{transaction.date}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              transaction.type === "income"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {transaction.type === "income" ? "Thu" : "Chi"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {transaction.description}
                        </TableCell>
                        <TableCell>{transaction.category}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {transaction.submittedBy || "-"}
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            transaction.type === "income"
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        >
                          {transaction.type === "income" ? "+" : "-"}
                          {transaction.amount.toLocaleString("vi-VN")} ₫
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(transaction.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            {transaction.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    handleApproveTransaction(transaction.id)
                                  }
                                >
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    handleRejectTransaction(transaction.id)
                                  }
                                >
                                  <XCircle className="w-4 h-4 text-red-500" />
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingTransaction(transaction)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleDeleteTransaction(transaction.id)
                              }
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
          </TabsContent>

          {/* Fees Tab */}
          <TabsContent value="fees" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Quản lý học phí & phí thành viên</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tạo và theo dõi các khoản phí
                  </p>
                </div>
                <Dialog open={isAddFeeOpen} onOpenChange={setIsAddFeeOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Tạo khoản phí
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Tạo khoản phí mới</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Tên khoản phí</Label>
                        <Input placeholder="Ví dụ: Học phí kỳ 1 năm 2024" />
                      </div>
                      <div>
                        <Label>Số tiền (₫)</Label>
                        <Input type="number" placeholder="0" />
                      </div>
                      <div>
                        <Label>Hạn đóng</Label>
                        <Input type="date" />
                      </div>
                      <div>
                        <Label>Mô tả</Label>
                        <Textarea placeholder="Thêm mô tả về khoản phí" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsAddFeeOpen(false)}
                      >
                        Hủy
                      </Button>
                      <Button
                        onClick={() => {
                          toast("Đã tạo khoản phí");
                          setIsAddFeeOpen(false);
                        }}
                      >
                        Tạo
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
                        <TableCell className="font-medium">
                          {fee.name}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {fee.amount.toLocaleString("vi-VN")} ₫
                        </TableCell>
                        <TableCell>{fee.dueDate}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">
                              {fee.paidMembers}/{fee.totalMembers} thành viên
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{
                                  width: `${
                                    (fee.paidMembers / fee.totalMembers) * 100
                                  }%`,
                                }}
                              />
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
                              onClick={() => handleDeleteFee(fee.id)}
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
          </TabsContent>

          {/* PayOS Integration Tab */}
          <TabsContent value="payos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tích hợp PayOS</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Hướng dẫn tích hợp cổng thanh toán PayOS để thu học phí trực
                  tuyến
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border-l-4 border-primary bg-primary/5 p-4 rounded-r-lg">
                  <h4 className="font-semibold mb-2">PayOS là gì?</h4>
                  <p className="text-sm text-muted-foreground">
                    PayOS là nền tảng thanh toán trực tuyến giúp CLB thu học
                    phí, phí sự kiện một cách tự động và an toàn. Hỗ trợ nhiều
                    phương thức thanh toán: chuyển khoản ngân hàng, ví điện tử,
                    QR Code.
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Các bước tích hợp PayOS:</h4>

                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        1
                      </div>
                      <div className="flex-1">
                        <h5 className="font-medium mb-2">
                          Đăng ký tài khoản PayOS
                        </h5>
                        <p className="text-sm text-muted-foreground mb-2">
                          Truy cập trang web PayOS và đăng ký tài khoản merchant
                        </p>
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href="https://payos.vn"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Truy cập PayOS
                          </a>
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        2
                      </div>
                      <div className="flex-1">
                        <h5 className="font-medium mb-2">Lấy API Keys</h5>
                        <p className="text-sm text-muted-foreground mb-2">
                          Sau khi đăng ký, vào phần Settings → API Keys để lấy:
                        </p>
                        <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                          <li>• Client ID</li>
                          <li>• API Key</li>
                          <li>• Checksum Key</li>
                        </ul>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        3
                      </div>
                      <div className="flex-1">
                        <h5 className="font-medium mb-2">Cấu hình trên FCM</h5>
                        <p className="text-sm text-muted-foreground mb-2">
                          Sau khi có API keys, bạn cần:
                        </p>
                        <div className="space-y-2">
                          <div className="bg-secondary/30 p-3 rounded-md">
                            <Label className="text-xs text-muted-foreground mb-1 block">
                              Client ID
                            </Label>
                            <Input placeholder="Nhập Client ID từ PayOS" value={clientId} onChange={(e) => setClientId(e.target.value)} />
                          </div>
                          <div className="bg-secondary/30 p-3 rounded-md">
                            <Label className="text-xs text-muted-foreground mb-1 block">
                              API Key
                            </Label>
                            <Input type="password" placeholder="Nhập API Key từ PayOS" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
                          </div>
                          <div className="bg-secondary/30 p-3 rounded-md">
                            <Label className="text-xs text-muted-foreground mb-1 block">
                              Checksum Key
                            </Label>
                            <Input type="password" placeholder="Nhập Checksum Key từ PayOS" value={checksumKey} onChange={(e) => setChecksumKey(e.target.value)} />
                          </div>
                          <Button
                            className="w-full mt-2"
                            disabled={payosLoading || !clientId || !apiKey || !checksumKey}
                            onClick={async () => {
                              if (!Number.isFinite(numericClubId) || numericClubId <= 0) return;
                              try {
                                setPayosLoading(true);
                                await payosService.upsertConfig(numericClubId, { clientId, apiKey, checksumKey });
                                toast("Đã lưu cấu hình PayOS");
                                setApiKey("");
                                setChecksumKey("");
                              } catch (e) {
                                toast("Không thể lưu cấu hình");
                              } finally {
                                setPayosLoading(false);
                              }
                            }}
                          >
                            {payosLoading ? "Đang lưu…" : "Lưu cấu hình"}
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full mt-2"
                            disabled={payosLoading}
                            onClick={async () => {
                              if (!Number.isFinite(numericClubId) || numericClubId <= 0) return;
                              try {
                                setPayosLoading(true);
                                const res = await payosService.testConnection(numericClubId);
                                const ok = res.data?.connected;
                                toast(ok ? "Kết nối PayOS thành công" : res.data?.message || "Kết nối thất bại");
                              } catch {
                                toast("Không thể kiểm tra kết nối");
                              } finally {
                                setPayosLoading(false);
                              }
                            }}
                          >
                            Kiểm tra kết nối
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        4
                      </div>
                      <div className="flex-1">
                        <h5 className="font-medium mb-2">Kiểm tra tích hợp</h5>
                        <p className="text-sm text-muted-foreground mb-2">
                          Sau khi cấu hình xong, hệ thống sẽ tự động:
                        </p>
                        <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                          <li>• Tạo link thanh toán cho từng khoản phí</li>
                          <li>
                            • Cập nhật trạng thái thanh toán tự động khi thành
                            viên đóng phí
                          </li>
                          <li>
                            • Gửi thông báo cho thành viên và quản trị viên
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-l-4 border-yellow-500 bg-yellow-500/5 p-4 rounded-r-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Lưu ý quan trọng
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>
                      • Cần xác minh danh tính doanh nghiệp/tổ chức để sử dụng
                      PayOS
                    </li>
                    <li>
                      • PayOS tính phí giao dịch khoảng 1.5% - 3% tùy phương
                      thức thanh toán
                    </li>
                    <li>
                      • Thời gian rút tiền về tài khoản: T+1 đến T+3 ngày làm
                      việc
                    </li>
                  </ul>
                </div>

                <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">Tài liệu API PayOS</h4>
                    <p className="text-sm text-muted-foreground">
                      Xem tài liệu chi tiết về API và tích hợp PayOS
                    </p>
                  </div>
                  <Button variant="outline" asChild>
                    <a
                      href="https://payos.vn/docs"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Xem tài liệu
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
