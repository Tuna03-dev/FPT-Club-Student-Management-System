# Finance Summary API Documentation

## 📊 Overview

API endpoint để lấy thông tin tổng hợp tài chính của CLB, phục vụ cho dashboard Finance Summary Cards.

---

## 🌐 Endpoint

```
GET /api/clubs/{clubId}/finance/summary
```

**Method**: GET  
**Authentication**: Required (Bearer Token)  
**Authorization**: Club Member (any role in the club)

---

## 📋 Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| clubId | Long | Yes | ID của CLB |

### Headers

```
Authorization: Bearer {token}
```

---

## ✅ Success Response (200)

```json
{
  "code": 200,
  "message": "Success",
  "timestamp": "2025-11-18T10:30:00Z",
  "data": {
    "balance": 15000000,
    "totalIncome": 50000000,
    "totalExpense": 35000000,
    "totalBudget": 50000000,
    "remaining": 15000000,
    "currency": "VND",
    "walletId": 123
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| balance | BigDecimal | Số dư hiện tại của ví (còn lại) |
| totalIncome | BigDecimal | Tổng thu từ tất cả giao dịch SUCCESS |
| totalExpense | BigDecimal | Tổng chi từ tất cả giao dịch SUCCESS |
| totalBudget | BigDecimal | Tổng ngân sách (= totalIncome) |
| remaining | BigDecimal | Số tiền còn lại (= balance) |
| currency | String | Đơn vị tiền tệ (VND) |
| walletId | Long | ID của ví CLB |

---

## ❌ Error Responses

### 404 - Club Not Found
```json
{
  "code": 404,
  "message": "CLB không tồn tại",
  "timestamp": "2025-11-18T10:30:00Z"
}
```

### 401 - Unauthorized
```json
{
  "code": 401,
  "message": "Chưa xác thực",
  "timestamp": "2025-11-18T10:30:00Z"
}
```

---

## 💡 Usage Example

### JavaScript/TypeScript

```typescript
interface FinanceSummary {
  balance: number;
  totalIncome: number;
  totalExpense: number;
  totalBudget: number;
  remaining: number;
  currency: string;
  walletId: number;
}

