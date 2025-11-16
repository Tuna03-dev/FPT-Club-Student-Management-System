# Danh sách API cần viết cho Luồng Tạo CLB

## 1. API cho Sinh viên (SV)

### 1.1. Quản lý Yêu cầu Thành lập CLB

#### POST `/api/club-creation/requests`
**Mô tả**: SV tạo đề nghị thành lập CLB mới
**Request Body**:
```json
{
  "clubName": "Tên CLB",
  "clubCategory": "Danh mục CLB",
  "expectedMemberCount": 50,
  "activityObjectives": "Các mục tiêu chính của CLB...",
  "expectedActivities": "Các hoạt động CLB sẽ tổ chức...",
  "description": "Mô tả CLB"
}
```
**Response**: `RequestEstablishment` với status = `DRAFT` hoặc `SUBMITTED`

#### GET `/api/club-creation/requests`
**Mô tả**: SV xem danh sách yêu cầu của mình
**Query Params**: 
- `status` (optional): Lọc theo trạng thái
- `page`, `size` (optional): Phân trang
**Response**: Danh sách `RequestEstablishment`

#### GET `/api/club-creation/requests/{requestId}`
**Mô tả**: SV xem chi tiết yêu cầu của mình
**Response**: Chi tiết `RequestEstablishment` với đầy đủ thông tin

#### PUT `/api/club-creation/requests/{requestId}`
**Mô tả**: SV cập nhật yêu cầu (chỉ khi status = DRAFT)
**Request Body**: Tương tự POST

#### DELETE `/api/club-creation/requests/{requestId}`
**Mô tả**: SV xóa yêu cầu (chỉ khi status = DRAFT)

#### POST `/api/club-creation/requests/{requestId}/submit`
**Mô tả**: SV gửi yêu cầu (chuyển từ DRAFT → SUBMITTED)
**Response**: `RequestEstablishment` với status = `SUBMITTED`

---

### 1.2. Quản lý Đề án (Club Proposal)

#### POST `/api/club-creation/requests/{requestId}/proposals`
**Mô tả**: SV điền/nộp đề án
**Request Body**:
```json
{
  "title": "Tên đề án",
  "fileUrl": "URL file đề án"
}
```
**Response**: `ClubProposal` đã tạo

#### GET `/api/club-creation/requests/{requestId}/proposals`
**Mô tả**: SV xem đề án của yêu cầu
**Response**: Danh sách `ClubProposal` (có thể có nhiều version)

#### GET `/api/club-creation/requests/{requestId}/proposals/{proposalId}`
**Mô tả**: SV xem chi tiết đề án
**Response**: Chi tiết `ClubProposal`

#### PUT `/api/club-creation/requests/{requestId}/proposals/{proposalId}`
**Mô tả**: SV chỉnh sửa đề án (khi bị reject)
**Request Body**: Tương tự POST

---

### 1.3. Quản lý Lịch Bảo vệ

#### POST `/api/club-creation/requests/{requestId}/defense-schedule/propose`
**Mô tả**: SV đề xuất lịch bảo vệ
**Request Body**:
```json
{
  "defenseDate": "2024-12-20T10:00:00",
  "location": "Phòng A101",
  "meetingLink": "https://meet.google.com/...",
  "notes": "Ghi chú"
}
```
**Response**: `DefenseSchedule` với status = `PROPOSED`

#### GET `/api/club-creation/requests/{requestId}/defense-schedule`
**Mô tả**: SV xem lịch bảo vệ
**Response**: Chi tiết `DefenseSchedule`

#### PUT `/api/club-creation/requests/{requestId}/defense-schedule`
**Mô tả**: SV cập nhật lịch bảo vệ (nếu chưa được confirm)
**Request Body**: Tương tự POST

---

### 1.4. Form Cuối cùng

#### POST `/api/club-creation/requests/{requestId}/final-form`
**Mô tả**: SV điền form cuối cùng
**Request Body**:
```json
{
  "formData": "{\"field1\": \"value1\", \"field2\": \"value2\"}" // JSON string
}
```
**Response**: `ClubCreationFinalForm` với status = `SUBMITTED`

#### GET `/api/club-creation/requests/{requestId}/final-form`
**Mô tả**: SV xem form cuối đã điền
**Response**: Chi tiết `ClubCreationFinalForm`

#### PUT `/api/club-creation/requests/{requestId}/final-form`
**Mô tả**: SV chỉnh sửa form cuối (nếu chưa được review)
**Request Body**: Tương tự POST

---

## 2. API cho Cán bộ Quản lý CLB (CB)

### 2.1. Quản lý Yêu cầu Thành lập

