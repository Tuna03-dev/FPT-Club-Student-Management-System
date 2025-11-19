# Finance Summary API - Quick Reference

## 📊 Endpoint

```
GET /api/clubs/{clubId}/finance/summary
```

---

## 📋 Response

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "balance": 15000000,          // Số dư hiện tại
    "totalIncome": 50000000,      // Tổng thu
    "totalExpense": 35000000,     // Tổng chi
    "totalBudget": 50000000,      // Tổng ngân sách (= totalIncome)
    "remaining": 15000000,        // Còn lại (= balance)
    "currency": "VND",
    "walletId": 123
  }
}
```

---

## 💻 Frontend Integration

### Service Function

```typescript
// src/services/financeService.ts
export async function getFinanceSummary(clubId: number) {
  const response = await fetch(`/api/clubs/${clubId}/finance/summary`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const { data } = await response.json();
  return data;
}
```

### Component Usage

```tsx
// src/components/finance/SummaryCards.tsx
const [summary, setSummary] = useState(null);

useEffect(() => {
  getFinanceSummary(clubId).then(setSummary);
}, [clubId]);

return (
  <div className="grid grid-cols-4 gap-4">
    <Card>
      <CardTitle>Tổng ngân sách</CardTitle>
      <div>{summary.totalBudget.toLocaleString('vi-VN')} ₫</div>
    </Card>
    <Card>
      <CardTitle>Tổng thu</CardTitle>
      <div>{summary.totalIncome.toLocaleString('vi-VN')} ₫</div>
    </Card>
    <Card>
      <CardTitle>Tổng chi</CardTitle>
      <div>{summary.totalExpense.toLocaleString('vi-VN')} ₫</div>
    </Card>
    <Card>
      <CardTitle>Còn lại</CardTitle>
      <div>{summary.remaining.toLocaleString('vi-VN')} ₫</div>
    </Card>
  </div>
);
```

---

## 🎯 Key Features

✅ Auto-create wallet nếu chưa có  
✅ Real-time calculation  
✅ Chỉ tính giao dịch SUCCESS  
✅ Bỏ qua giao dịch soft deleted  

---

## 📐 Formula

```
totalIncome = SUM(IncomeTransaction WHERE status=SUCCESS)
totalExpense = SUM(OutcomeTransaction WHERE status=SUCCESS)
balance = totalIncome - totalExpense
totalBudget = totalIncome
remaining = balance
```

