# Transaction API Endpoints Summary

## API Endpoints Overview

### Income Transactions (Giao dịch THU)
Base URL: `/api/clubs/{clubId}/transactions/income`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/` | Lấy danh sách giao dịch thu | Query params: page, size, status | PageResponse<IncomeTransactionResponse> |
| GET | `/{transactionId}` | Lấy chi tiết 1 giao dịch thu | - | IncomeTransactionResponse |
| POST | `/` | Tạo giao dịch thu mới | CreateIncomeTransactionRequest | IncomeTransactionResponse |
| PUT | `/{transactionId}` | Cập nhật giao dịch thu (chỉ PENDING) | UpdateIncomeTransactionRequest | IncomeTransactionResponse |
| POST | `/{transactionId}/approve` | Duyệt giao dịch (PENDING → SUCCESS) | - | IncomeTransactionResponse |
| POST | `/{transactionId}/reject` | Từ chối giao dịch (PENDING → CANCELLED) | - | IncomeTransactionResponse |
| DELETE | `/{transactionId}` | Xóa giao dịch (chỉ PENDING/CANCELLED) | - | void |

### Outcome Transactions (Giao dịch CHI)
Base URL: `/api/clubs/{clubId}/transactions/outcome`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/` | Lấy danh sách giao dịch chi | Query params: page, size, status | PageResponse<OutcomeTransactionResponse> |
| GET | `/{transactionId}` | Lấy chi tiết 1 giao dịch chi | - | OutcomeTransactionResponse |
| POST | `/` | Tạo giao dịch chi mới | CreateOutcomeTransactionRequest | OutcomeTransactionResponse |
| PUT | `/{transactionId}` | Cập nhật giao dịch chi (chỉ PENDING) | UpdateOutcomeTransactionRequest | OutcomeTransactionResponse |
| POST | `/{transactionId}/approve` | Duyệt giao dịch (PENDING → SUCCESS) | - | OutcomeTransactionResponse |
| POST | `/{transactionId}/reject` | Từ chối giao dịch (PENDING → CANCELLED) | - | OutcomeTransactionResponse |
| DELETE | `/{transactionId}` | Xóa giao dịch (chỉ PENDING/CANCELLED) | - | void |

### Combined Transactions (Tất cả giao dịch)
Base URL: `/api/clubs/{clubId}/transactions`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/` | Lấy tất cả giao dịch (THU + CHI) | Query params: page, size, status | PageResponse<TransactionResponse> |

---

## Request DTOs

### CreateIncomeTransactionRequest
```json
{
  "amount": 100000.00,           // required, > 0
  "description": "string",        // required, max 1000 chars
  "transactionDate": "2024-01-01T12:00:00",  // required
  "source": "string",             // required, max 200 chars (VD: Học phí, Tài trợ)
  "notes": "string",              // optional, max 2000 chars
  "feeId": 123,                   // optional
  "userId": 456                   // optional
}
```

### UpdateIncomeTransactionRequest
Same as CreateIncomeTransactionRequest

### CreateOutcomeTransactionRequest
```json
{
  "amount": 50000.00,            // required, > 0
  "description": "string",        // required, max 1000 chars
  "transactionDate": "2024-01-01T12:00:00",  // required
  "recipient": "string",          // required, max 200 chars
  "purpose": "string",            // required, max 200 chars
  "notes": "string",              // optional, max 2000 chars
  "receiptUrl": "string"          // optional, max 500 chars
}
```

### UpdateOutcomeTransactionRequest
Same as CreateOutcomeTransactionRequest

---

## Response DTOs

### IncomeTransactionResponse
```json
{
  "id": 1,
  "reference": "INC-20240101120000-ABC12345",
  "amount": 100000.00,
  "description": "Học phí kỳ 1",
  "transactionDate": "2024-01-01T12:00:00",
  "source": "Học phí",
  "status": "PENDING",
  "notes": "Ghi chú",
  "feeId": 123,
  "feeTitle": "Học phí kỳ 1 2024",
  "userId": 456,
  "userName": "Nguyễn Văn A",
  "userEmail": "nguyenvana@example.com",
  "createdAt": "2024-01-01T10:00:00",
  "updatedAt": "2024-01-01T10:00:00",
  "createdByName": "Admin User"
}
```

### OutcomeTransactionResponse
```json
{
  "id": 2,
  "transactionCode": "OUT-20240101130000-XYZ67890",
  "amount": 50000.00,
  "description": "Chi phí mua thiết bị",
  "transactionDate": "2024-01-01T13:00:00",
  "recipient": "Nhà cung cấp ABC",
  "purpose": "Mua thiết bị",
  "status": "SUCCESS",
  "notes": "Ghi chú",
  "receiptUrl": "https://example.com/receipt.pdf",
  "createdAt": "2024-01-01T11:00:00",
  "updatedAt": "2024-01-01T11:00:00",
  "createdByName": "Admin User"
}
```

### TransactionResponse (Combined)
```json
{
  "id": 1,
  "code": "INC-20240101120000-ABC12345",
  "amount": 100000.00,
  "description": "Học phí kỳ 1",
  "transactionDate": "2024-01-01T12:00:00",
  "type": "INCOME",              // INCOME | OUTCOME
  "status": "SUCCESS",
  
  // Income specific
  "source": "Học phí",
  "feeId": 123,
  "feeTitle": "Học phí kỳ 1 2024",
  
  // Outcome specific (null for income)
  "recipient": null,
  "purpose": null,
  "receiptUrl": null,
  
  // Common
  "notes": "Ghi chú",
  "createdBy": "Admin User",
  "createdAt": "2024-01-01T10:00:00",
  "updatedAt": "2024-01-01T10:00:00"
}
```

---

## Transaction Status Flow

```
PENDING (Chờ xử lý)
  ├─> approve() ──> SUCCESS (Thành công)
  └─> reject() ───> CANCELLED (Đã hủy)

