# Receipt Image Upload for Transactions - Implementation Summary

## 📋 Overview

Đã triển khai chức năng upload ảnh bằng chứng (receipt) cho cả giao dịch thu (Income) và chi (Outcome), tích hợp với Cloudinary để lưu trữ ảnh.

## 🎯 Các Thay Đổi Chính

### 1. **Database Schema Update**

#### IncomeTransaction Entity
```java
@Column(name = "receipt_url", length = 500)
private String receiptUrl;
```

#### Migration SQL
```sql
-- V1.0.8__add_receipt_url_to_income_transactions.sql
ALTER TABLE income_transactions
ADD COLUMN receipt_url VARCHAR(500) NULL
COMMENT 'URL to receipt/proof of payment image stored in Cloudinary';

CREATE INDEX idx_income_transactions_receipt_url ON income_transactions(receipt_url);
```

**Note**: OutcomeTransaction đã có sẵn field `receiptUrl` từ trước.

---

### 2. **DTO Updates**

#### CreateIncomeTransactionRequest
```java
@Size(max = 500, message = "URL biên lai không được vượt quá 500 ký tự")
private String receiptUrl;
```

#### UpdateIncomeTransactionRequest
```java
@Size(max = 500, message = "URL biên lai không được vượt quá 500 ký tự")
private String receiptUrl;
```

#### IncomeTransactionResponse
```java
private String receiptUrl;
```

**Note**: Outcome DTOs đã có sẵn receiptUrl từ trước.

---

### 3. **Service Layer Updates**

#### IncomeTransactionServiceImpl

##### Create Transaction
```java
IncomeTransaction.IncomeTransactionBuilder builder = IncomeTransaction.builder()
    // ...existing fields...
    .receiptUrl(request.getReceiptUrl())
    .build();
```

##### Update Transaction
```java
transaction.setReceiptUrl(request.getReceiptUrl());
```

---

### 4. **Controller - Upload Endpoints**

#### Income Transaction Upload
```http
POST /api/clubs/{clubId}/transactions/income/upload-receipt
Content-Type: multipart/form-data
```

**Request:**
```
file: [image file]
```

**Response:**
```json
{
  "code": 200,
  "message": "Success",
  "timestamp": "2025-11-18T10:30:00Z",
  "data": {
    "receiptUrl": "https://res.cloudinary.com/.../receipt.jpg",
    "publicId": "club/transactions/income/receipts/abc123",
    "message": "Upload ảnh bằng chứng thành công"
  }
}
```

**Validation:**
- File không được rỗng
- Chỉ chấp nhận image files (jpg, png, gif, etc.)
- Kích thước tối đa: 5MB
- Upload vào folder: `club/transactions/income/receipts`

#### Outcome Transaction Upload
```http
POST /api/clubs/{clubId}/transactions/outcome/upload-receipt
Content-Type: multipart/form-data
```

**Request & Response**: Tương tự như Income
**Upload folder**: `club/transactions/outcome/receipts`

---

### 5. **ApiResponse Enhancement**

Thêm method tiện ích cho error response:

```java
public static <T> ApiResponse<T> error(int code, String message) {
    return ApiResponse.<T>builder()
            .code(code)
            .message(message)
            .timestamp(Instant.now())
            .build();
}
```

---

## 🔄 Workflow Sử Dụng

### Từ Frontend:

#### 1. Upload ảnh bằng chứng trước
```typescript
const formData = new FormData();
formData.append('file', receiptFile);

const response = await fetch(
  `/api/clubs/${clubId}/transactions/income/upload-receipt`,
  {
    method: 'POST',
    body: formData,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const { data } = await response.json();
const receiptUrl = data.receiptUrl; // URL để lưu vào DB
```

#### 2. Tạo/Cập nhật transaction với receiptUrl
```typescript
const transactionData = {
  amount: 1000000,
  description: "Thu tiền học phí",
  transactionDate: "2025-11-18T10:00:00",
  source: "Học phí",
  notes: "Kỳ 1 năm 2025",
  receiptUrl: receiptUrl, // URL từ bước 1
  feeId: 123,
  userId: 456
};

await createIncomeTransaction(clubId, transactionData);
```

---

## 📁 Cloudinary Storage Structure

```
cloudinary/
└── club/
    └── transactions/
        ├── income/
        │   └── receipts/
        │       ├── image1.jpg
        │       ├── image2.png
        │       └── ...
        └── outcome/
            └── receipts/
                ├── invoice1.jpg
                ├── receipt2.png
                └── ...
```

---

## 🔒 Security & Validation

### File Upload Validation
1. **File Type**: Chỉ chấp nhận images (MIME type: `image/*`)
2. **File Size**: Maximum 5MB
3. **Empty Check**: Không cho phép upload file rỗng

### URL Validation
- Max length: 500 characters
- Stored as plain text (URL từ Cloudinary)
- Optional field (có thể null)

---

## 📊 Frontend Integration

