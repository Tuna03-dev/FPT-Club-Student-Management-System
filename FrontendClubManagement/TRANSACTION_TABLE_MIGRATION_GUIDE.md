# TransactionsTable Migration Guide - Zod Form Integration

## ✅ Đã Hoàn Thành

File `TransactionsTable.tsx` đã được **refactor** để tích hợp **Zod Form** thông qua `CreateTransactionFormDialog`.

## 🔄 Những Thay Đổi

### 1. **Props Changes**

#### ❌ Removed Props:
```tsx
onAddTransaction: () => void;  // Không cần nữa
```

#### ✅ New Props:
```tsx
clubId: number;  // REQUIRED - để CreateTransactionFormDialog fetch members
onCreateIncome: (data: CreateIncomeTransactionRequest) => Promise<void>;
onCreateOutcome: (data: CreateOutcomeTransactionRequest) => Promise<void>;
```

### 2. **Dialog Replacement**
- ❌ **Old**: Dialog cũ inline với Input/Textarea thuần (không có validation)
- ✅ **New**: `CreateTransactionFormDialog` với Zod validation + React Hook Form

### 3. **Code Removed**
- Dialog content cũ (210+ lines code)
- `feeSearch` state và `filteredFees` memo (đã được handle trong form component)

## 📝 Migration Steps cho Parent Components

### Trước (Old Code):

```tsx
import { TransactionsTable } from "@/components/features/finance/TransactionsTable";

function FinancePage() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  const handleAddTransaction = () => {
    setIsAddOpen(true);
  };

  return (
    <TransactionsTable
      transactions={transactions}
      transactionType="INCOME"
      onAddTransaction={handleAddTransaction}  // ❌ Removed
      onEditTransaction={handleEdit}
      onDeleteTransaction={handleDelete}
      onApproveTransaction={handleApprove}
      onRejectTransaction={handleReject}
      isAddOpen={isAddOpen}
      setIsAddOpen={setIsAddOpen}
      fees={fees}
      loading={loading}
      // ... other props
    />
  );
}
```

### Sau (New Code):

```tsx
import { TransactionsTable } from "@/components/features/finance/TransactionsTable";
import { incomeTransactionService } from "@/services/transactionService";
import { outcomeTransactionService } from "@/services/transactionService";
import type {
  CreateIncomeTransactionRequest,
  CreateOutcomeTransactionRequest,
} from "@/services/transactionService";

function FinancePage() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const clubId = Number(params.clubId); // Get from your router params

  // ✅ NEW: Income handler
  const handleCreateIncome = async (data: CreateIncomeTransactionRequest) => {
    try {
      const response = await incomeTransactionService.create(clubId, data);
      if (response.code === 200) {
        // Refresh income transactions
        await refetchIncomeTransactions();
      }
    } catch (error) {
      console.error("Failed to create income transaction:", error);
      throw error; // Let form handle the error
    }
  };

  // ✅ NEW: Outcome handler
  const handleCreateOutcome = async (data: CreateOutcomeTransactionRequest) => {
    try {
      const response = await outcomeTransactionService.create(clubId, data);
      if (response.code === 200) {
        // Refresh outcome transactions
        await refetchOutcomeTransactions();
      }
    } catch (error) {
      console.error("Failed to create outcome transaction:", error);
      throw error; // Let form handle the error
    }
  };

  return (
    <TransactionsTable
      transactions={transactions}
      transactionType="INCOME"
      clubId={clubId}  // ✅ NEW: Required
      onCreateIncome={handleCreateIncome}  // ✅ NEW: Required
      onCreateOutcome={handleCreateOutcome}  // ✅ NEW: Required
      onEditTransaction={handleEdit}
      onDeleteTransaction={handleDelete}
      onApproveTransaction={handleApprove}
      onRejectTransaction={handleReject}
      isAddOpen={isAddOpen}
      setIsAddOpen={setIsAddOpen}
      fees={fees}
      loading={loading}
      // ... other props
    />
  );
}
```

## 🎯 Key Points

### 1. **clubId is Required**
```tsx
clubId={Number(params.clubId)}  // From router params
// hoặc
clubId={club.id}  // From club context/state
```

### 2. **Handler Functions Must Be Async**
```tsx
const handleCreateIncome = async (data: CreateIncomeTransactionRequest) => {
  // Call API
  await incomeTransactionService.create(clubId, data);
  // Refresh data
  await refetchData();
};
```