SUCCESS/CANCELLED: Cannot be modified or deleted
PENDING: Can be updated, approved, rejected, or deleted
```

---

## Business Logic

### Income Transaction Approval
1. Change status: PENDING → SUCCESS
2. Update wallet: `balance += amount`
3. Update wallet: `totalIncome += amount`

### Outcome Transaction Approval
1. Check: `wallet.balance >= amount`
2. If insufficient: throw INSUFFICIENT_WALLET_BALANCE
3. Change status: PENDING → SUCCESS
4. Update wallet: `balance -= amount`
5. Update wallet: `totalOutcome += amount`

---

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | int | 0 | Page number (0-indexed) |
| size | int | 10 | Page size |
| status | TransactionStatus | null | Filter by status (PENDING, SUCCESS, CANCELLED, FAILED) |

---

## Error Codes

| Code | Message | HTTP Status |
|------|---------|-------------|
| 5000 | Không tìm thấy ví câu lạc bộ | 404 NOT_FOUND |
| 5001 | Không tìm thấy giao dịch | 404 NOT_FOUND |
| 5002 | Giao dịch không thể chỉnh sửa | 400 BAD_REQUEST |
| 5003 | Giao dịch đã được xử lý | 400 BAD_REQUEST |
| 5004 | Giao dịch không thể xóa | 400 BAD_REQUEST |
| 5005 | Số dư ví không đủ | 400 BAD_REQUEST |
| 5006 | Không tìm thấy khoản phí | 404 NOT_FOUND |

---

## Example Usage

### Create Income Transaction
```bash
POST /api/clubs/1/transactions/income
Content-Type: application/json

{
  "amount": 100000,
  "description": "Học phí kỳ 1 năm 2024",
  "transactionDate": "2024-01-15T10:00:00",
  "source": "Học phí",
  "notes": "Thanh toán qua chuyển khoản",
  "feeId": 10,
  "userId": 25
}
```

### Approve Transaction
```bash
POST /api/clubs/1/transactions/income/123/approve
```

### Get All Transactions with Filter
```bash
GET /api/clubs/1/transactions?page=0&size=20&status=PENDING
```

### Create Outcome Transaction
```bash
POST /api/clubs/1/transactions/outcome
Content-Type: application/json

{
  "amount": 50000,
  "description": "Mua bóng đá cho CLB",
  "transactionDate": "2024-01-16T14:00:00",
  "recipient": "Cửa hàng thể thao ABC",
  "purpose": "Mua thiết bị",
  "notes": "Mua 5 quả bóng",
  "receiptUrl": "https://storage.example.com/receipts/123.pdf"
}
```

---

## Frontend Integration Tips

1. **Status Mapping**: Backend uses `SUCCESS`, frontend có thể hiển thị là "COMPLETED"
2. **Date Format**: Backend trả LocalDateTime theo ISO-8601, frontend cần parse
3. **Transaction Code**: Auto-generated, không cần gửi lên
4. **Decimal Numbers**: Dùng số thập phân với 2 chữ số (VD: 100000.00)
5. **Pagination**: Zero-indexed (page=0 là trang đầu)