### Transaction Interface (TypeScript)
```typescript
export interface Transaction {
  id: number;
  code: string;
  amount: number;
  description: string;
  transactionDate: string;
  type: "INCOME" | "OUTCOME";
  status: TransactionStatus;
  
  // Income specific
  source?: string;
  feeId?: number;
  feeTitle?: string;
  userName?: string;
  userEmail?: string;
  
  // Outcome specific
  recipient?: string;
  purpose?: string;
  
  // Common - Receipt URL for both types
  receiptUrl?: string;  // ✅ Available for both Income & Outcome
  
  notes?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}
```

---

## 🧪 Testing Endpoints

### Test Income Upload
```bash
curl -X POST \
  http://localhost:8080/api/clubs/1/transactions/income/upload-receipt \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/receipt.jpg"
```

### Test Outcome Upload
```bash
curl -X POST \
  http://localhost:8080/api/clubs/1/transactions/outcome/upload-receipt \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/invoice.png"
```

---

## ✅ Checklist

- [x] Add `receiptUrl` to IncomeTransaction entity
- [x] Create database migration for `receipt_url` column
- [x] Update CreateIncomeTransactionRequest DTO
- [x] Update UpdateIncomeTransactionRequest DTO
- [x] Update IncomeTransactionResponse DTO
- [x] Update IncomeTransactionServiceImpl create method
- [x] Update IncomeTransactionServiceImpl update method
- [x] Add upload endpoint to IncomeTransactionController
- [x] Add upload endpoint to OutcomeTransactionController
- [x] Add error helper method to ApiResponse
- [x] Validate file type and size
- [x] Use Cloudinary uploadImage with folder

---

## 📝 API Documentation

### Upload Receipt - Income Transaction

**Endpoint:** `POST /api/clubs/{clubId}/transactions/income/upload-receipt`

**Headers:**
- `Authorization: Bearer {token}`
- `Content-Type: multipart/form-data`

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| clubId | Long | Yes | ID của club (path param) |
| file | File | Yes | File ảnh (form-data) |

**Success Response (200):**
```json
{
  "code": 200,
  "message": "Success",
  "timestamp": "2025-11-18T10:30:00Z",
  "data": {
    "receiptUrl": "https://res.cloudinary.com/xxx/image/upload/v123/club/transactions/income/receipts/abc.jpg",
    "publicId": "club/transactions/income/receipts/abc",
    "message": "Upload ảnh bằng chứng thành công"
  }
}
```

**Error Responses:**

| Code | Message | Reason |
|------|---------|--------|
| 400 | File không được để trống | Empty file |
| 400 | Chỉ chấp nhận file ảnh (jpg, png, gif, etc.) | Invalid file type |
| 400 | Kích thước file không được vượt quá 5MB | File too large |
| 500 | Lỗi khi upload ảnh: {error} | Upload failure |

---

### Upload Receipt - Outcome Transaction

**Endpoint:** `POST /api/clubs/{clubId}/transactions/outcome/upload-receipt`

Giống hệt Income Transaction upload, chỉ khác folder lưu trữ.

---

## 🔄 Migration Instructions

### 1. Run Migration
```bash
# Nếu dùng Flyway
mvn flyway:migrate

# Hoặc start application (auto-migration)
mvn spring-boot:run
```

### 2. Verify Column
```sql
DESCRIBE income_transactions;
-- Should see: receipt_url | varchar(500) | YES | | NULL |

SHOW INDEX FROM income_transactions WHERE Key_name = 'idx_income_transactions_receipt_url';
```

---

## 🚀 Benefits

### For Users
✅ Upload ảnh bằng chứng cho giao dịch thu  
✅ Upload ảnh hóa đơn cho giao dịch chi  
✅ Quản lý tài chính minh bạch hơn  
✅ Dễ dàng kiểm tra và audit  

### For Developers
✅ Tích hợp với Cloudinary sẵn có  
✅ Validation đầy đủ  
✅ API endpoints đồng nhất  
✅ Error handling rõ ràng  

---

## 📌 Notes

1. **Receipt URL là optional** - Không bắt buộc phải có ảnh cho mọi giao dịch
2. **Async upload** - Cloudinary service sử dụng async upload (uploadImageAsync)
3. **File organization** - Tự động phân folder theo loại transaction
4. **MapStruct** - Tự động map receiptUrl vì field name giống nhau
5. **Migration** - Cột mới có thể null để tương thích với data cũ

---

## 🔜 Future Enhancements

1. **Multiple Images**: Hỗ trợ upload nhiều ảnh bằng chứng
2. **Image Compression**: Tự động compress ảnh trước khi upload
3. **OCR Integration**: Tự động đọc số tiền từ ảnh hóa đơn
4. **Receipt Validation**: AI validate tính hợp lệ của biên lai
5. **Thumbnail Generation**: Tạo thumbnail cho preview nhanh

---

**Last Updated**: 2025-11-18  
**Version**: 1.0  
**Author**: GitHub Copilot