### 3. **Error Handling**
Form component sẽ tự động handle errors nếu bạn throw error:
```tsx
const handleCreateIncome = async (data) => {
  try {
    await createAPI(data);
  } catch (error) {
    throw error;  // Form sẽ hiển thị error toast
  }
};
```

### 4. **Success Toast**
Form component đã tự động hiển thị success toast, không cần thêm trong handler.

## 📦 Required Imports

```tsx
import type {
  CreateIncomeTransactionRequest,
  CreateOutcomeTransactionRequest,
} from "@/services/transactionService";
```

## ✨ Benefits

| Feature | Before | After |
|---------|--------|-------|
| Validation | ❌ None | ✅ Zod Schema |
| Type Safety | ⚠️ Partial | ✅ Full |
| Error Messages | ❌ None | ✅ Vietnamese |
| Image Upload | ❌ No | ✅ Yes + Preview |
| Member Search | ❌ No | ✅ Yes |
| Fee Search | ✅ Basic | ✅ Advanced |
| Form Reset | ❌ Manual | ✅ Auto |
| Code Lines | ~220 lines | ~20 lines |

## 🐛 Common Issues

### Issue 1: Missing clubId
**Error**: `clubId is required`
**Solution**: Pass clubId prop to TransactionsTable

### Issue 2: onCreateIncome/onCreateOutcome not provided
**Error**: TypeScript error
**Solution**: Implement both handlers even if only using one transaction type

### Issue 3: Handler không async
**Error**: Promise rejection not handled
**Solution**: Make handler async và await API calls

## 📋 Checklist

Sau khi migration, verify:

- [ ] TransactionsTable nhận đủ props mới (clubId, onCreateIncome, onCreateOutcome)
- [ ] Handler functions được implement và async
- [ ] API services được import đúng
- [ ] RefreshData được gọi sau khi create thành công
- [ ] Test create Income transaction
- [ ] Test create Outcome transaction
- [ ] Test validation (submit form trống)
- [ ] Test image upload
- [ ] Test member search (Income)
- [ ] Test fee search (Income)
- [ ] Verify no TypeScript errors
- [ ] Verify no linter warnings

## 🎓 Example Parent Component

Xem file `Finance.tsx` (nếu có) hoặc tham khảo example:

```tsx
// Example: FinanceTabsPage.tsx
import { useState } from "react";
import { TransactionsTable } from "@/components/features/finance/TransactionsTable";
import { useParams } from "react-router-dom";
import { incomeTransactionService, outcomeTransactionService } from "@/services/transactionService";

export function FinanceTabsPage() {
  const { clubId } = useParams();
  const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false);
  const [isOutcomeDialogOpen, setIsOutcomeDialogOpen] = useState(false);
  
  // Fetch data
  const { data: incomeData, refetch: refetchIncome } = useIncomeTransactions(clubId);
  const { data: outcomeData, refetch: refetchOutcome } = useOutcomeTransactions(clubId);
  const { data: fees } = useFees(clubId);

  const handleCreateIncome = async (data) => {
    await incomeTransactionService.create(Number(clubId), data);
    await refetchIncome();
  };

  const handleCreateOutcome = async (data) => {
    await outcomeTransactionService.create(Number(clubId), data);
    await refetchOutcome();
  };

  return (
    <div className="space-y-6">
      <TransactionsTable
        transactions={incomeData?.content || []}
        transactionType="INCOME"
        clubId={Number(clubId)}
        onCreateIncome={handleCreateIncome}
        onCreateOutcome={handleCreateOutcome}
        isAddOpen={isIncomeDialogOpen}
        setIsAddOpen={setIsIncomeDialogOpen}
        fees={fees || []}
        {...otherProps}
      />

      <TransactionsTable
        transactions={outcomeData?.content || []}
        transactionType="OUTCOME"
        clubId={Number(clubId)}
        onCreateIncome={handleCreateIncome}
        onCreateOutcome={handleCreateOutcome}
        isAddOpen={isOutcomeDialogOpen}
        setIsAddOpen={setIsOutcomeDialogOpen}
        fees={fees || []}
        {...otherProps}
      />
    </div>
  );
}
```

---

**Migration Completed**: 2024-11-24  
**Breaking Changes**: Yes (Props interface changed)  
**Backward Compatible**: No (Must update parent components)