#### GET `/api/club-creation/requests/pending`
**Mô tả**: CB xem danh sách yêu cầu đang chờ xử lý
**Query Params**: 
- `status` (optional): Lọc theo trạng thái
- `page`, `size` (optional): Phân trang
**Response**: Danh sách `RequestEstablishment`

#### GET `/api/club-creation/requests/{requestId}`
**Mô tả**: CB xem chi tiết yêu cầu
**Response**: Chi tiết `RequestEstablishment` với đầy đủ thông tin

#### POST `/api/club-creation/requests/{requestId}/assign`
**Mô tả**: CB được gán xử lý yêu cầu (hoặc Admin gán)
**Request Body**:
```json
{
  "cbId": 123
}
```
**Response**: `RequestEstablishment` với `assignedStaff` và `receivedAt`

---

### 2.2. Xác nhận Liên hệ

#### POST `/api/club-creation/requests/{requestId}/contact/confirm`
**Mô tả**: CB xác nhận thông tin liên hệ của SV
**Request Body**:
```json
{
  "confirmationDeadline": "2024-12-15T23:59:59" // [S ngày]
}
```
**Response**: `RequestEstablishment` với status = `CONTACT_CONFIRMED`, `confirmedAt` được set

#### POST `/api/club-creation/requests/{requestId}/contact/reject`
**Mô tả**: CB từ chối xác nhận liên hệ
**Request Body**:
```json
{
  "reason": "Lý do từ chối"
}
```
**Response**: `RequestEstablishment` với status = `CONTACT_REJECTED`

#### POST `/api/club-creation/requests/{requestId}/contact/request-proposal`
**Mô tả**: CB gửi yêu cầu SV điền đề án (sau khi xác nhận liên hệ)
**Response**: `RequestEstablishment` với status = `PROPOSAL_REQUIRED`

---

### 2.3. Duyệt Đề án

#### GET `/api/club-creation/requests/{requestId}/proposals`
**Mô tả**: CB xem đề án của yêu cầu
**Response**: Danh sách `ClubProposal`

#### GET `/api/club-creation/requests/{requestId}/proposals/{proposalId}`
**Mô tả**: CB xem chi tiết đề án
**Response**: Chi tiết `ClubProposal`

#### POST `/api/club-creation/requests/{requestId}/proposals/{proposalId}/approve`
**Mô tả**: CB duyệt đề án
**Request Body**:
```json
{
  "comments": "Ghi chú duyệt"
}
```
**Response**: `RequestEstablishment` với status = `PROPOSAL_APPROVED`

#### POST `/api/club-creation/requests/{requestId}/proposals/{proposalId}/reject`
**Mô tả**: CB từ chối đề án, yêu cầu chỉnh sửa
**Request Body**:
```json
{
  "rejectionReason": "Lý do từ chối",
  "comments": "Gợi ý chỉnh sửa"
}
```
**Response**: `RequestEstablishment` với status = `PROPOSAL_REJECTED`

---

### 2.4. Quản lý Lịch Bảo vệ

#### GET `/api/club-creation/requests/{requestId}/defense-schedule`
**Mô tả**: CB xem lịch bảo vệ đề xuất
**Response**: Chi tiết `DefenseSchedule`

#### POST `/api/club-creation/requests/{requestId}/defense-schedule/confirm`
**Mô tả**: CB xác nhận lịch bảo vệ do SV đề xuất
**Response**: `DefenseSchedule` với status = `CONFIRMED`

#### POST `/api/club-creation/requests/{requestId}/defense-schedule/reject`
**Mô tả**: CB từ chối lịch bảo vệ đề xuất
**Request Body**:
```json
{
  "reason": "Lý do từ chối"
}
```
**Response**: `DefenseSchedule` với status = `PENDING`

---

### 2.5. Book Phòng trên FAP

#### POST `/api/club-creation/requests/{requestId}/defense-schedule/book-room/auto`
**Mô tả**: CB yêu cầu book phòng tự động (hoặc hệ thống tự động gọi)
**Response**: 
```json
{
  "fapBookingId": "FAP123456",
  "fapBookingStatus": "CONFIRMED",
  "fapBookingLink": "https://fap.fpt.edu.vn/booking/...",
  "isAutoBooked": true
}
```

#### POST `/api/club-creation/requests/{requestId}/defense-schedule/book-room/manual`
**Mô tả**: CB cập nhật thông tin booking phòng sau khi book thủ công trên FAP
**Request Body**:
```json
{
  "fapBookingId": "FAP123456",
  "fapBookingStatus": "CONFIRMED",
  "fapBookingLink": "https://fap.fpt.edu.vn/booking/...",
  "location": "Phòng A101"
}
```
**Response**: `DefenseSchedule` với thông tin booking đã cập nhật

