// // src/components/finance/TransactionsTable.tsx
// import {
//   Card,
//   CardContent,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
//   DialogFooter,
// } from "@/components/ui/dialog";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { Badge } from "@/components/ui/badge";
// import { CheckCircle, Clock, Edit, Plus, Trash2, XCircle } from "lucide-react";
// import { toast } from "sonner";
// // import type { Transaction, TransactionStatus } from "@/types/fee";

// interface TransactionsTableProps {
//   transactions: Transaction[];
//   onAddTransaction: () => void;
//   onEditTransaction: (transaction: Transaction) => void;
//   onDeleteTransaction: (id: string) => void;
//   onApproveTransaction: (id: string) => void;
//   onRejectTransaction: (id: string) => void;
//   isAddOpen: boolean;
//   setIsAddOpen: (open: boolean) => void;
// }

// export function TransactionsTable({
//   transactions,
//   onAddTransaction,
//   onEditTransaction,
//   onDeleteTransaction,
//   onApproveTransaction,
//   onRejectTransaction,
//   isAddOpen,
//   setIsAddOpen,
// }: TransactionsTableProps) {
//   const getStatusBadge = (status: TransactionStatus) => {
//     const variants = {
//       completed: {
//         label: "Hoàn thành",
//         icon: CheckCircle,
//         color: "bg-green-500/10 text-green-500",
//       },
//       pending: {
//         label: "Chờ duyệt",
//         icon: Clock,
//         color: "bg-yellow-500/10 text-yellow-500",
//       },
//       rejected: {
//         label: "Từ chối",
//         icon: XCircle,
//         color: "bg-red-500/10 text-red-500",
//       },
//     } as const;
//     const variant = variants[status];
//     const Icon = variant.icon;
//     return (
//       <Badge className={variant.color}>
//         <Icon className="w-3 h-3 mr-1" />
//         {variant.label}
//       </Badge>
//     );
//   };

//   return (
//     <>
//       <Card>
//         <CardHeader className="flex flex-row items-center justify-between">
//           <div>
//             <CardTitle>Danh sách giao dịch</CardTitle>
//             <p className="text-sm text-muted-foreground mt-1">
//               Quản lý thu chi của CLB
//             </p>
//           </div>
//           <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
//             <DialogTrigger asChild>
//               <Button onClick={onAddTransaction}>
//                 <Plus className="w-4 h-4 mr-2" />
//                 Thêm giao dịch
//               </Button>
//             </DialogTrigger>
//             <DialogContent>
//               <DialogHeader>
//                 <DialogTitle>Thêm giao dịch mới</DialogTitle>
//               </DialogHeader>
//               <div className="space-y-4">
//                 <div>
//                   <Label>Loại giao dịch</Label>
//                   <select className="w-full mt-1 px-3 py-2 border rounded-md">
//                     <option value="income">Thu</option>
//                     <option value="expense">Chi</option>
//                   </select>
//                 </div>
//                 <div>
//                   <Label>Mô tả</Label>
//                   <Input placeholder="Nhập mô tả giao dịch" />
//                 </div>
//                 <div>
//                   <Label>Danh mục</Label>
//                   <Input placeholder="Ví dụ: Sự kiện, Văn phòng, Tài trợ..." />
//                 </div>
//                 <div>
//                   <Label>Số tiền (₫)</Label>
//                   <Input type="number" placeholder="0" />
//                 </div>
//                 <div>
//                   <Label>Ngày</Label>
//                   <Input type="date" />
//                 </div>
//                 <div>
//                   <Label>Ghi chú</Label>
//                   <Textarea placeholder="Thêm ghi chú (tùy chọn)" />
//                 </div>
//               </div>
//               <DialogFooter>
//                 <Button variant="outline" onClick={() => setIsAddOpen(false)}>
//                   Hủy
//                 </Button>
//                 <Button
//                   onClick={() => {
//                     toast("Đã thêm giao dịch");
//                     setIsAddOpen(false);
//                   }}
//                 >
//                   Lưu
//                 </Button>
//               </DialogFooter>
//             </DialogContent>
//           </Dialog>
//         </CardHeader>
//         <CardContent>
//           <Table>
//             <TableHeader>
//               <TableRow>
//                 <TableHead>Ngày</TableHead>
//                 <TableHead>Loại</TableHead>
//                 <TableHead>Mô tả</TableHead>
//                 <TableHead>Danh mục</TableHead>
//                 <TableHead>Người tạo</TableHead>
//                 <TableHead className="text-right">Số tiền</TableHead>
//                 <TableHead>Trạng thái</TableHead>
//                 <TableHead className="text-right">Thao tác</TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {transactions.map((transaction) => (
//                 <TableRow key={transaction.id}>
//                   <TableCell>{transaction.date}</TableCell>
//                   <TableCell>
//                     <Badge
//                       variant={
//                         transaction.type === "income"
//                           ? "default"
//                           : "secondary"
//                       }
//                     >
//                       {transaction.type === "income" ? "Thu" : "Chi"}
//                     </Badge>
//                   </TableCell>
//                   <TableCell className="font-medium">
//                     {transaction.description}
//                   </TableCell>
//                   <TableCell>{transaction.category}</TableCell>
//                   <TableCell className="text-sm text-muted-foreground">
//                     {transaction.submittedBy || "-"}
//                   </TableCell>
//                   <TableCell
//                     className={`text-right font-semibold ${
//                       transaction.type === "income"
//                         ? "text-green-500"
//                         : "text-red-500"
//                     }`}
//                   >
//                     {transaction.type === "income" ? "+" : "-"}
//                     {transaction.amount.toLocaleString("vi-VN")} ₫
//                   </TableCell>
//                   <TableCell>
//                     {getStatusBadge(transaction.status)}
//                   </TableCell>
//                   <TableCell>
//                     <div className="flex items-center justify-end gap-2">
//                       {transaction.status === "pending" && (
//                         <>
//                           <Button
//                             size="sm"
//                             variant="ghost"
//                             onClick={() =>
//                               onApproveTransaction(transaction.id)
//                             }
//                           >
//                             <CheckCircle className="w-4 h-4 text-green-500" />
//                           </Button>
//                           <Button
//                             size="sm"
//                             variant="ghost"
//                             onClick={() =>
//                               onRejectTransaction(transaction.id)
//                             }
//                           >
//                             <XCircle className="w-4 h-4 text-red-500" />
//                           </Button>
//                         </>
//                       )}
//                       <Button
//                         size="sm"
//                         variant="ghost"
//                         onClick={() => onEditTransaction(transaction)}
//                       >
//                         <Edit className="w-4 h-4" />
//                       </Button>
//                       <Button
//                         size="sm"
//                         variant="ghost"
//                         onClick={() =>
//                           onDeleteTransaction(transaction.id)
//                         }
//                       >
//                         <Trash2 className="w-4 h-4 text-destructive" />
//                       </Button>
//                     </div>
//                   </TableCell>
//                 </TableRow>
//               ))}
//             </TableBody>
//           </Table>
//         </CardContent>
//       </Card>
//     </>
//   );
// }