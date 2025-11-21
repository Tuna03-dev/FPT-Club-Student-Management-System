# API Endpoints Summary - Transaction Receipt Upload

## 📤 Upload Receipt Image

### Income Transaction
```
POST /api/clubs/{clubId}/transactions/income/upload-receipt
```

### Outcome Transaction
```
POST /api/clubs/{clubId}/transactions/outcome/upload-receipt
```

---

## 📋 Request

**Content-Type**: `multipart/form-data`

**Headers**:
```
Authorization: Bearer {token}
```

**Body**:
```
file: [image file]
```

---

## ✅ Success Response (200)

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

---

## ❌ Error Responses

| Code | Message |
|------|---------|
| 400 | File không được để trống |
| 400 | Chỉ chấp nhận file ảnh (jpg, png, gif, etc.) |
| 400 | Kích thước file không được vượt quá 5MB |
| 500 | Lỗi khi upload ảnh: {error} |

---

## 🔧 Validation Rules

- ✅ File type: `image/*` only
- ✅ Max size: 5MB
- ✅ Non-empty file

---

## 📁 Storage Structure

**Income receipts**: `club/transactions/income/receipts/`  
**Outcome receipts**: `club/transactions/outcome/receipts/`

---

## 🔄 Usage Flow

1. **Upload ảnh** → Nhận `receiptUrl`
2. **Create/Update transaction** → Gửi `receiptUrl` trong body

---

## 💡 Example Usage

### JavaScript/TypeScript

```typescript
// Step 1: Upload receipt
async function uploadReceipt(clubId: number, file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(
    `/api/clubs/${clubId}/transactions/income/upload-receipt`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    }
  );
  
  const { data } = await response.json();
  return data.receiptUrl;
}

// Step 2: Create transaction with receipt
async function createTransaction(clubId: number, receiptUrl: string) {
  const transaction = {
    amount: 1000000,
    description: "Thu học phí",
    transactionDate: new Date().toISOString(),
    source: "Học phí",
    receiptUrl: receiptUrl  // ✅ Include receipt URL
  };
  
  await fetch(`/api/clubs/${clubId}/transactions/income`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(transaction)
  });
}
```

### cURL

```bash
# Upload receipt
curl -X POST \
  'http://localhost:8080/api/clubs/1/transactions/income/upload-receipt' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -F 'file=@receipt.jpg'

# Response: {"data": {"receiptUrl": "https://..."}}

# Create transaction with receipt
curl -X POST \
  'http://localhost:8080/api/clubs/1/transactions/income' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "amount": 1000000,
    "description": "Thu học phí",
    "transactionDate": "2025-11-18T10:00:00",
    "source": "Học phí",
    "receiptUrl": "https://res.cloudinary.com/.../receipt.jpg"
  }'
```

---

## 📊 Response Fields

| Field | Type | Description |
|-------|------|-------------|
| receiptUrl | string | Full URL to uploaded image on Cloudinary |
| publicId | string | Cloudinary public ID for image management |
| message | string | Success message |

---

## ✨ Features

- ✅ Support for both Income & Outcome transactions
- ✅ Automatic folder organization by transaction type
- ✅ File validation (type & size)
- ✅ Cloudinary integration
- ✅ Secure upload with authentication
- ✅ Clean error messages

---

**Version**: 1.0  
**Date**: 2025-11-18

