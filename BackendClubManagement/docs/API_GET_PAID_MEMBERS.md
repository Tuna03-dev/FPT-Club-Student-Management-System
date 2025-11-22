# API: Get Paid Members by Fee

## 📋 Tổng quan

API để lấy danh sách những người đã đóng một khoản phí cụ thể, hỗ trợ tìm kiếm và phân trang.

---

## 🔗 Endpoint

### GET `/api/clubs/{clubId}/fees/{feeId}/paid-members`

**Description**: Lấy danh sách thành viên đã đóng một khoản phí cụ thể

**Authorization**: Requires authentication (ALL_ROLES)

---

## 📥 Request Parameters

### Path Variables:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `clubId` | Long | Yes | ID của club |
| `feeId` | Long | Yes | ID của khoản phí |

### Query Parameters:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `search` | String | No | null | Tìm kiếm theo tên, mã sinh viên, email (không phân biệt dấu) |
| `page` | int | No | 0 | Số trang (bắt đầu từ 0) |
| `size` | int | No | 10 | Số lượng items mỗi trang |

---

## 📤 Response Format

### Success Response (200 OK):

```json
{
  "code": 1000,
  "message": "Success",
  "result": {
    "content": [
      {
        "userId": 123,
        "studentCode": "SE150123",
        "fullName": "Nguyễn Văn A",
        "email": "nguyenvana@example.com",
        "phoneNumber": "0912345678",
        "avatarUrl": "https://example.com/avatar.jpg",
        "transactionId": 456,
        "paidAmount": 100000,
        "paidDate": "2024-11-22T10:30:00",
        "transactionReference": "123456789",
        "transactionStatus": "SUCCESS",
        "paymentMethod": "PayOS",
        "semesterName": "Học kỳ 1 - 2024",
        "roleName": "Thành viên",
        "teamName": "Team A"
      },
      {
        "userId": 124,
        "studentCode": "SE150124",
        "fullName": "Trần Thị B",
        "email": "tranthib@example.com",
        "phoneNumber": "0987654321",
        "avatarUrl": "https://example.com/avatar2.jpg",
        "transactionId": 457,
        "paidAmount": 100000,
        "paidDate": "2024-11-22T09:15:00",
        "transactionReference": "123456790",
        "transactionStatus": "SUCCESS",
        "paymentMethod": "PayOS",
        "semesterName": "Học kỳ 1 - 2024",
        "roleName": "Phó chủ nhiệm",
        "teamName": "Team B"
      }
    ],
    "pageNumber": 0,
    "pageSize": 10,
    "totalElements": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

### Error Response (404 NOT_FOUND):

```json
{
  "code": 1002,
  "message": "Khoản phí không tồn tại",
  "result": null
}
```

---

## 📋 Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `userId` | Long | ID của người dùng |
| `studentCode` | String | Mã sinh viên |
| `fullName` | String | Tên đầy đủ |
| `email` | String | Email |
| `phoneNumber` | String | Số điện thoại |
| `avatarUrl` | String | URL avatar |
| `transactionId` | Long | ID giao dịch |
| `paidAmount` | BigDecimal | Số tiền đã đóng |
| `paidDate` | LocalDateTime | Thời gian đóng phí |
| `transactionReference` | String | Mã tham chiếu giao dịch |
| `transactionStatus` | String | Trạng thái giao dịch (SUCCESS, PENDING, FAILED) |
| `paymentMethod` | String | Phương thức thanh toán (PayOS, Cash, etc.) |
| `semesterName` | String | Tên học kỳ (nếu có) |
| `roleName` | String | Vai trò trong club (nếu có) |
| `teamName` | String | Tên team (nếu có) |

---

## 🔍 Features

### 1. **Search không dấu (Accent-insensitive)**
```bash
GET /api/clubs/1/fees/5/paid-members?search=nguyen
# Sẽ match:
# - "Nguyễn Văn A"
# - "nguyen thi b"
# - "NGUYEN VAN C"
```

### 2. **Search nhiều trường**
Tìm kiếm trong:
- ✅ Full Name (Họ tên)
- ✅ Student Code (Mã sinh viên)
- ✅ Email

### 3. **Sorting**
- Mặc định: Sort theo `paidDate` DESC (người đóng gần nhất lên đầu)

### 4. **Pagination**
- Hỗ trợ phân trang với `page` và `size`
- Metadata đầy đủ: totalElements, totalPages, hasNext, hasPrevious

---

## 💡 Use Cases

### Use Case 1: Xem tất cả người đã đóng phí
```http
GET /api/clubs/1/fees/5/paid-members?page=0&size=20
```

### Use Case 2: Tìm kiếm người đã đóng theo tên
```http
GET /api/clubs/1/fees/5/paid-members?search=nguyen van&page=0&size=20
```

### Use Case 3: Tìm theo mã sinh viên
```http
GET /api/clubs/1/fees/5/paid-members?search=SE150&page=0&size=20
```

### Use Case 4: Tìm theo email
```http
GET /api/clubs/1/fees/5/paid-members?search=@gmail.com&page=0&size=20
```

---

## 🔧 Implementation Details

### Service Layer Logic:

1. **Validate fee exists**
   - Throw error nếu fee không tồn tại

2. **Query all successful transactions**
   - Chỉ lấy transactions có status = SUCCESS
   - Eager load user info với JOIN FETCH

3. **Filter by search term** (in Java)
   - Dùng `VietnameseTextNormalizer` để tìm kiếm không dấu
   - Check trong fullName, studentCode, email

4. **Sort by paidDate DESC**
   - Người đóng gần nhất lên đầu

5. **Manual pagination**
   - Pagination trong Java sau khi filter

6. **Enrich với member info**
   - Lấy thông tin semester, role, team nếu có

---

## 🎯 Business Rules

1. **Chỉ hiện transactions thành công**
   - Status = SUCCESS
   - Loại bỏ transactions PENDING hoặc FAILED

2. **Unique users**
   - Mỗi user chỉ xuất hiện 1 lần
   - Nếu có nhiều transactions (unlikely), lấy transaction mới nhất

3. **Member info là optional**
   - semesterName, roleName, teamName có thể null
   - Chỉ hiển thị nếu fee có semester và user có role membership

---

## 🔐 Authorization

- Yêu cầu: User phải được authenticated
- Permission: `AUTHORITY_ALL_ROLES`
- Thường được dùng bởi: Admin, Club President, Treasurer

---

## ⚡ Performance

### Query Optimization:
- ✅ JOIN FETCH để eager load user
- ✅ Filter trong Java (small dataset)
- ✅ Manual pagination (efficient với small result set)

### Expected Performance:
- Số lượng người đã đóng: Thường < 100
- Response time: ~50-100ms
- Memory usage: Low

---

## 🧪 Testing Examples

### cURL:

```bash
# Test 1: Get all paid members
curl -X GET "http://localhost:8080/api/clubs/1/fees/5/paid-members?page=0&size=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test 2: Search by name
curl -X GET "http://localhost:8080/api/clubs/1/fees/5/paid-members?search=nguyen&page=0&size=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test 3: Search by student code
curl -X GET "http://localhost:8080/api/clubs/1/fees/5/paid-members?search=SE150&page=0&size=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Postman:

```
GET {{base_url}}/api/clubs/1/fees/5/paid-members
Headers:
  Authorization: Bearer {{token}}
Params:
  search: nguyen
  page: 0
  size: 10
```

---

## 📊 Related Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/clubs/{clubId}/fees` | Lấy danh sách tất cả fees |
| `GET /api/clubs/{clubId}/fees/{feeId}` | Chi tiết một fee |
| `POST /api/clubs/{clubId}/fees/{feeId}/generate-payment` | Tạo QR thanh toán |

---

## 🚨 Error Codes

| Code | Message | HTTP Status |
|------|---------|-------------|
| 1000 | Success | 200 |
| 1001 | Club not found | 404 |
| 1002 | Khoản phí không tồn tại | 404 |
| 1003 | Unauthorized | 401 |

---

## 📝 Notes

1. **Search performance**: Tốt với < 1000 paid members
2. **Real-time data**: Data được lấy trực tiếp từ transactions
3. **Member info**: Chỉ hiển thị nếu có membership data

---

**Version**: 1.0.0  
**Date**: November 22, 2025  
**Author**: Backend Team