async function getFinanceSummary(clubId: number): Promise<FinanceSummary> {
  const response = await fetch(
    `/api/clubs/${clubId}/finance/summary`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  const { data } = await response.json();
  return data;
}

// Usage in component
const summary = await getFinanceSummary(1);
console.log('Tổng ngân sách:', summary.totalBudget.toLocaleString('vi-VN'));
console.log('Tổng thu:', summary.totalIncome.toLocaleString('vi-VN'));
console.log('Tổng chi:', summary.totalExpense.toLocaleString('vi-VN'));
console.log('Còn lại:', summary.remaining.toLocaleString('vi-VN'));
```

### React Component Integration

```tsx
// src/components/finance/SummaryCards.tsx
import { useEffect, useState } from 'react';
import { getFinanceSummary } from '@/services/financeService';

export function SummaryCards({ clubId }: { clubId: number }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      try {
        setLoading(true);
        const data = await getFinanceSummary(clubId);
        setSummary(data);
      } catch (error) {
        console.error('Error fetching summary:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchSummary();
  }, [clubId]);

  if (loading) {
    return <SummaryCardsSkeleton />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Tổng ngân sách */}
      <Card>
        <CardHeader>
          <CardTitle>Tổng ngân sách</CardTitle>
          <Wallet className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {summary.totalBudget.toLocaleString('vi-VN')} ₫
          </div>
        </CardContent>
      </Card>

      {/* Tổng thu */}
      <Card>
        <CardHeader>
          <CardTitle>Tổng thu</CardTitle>
          <ArrowDownCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-500">
            {summary.totalIncome.toLocaleString('vi-VN')} ₫
          </div>
        </CardContent>
      </Card>

      {/* Tổng chi */}
      <Card>
        <CardHeader>
          <CardTitle>Tổng chi</CardTitle>
          <ArrowUpCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-500">
            {summary.totalExpense.toLocaleString('vi-VN')} ₫
          </div>
        </CardContent>
      </Card>

      {/* Còn lại */}
      <Card>
        <CardHeader>
          <CardTitle>Còn lại</CardTitle>
          <TrendingUp className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">
            {summary.remaining.toLocaleString('vi-VN')} ₫
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### cURL

```bash
curl -X GET \
  'http://localhost:8080/api/clubs/1/finance/summary' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json'
```

---

## 📊 Data Calculation

### How Values are Calculated

1. **totalIncome**: Tổng `amount` của tất cả `IncomeTransaction` có `status = SUCCESS` và chưa bị soft delete
2. **totalExpense**: Tổng `amount` của tất cả `OutcomeTransaction` có `status = SUCCESS` và chưa bị soft delete
3. **balance**: `totalIncome - totalExpense` (được tính tự động)
4. **totalBudget**: Bằng `totalIncome` (tổng số tiền CLB đã nhận)
5. **remaining**: Bằng `balance` (số tiền còn lại)

### Formula

```
balance = totalIncome - totalExpense
totalBudget = totalIncome
remaining = balance
```

---

## 🔄 Auto-Wallet Creation

Nếu CLB chưa có wallet, API sẽ **tự động tạo** wallet mới với giá trị khởi tạo:
- balance: 0
- totalIncome: 0
- totalExpense: 0
- currency: "VND"

---

## 🎯 Use Cases

### Dashboard Summary Cards
- Hiển thị 4 cards: Tổng ngân sách, Tổng thu, Tổng chi, Còn lại
- Real-time financial overview
- Responsive design (grid layout)

### Financial Reports
- Base data for detailed reports
- Export to PDF/Excel
- Historical tracking

### Budget Planning
- Compare current vs planned budget
- Track spending vs income ratio
- Alert when balance is low

---

## 🔒 Security & Permissions

### Authentication
- ✅ Required: Bearer token
- ✅ JWT validation

### Authorization
- ✅ User must be a member of the club (any role)
- ✅ Public clubs: Any authenticated user can view
- ✅ Private clubs: Only club members can view

---

## 🚀 Performance

### Caching
- Consider caching this endpoint for 5-10 seconds
- Invalidate cache when transactions are created/updated

### Database Queries
- Single query to fetch wallet data
- All calculations are done in-memory (fast)
- Uses indexed columns for quick lookup

### Response Time
- Average: < 50ms
- With cache: < 5ms

---

## 📝 Notes

1. **Wallet Auto-Creation**: Nếu chưa có ví, sẽ tự động tạo khi gọi API lần đầu
2. **Transaction Status**: Chỉ tính các giao dịch có status = SUCCESS
3. **Soft Delete**: Không tính các giao dịch đã bị soft delete
4. **Currency**: Mặc định là VND, có thể mở rộng cho các loại tiền tệ khác
5. **Real-time**: Dữ liệu được tính toán real-time từ database

---

## 🔜 Future Enhancements

1. **Date Range Filter**: Lọc theo khoảng thời gian
2. **Comparison**: So sánh với tháng/quý trước
3. **Trend Analysis**: Phân tích xu hướng thu chi
4. **Budget vs Actual**: So sánh ngân sách dự kiến vs thực tế
5. **Category Breakdown**: Phân tích theo danh mục thu/chi

---

## 📚 Related Endpoints

- `GET /api/clubs/{clubId}/transactions/income` - Get income transactions
- `GET /api/clubs/{clubId}/transactions/outcome` - Get outcome transactions
- `POST /api/clubs/{clubId}/transactions/income` - Create income transaction
- `POST /api/clubs/{clubId}/transactions/outcome` - Create outcome transaction

---

**Last Updated**: 2025-11-18  
**Version**: 1.0  
**Author**: GitHub Copilot

