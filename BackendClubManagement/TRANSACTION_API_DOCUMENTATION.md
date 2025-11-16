# Transaction Management API Documentation

## Overview
This document describes the REST APIs for managing Income and Outcome transactions for club financial management.

## Base URLs
- Income Transactions: `/api/clubs/{clubId}/transactions/income`
- Outcome Transactions: `/api/clubs/{clubId}/transactions/outcome`
- Combined Transactions: `/api/clubs/{clubId}/transactions`

## Transaction Status Flow
```
PENDING → SUCCESS (approved) or CANCELLED (rejected)
PROCESSING → SUCCESS or FAILED
```

---

## Income Transaction APIs

### 1. Get All Income Transactions
**GET** `/api/clubs/{clubId}/transactions/income`

Query Parameters:
- `page` (optional, default: 0) - Page number
- `size` (optional, default: 10) - Page size
- `status` (optional) - Filter by transaction status (PENDING, SUCCESS, CANCELLED, FAILED)

Response:
```json
{
  "code": 200,
  "message": "Success",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "content": [
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
    ],
    "pageNumber": 0,
    "pageSize": 10,
    "totalElements": 50,
    "totalPages": 5,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

### 2. Get Income Transaction by ID
**GET** `/api/clubs/{clubId}/transactions/income/{transactionId}`

### 3. Create Income Transaction
**POST** `/api/clubs/{clubId}/transactions/income`

Request Body:
```json
{
  "amount": 100000.00,
  "description": "Học phí kỳ 1",
  "transactionDate": "2024-01-01T12:00:00",
  "source": "Học phí",
  "notes": "Ghi chú tùy chọn",
  "feeId": 123,
  "userId": 456
}
```

### 4. Update Income Transaction
**PUT** `/api/clubs/{clubId}/transactions/income/{transactionId}`

Note: Only transactions with PENDING status can be updated.

Request Body: Same as Create

### 5. Approve Income Transaction
**POST** `/api/clubs/{clubId}/transactions/income/{transactionId}/approve`

Changes status from PENDING → SUCCESS and adds amount to club wallet balance.

### 6. Reject Income Transaction
**POST** `/api/clubs/{clubId}/transactions/income/{transactionId}/reject`

Changes status from PENDING → CANCELLED.

### 7. Delete Income Transaction
**DELETE** `/api/clubs/{clubId}/transactions/income/{transactionId}`

Note: Only PENDING or CANCELLED transactions can be deleted.

---

## Outcome Transaction APIs

### 1. Get All Outcome Transactions
**GET** `/api/clubs/{clubId}/transactions/outcome`

Query Parameters: Same as Income Transactions

Response Structure: Similar to Income, with these differences:
```json
{
  "transactionCode": "OUT-20240101120000-XYZ67890",
  "recipient": "Nhà cung cấp ABC",
  "purpose": "Mua thiết bị",
  "receiptUrl": "https://example.com/receipt.pdf"
}
```

### 2. Get Outcome Transaction by ID
**GET** `/api/clubs/{clubId}/transactions/outcome/{transactionId}`

### 3. Create Outcome Transaction
**POST** `/api/clubs/{clubId}/transactions/outcome`

Request Body:
```json
{
  "amount": 50000.00,
  "description": "Chi phí mua thiết bị",
  "transactionDate": "2024-01-01T12:00:00",
  "recipient": "Nhà cung cấp ABC",
  "purpose": "Mua thiết bị",
  "notes": "Ghi chú tùy chọn",
  "receiptUrl": "https://example.com/receipt.pdf"
}
```

### 4. Update Outcome Transaction
**PUT** `/api/clubs/{clubId}/transactions/outcome/{transactionId}`

Note: Only transactions with PENDING status can be updated.

### 5. Approve Outcome Transaction
**POST** `/api/clubs/{clubId}/transactions/outcome/{transactionId}/approve`

Changes status from PENDING → SUCCESS and deducts amount from club wallet balance.
Will fail if wallet balance is insufficient.

### 6. Reject Outcome Transaction
**POST** `/api/clubs/{clubId}/transactions/outcome/{transactionId}/reject`

Changes status from PENDING → CANCELLED.

### 7. Delete Outcome Transaction
**DELETE** `/api/clubs/{clubId}/transactions/outcome/{transactionId}`

Note: Only PENDING or CANCELLED transactions can be deleted.

---

## Combined Transaction APIs

### Get All Transactions (Income + Outcome)
**GET** `/api/clubs/{clubId}/transactions`

Query Parameters:
- `page` (optional, default: 0)
- `size` (optional, default: 10)
- `status` (optional) - Filter by status

Response includes both income and outcome transactions sorted by transactionDate:
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "content": [
      {
        "id": 1,
        "code": "INC-20240101120000-ABC12345",
        "amount": 100000.00,
        "description": "Học phí kỳ 1",
        "transactionDate": "2024-01-01T12:00:00",
        "type": "INCOME",
        "status": "SUCCESS",
        "source": "Học phí",
        "feeId": 123,
        "feeTitle": "Học phí kỳ 1 2024",
        "notes": "Ghi chú",
        "createdBy": "Admin User",
        "createdAt": "2024-01-01T10:00:00",
        "updatedAt": "2024-01-01T10:00:00"
      },
      {
        "id": 2,
        "code": "OUT-20240101130000-XYZ67890",
        "amount": 50000.00,
        "description": "Chi phí mua thiết bị",
        "transactionDate": "2024-01-01T13:00:00",
        "type": "OUTCOME",
        "status": "SUCCESS",
        "recipient": "Nhà cung cấp ABC",
        "purpose": "Mua thiết bị",
        "receiptUrl": "https://example.com/receipt.pdf",
        "notes": "Ghi chú",
        "createdBy": "Admin User",
        "createdAt": "2024-01-01T11:00:00",
        "updatedAt": "2024-01-01T11:00:00"
      }
    ],
    "pageNumber": 0,
    "pageSize": 10,
    "totalElements": 100,
    "totalPages": 10,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

---

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 5000 | Không tìm thấy ví câu lạc bộ | Club wallet not found |
| 5001 | Không tìm thấy giao dịch | Transaction not found |
| 5002 | Giao dịch không thể chỉnh sửa | Transaction cannot be updated (not PENDING) |
| 5003 | Giao dịch đã được xử lý | Transaction already processed |
| 5004 | Giao dịch không thể xóa | Transaction cannot be deleted (SUCCESS/PROCESSING) |
| 5005 | Số dư ví không đủ | Insufficient wallet balance |
| 5006 | Không tìm thấy khoản phí | Fee not found |

---

## Entity Relationships

### IncomeTransaction
- Belongs to: ClubWallet (required)
- Links to: Fee (optional)
- Links to: User (optional - the payer)
- Links to: PayOSPayment (optional)
- Created by: User (createdBy)

### OutcomeTransaction
- Belongs to: ClubWallet (required)
- Created by: User (createdBy)

---

## Business Rules

1. **Transaction Reference/Code Generation**: Auto-generated unique codes
   - Income: `INC-{timestamp}-{random8chars}`
   - Outcome: `OUT-{timestamp}-{random8chars}`

2. **Status Workflow**:
   - New transactions start as PENDING
   - PENDING can be updated, approved, or rejected
   - SUCCESS/PROCESSING transactions cannot be modified
   - Only PENDING/CANCELLED transactions can be deleted

3. **Wallet Balance Updates**:
   - Income approval: `balance += amount`, `totalIncome += amount`
   - Outcome approval: `balance -= amount`, `totalOutcome += amount`
   - Outcome approval checks for sufficient balance

4. **Authorization**:
   - All operations require authenticated user
   - Club membership/role checks should be implemented at security layer

---

## Frontend Integration Notes

Based on the TransactionsTable component:

1. **Transaction Types Mapping**:
   - Frontend uses: `INCOME | OUTCOME`
   - Backend uses same enum values

2. **Status Mapping**:
   - Frontend: `PENDING | COMPLETED | CANCELLED | FAILED`
   - Backend: `PENDING | SUCCESS | CANCELLED | FAILED`
   - Note: Map `SUCCESS` → `COMPLETED` in frontend

3. **Date Formatting**:
   - Backend uses: `LocalDateTime` (ISO-8601)
   - Frontend should parse and format accordingly

4. **Actions Available**:
   - PENDING status: Approve, Reject, Edit, Delete
   - Other statuses: View only, Edit, Delete (if applicable)