#### GET `/api/club-creation/requests/{requestId}/defense-schedule/booking-status`
**Mô tả**: CB kiểm tra trạng thái booking phòng
**Response**: Thông tin booking hiện tại

---

### 2.6. Feedback sau Bảo vệ

#### POST `/api/club-creation/requests/{requestId}/defense-schedule/feedback`
**Mô tả**: CB điền feedback sau khi hoàn thành bảo vệ
**Request Body**:
```json
{
  "feedback": "Nội dung feedback chi tiết...",
  "result": "PASSED" // hoặc "FAILED"
}
```
**Response**: `DefenseSchedule` với `feedback` và `result` đã được cập nhật, status = `FEEDBACK_PROVIDED`

#### PUT `/api/club-creation/requests/{requestId}/defense-schedule/feedback`
**Mô tả**: CB chỉnh sửa feedback
**Request Body**: Tương tự POST

---

### 2.7. Duyệt Form Cuối

#### GET `/api/club-creation/requests/{requestId}/final-form`
**Mô tả**: CB xem form cuối do SV điền
**Response**: Chi tiết `ClubCreationFinalForm`

#### POST `/api/club-creation/requests/{requestId}/final-form/review`
**Mô tả**: CB xem xét form cuối
**Request Body**:
```json
{
  "status": "APPROVED", // hoặc "REJECTED"
  "comments": "Ghi chú"
}
```
**Response**: `ClubCreationFinalForm` với `reviewedBy`, `reviewedAt` đã được set

---

## 3. API cho Admin (nếu cần)

#### GET `/api/admin/club-creation/requests`
**Mô tả**: Admin xem tất cả yêu cầu thành lập CLB
**Query Params**: 
- `status`, `assignedStaff`, `createdBy` (optional): Lọc
- `page`, `size` (optional): Phân trang

#### POST `/api/admin/club-creation/requests/{requestId}/assign-cb`
**Mô tả**: Admin gán CB xử lý yêu cầu
**Request Body**:
```json
{
  "cbId": 123
}
```

#### POST `/api/admin/club-creation/requests/{requestId}/approve`
**Mô tả**: Admin duyệt cuối cùng, tạo CLB chính thức
**Response**: `Club` đã được tạo từ `RequestEstablishment`

---

## 4. API chung (Workflow History)

#### GET `/api/club-creation/requests/{requestId}/workflow-history`
**Mô tả**: Xem lịch sử workflow của yêu cầu
**Response**: Danh sách `ClubCreationWorkFlowHistory`

#### GET `/api/club-creation/steps`
**Mô tả**: Xem danh sách các bước trong workflow
**Response**: Danh sách `ClubCreationStep`

---

## 5. API tích hợp FAP (nếu cần)

#### POST `/api/fap/check-room-availability`
**Mô tả**: Kiểm tra phòng có thể đặt tự động không
**Request Body**:
```json
{
  "location": "Phòng A101",
  "dateTime": "2024-12-20T10:00:00",
  "duration": 120 // phút
}
```
**Response**: 
```json
{
  "canAutoBook": true,
  "available": true,
  "message": "..."
}
```

#### POST `/api/fap/book-room`
**Mô tả**: Book phòng tự động trên FAP
**Request Body**:
```json
{
  "location": "Phòng A101",
  "dateTime": "2024-12-20T10:00:00",
  "duration": 120,
  "purpose": "Club Defense",
  "requestEstablishmentId": 123
}
```
**Response**: 
```json
{
  "bookingId": "FAP123456",
  "status": "CONFIRMED",
  "bookingLink": "https://fap.fpt.edu.vn/booking/...",
  "message": "Booking successful"
}
```

---

## Tóm tắt số lượng API

- **API cho SV**: ~15 endpoints
- **API cho CB**: ~20 endpoints  
- **API cho Admin**: ~3 endpoints
- **API chung**: ~2 endpoints
- **API FAP**: ~2 endpoints

**Tổng cộng**: ~42 endpoints

---

## Lưu ý

1. **Authentication & Authorization**: Tất cả API cần xác thực và phân quyền
2. **Validation**: Validate input data ở tất cả các endpoint
3. **Error Handling**: Xử lý lỗi đầy đủ (400, 401, 403, 404, 500)
4. **Notification**: Gửi thông báo khi có thay đổi trạng thái
5. **Workflow History**: Ghi lại tất cả các hành động vào `ClubCreationWorkFlowHistory`

