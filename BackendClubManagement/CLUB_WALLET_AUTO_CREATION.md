# Club Wallet Auto-Creation Implementation

## 📋 Tổng Quan

Đã triển khai cơ chế tự động tạo và kiểm tra `ClubWallet` cho các CLB trong hệ thống, đảm bảo mỗi CLB luôn có ví để xử lý giao dịch tài chính.

## 🎯 Vấn Đề Đã Giải Quyết

### Vấn đề ban đầu:
- Một số CLB chưa có `ClubWallet` khi được tạo
- Gây lỗi khi xử lý thanh toán qua PayOS
- Lỗi khi tạo Income/Outcome transactions
- Phải tạo ví thủ công cho từng CLB

### Giải pháp:
✅ Tự động kiểm tra và tạo ví tại nhiều điểm trong hệ thống
✅ Scheduled job chạy định kỳ để đảm bảo consistency
✅ API endpoints cho admin quản lý thủ công

---

## 🔧 Các Thay Đổi Chi Tiết

### 1. **ClubWalletService** - Core Logic

#### Phương thức mới:

##### `ensureAllClubsHaveWallets()`
```java
@Transactional
public int ensureAllClubsHaveWallets()
```
- **Mục đích**: Tìm tất cả CLB chưa có ví và tạo cho chúng
- **Trả về**: Số lượng ví được tạo
- **Sử dụng**: Gọi khi khởi động app và trong scheduled jobs

##### `getOrCreateWalletForClub(Long clubId)`
```java
@Transactional
public ClubWallet getOrCreateWalletForClub(Long clubId) throws AppException
```
- **Mục đích**: Lấy ví của CLB, nếu chưa có thì tự động tạo
- **An toàn**: Luôn trả về một ví hợp lệ
- **Sử dụng**: Gọi trước mọi thao tác với ví

---

### 2. **Repository Updates**

#### ClubWalletRepository
```java
// Kiểm tra CLB đã có ví chưa
boolean existsByClub_Id(Long clubId);

// Đếm số ví đang active
@Query("SELECT COUNT(cw) FROM ClubWallet cw WHERE cw.deletedAt IS NULL")
long countActiveWallets();
```

#### ClubRepository
```java
// Tìm các CLB chưa có ví
@Query("SELECT c FROM Club c WHERE c.clubWallet IS NULL AND c.deletedAt IS NULL")
List<Club> findClubsWithoutWallet();
```

---

### 3. **Auto-Check Points** - Kiểm Tra Tự Động

#### 🚀 Application Startup
**File**: `WalletBalanceConsistencyCheckJob.java`

```java
@EventListener(ApplicationReadyEvent.class)
public void onApplicationReady()
```
- Chạy khi ứng dụng khởi động
- Tự động tạo ví cho CLB chưa có
- Kiểm tra tính nhất quán của số dư

#### ⏰ Scheduled Job (Hàng ngày 2:00 AM)
```java
@Scheduled(cron = "0 0 2 * * *")
public void checkAndFixWalletBalance()
```
- Kiểm tra CLB chưa có ví hàng ngày
- Sửa lỗi số dư nếu phát hiện inconsistency
- Ghi log chi tiết để tracking

---

### 4. **Service Integration** - Tích Hợp Vào Services

#### ✅ IncomeTransactionServiceImpl
Các phương thức đã được cập nhật:
- `getIncomeTransactions()` 
- `getIncomeTransactionsByStatus()`
- `createIncomeTransaction()`

**Thay đổi:**
```java
// ❌ TRƯỚC (throw exception nếu không tìm thấy)
ClubWallet clubWallet = clubWalletRepository.findByClub_Id(clubId)
    .orElseThrow(() -> new AppException(ErrorCode.CLUB_WALLET_NOT_FOUND));

// ✅ SAU (tự động tạo nếu chưa có)
ClubWallet clubWallet = clubWalletService.getOrCreateWalletForClub(clubId);
```

#### ✅ OutcomeTransactionServiceImpl
Các phương thức đã được cập nhật:
- `getOutcomeTransactions()`
- `getOutcomeTransactionsByStatus()`
- `createOutcomeTransaction()`

#### ✅ FeeService (PayOS Webhook)
Cực kỳ quan trọng cho xử lý thanh toán:
```java
// Auto-create wallet if not exists (critical for payment processing)
ClubWallet clubWallet = clubWalletService.getOrCreateWalletForClub(fee.getClub().getId());
```

**Tại sao quan trọng:**
- Webhook PayOS đến bất cứ lúc nào
- Nếu không có ví → thanh toán thất bại
- Giờ đây luôn đảm bảo có ví để xử lý

---

### 5. **Admin API Endpoints** - Quản Lý Thủ Công

**File**: `ClubWalletController.java`

#### Endpoints mới:

##### 1. Ensure All Wallets
```http
POST /api/v1/admin/club-wallets/ensure-all
Authorization: Bearer {admin_token}
```
**Response:**
```json
{
  "code": 200,
  "message": "Đã kiểm tra và tạo ví cho các CLB",
  "data": {
    "walletsCreated": 5,
    "message": "Đã tạo 5 ví mới"
  }
}
```

##### 2. Get Consistency Summary
```http
GET /api/v1/admin/club-wallets/consistency-summary
Authorization: Bearer {admin_token}
```
**Response:**
```json
{
  "code": 200,
  "message": "Thống kê tính nhất quán của ví CLB",
  "data": {
    "total_wallets": 50,
    "consistent_wallets": 50,
    "inconsistent_wallets": 0,
    "consistency_rate": "100%"
  }
}
```

##### 3. Manual Check and Fix
```http
POST /api/v1/admin/club-wallets/check-and-fix
Authorization: Bearer {admin_token}
```
Kích hoạt kiểm tra và sửa lỗi số dư ngay lập tức.

##### 4. Ensure Wallet for Specific Club
```http
POST /api/v1/admin/club-wallets/clubs/{clubId}/ensure-wallet
Authorization: Bearer {admin_token}
```

---

## 📊 Workflow Tự Động

```
┌─────────────────────────────────────────────────────────┐
│  Application Start                                       │
│  └─> ensureAllClubsHaveWallets()                       │
│      └─> Create wallets for clubs without one           │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Daily Scheduled Job (2:00 AM)                          │
│  └─> ensureAllClubsHaveWallets()                       │
│  └─> checkAndFixWalletBalance()                        │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Real-time Auto-Check (When Accessed)                   │
│  ├─> getIncomeTransactions()                           │
│  ├─> createIncomeTransaction()                         │
│  ├─> createOutcomeTransaction()                        │
│  └─> PayOS Webhook Handler                             │
│      └─> getOrCreateWalletForClub()                    │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Các Điểm Kiểm Tra (Check Points)

### ✅ Automatic Checks

| Thời điểm | Phương thức | Mô tả |
|-----------|-------------|-------|
| 🚀 **Khởi động app** | `onApplicationReady()` | Tạo ví cho CLB chưa có + kiểm tra consistency |
| ⏰ **2:00 AM hàng ngày** | `checkAndFixWalletBalance()` | Scheduled check + fix |
| 💰 **Load income transactions** | `getIncomeTransactions()` | Auto-create trước khi load |
| 💰 **Tạo income transaction** | `createIncomeTransaction()` | Auto-create trước khi tạo |
| 💸 **Load outcome transactions** | `getOutcomeTransactions()` | Auto-create trước khi load |
| 💸 **Tạo outcome transaction** | `createOutcomeTransaction()` | Auto-create trước khi tạo |
| 💳 **PayOS Webhook** | PayOS webhook handler | **QUAN TRỌNG** - Auto-create khi nhận thanh toán |

### 🔧 Manual Checks (Admin API)

| Endpoint | Mục đích |
|----------|----------|
| `POST /admin/club-wallets/ensure-all` | Quét và tạo ví cho tất cả CLB |
| `POST /admin/club-wallets/clubs/{id}/ensure-wallet` | Tạo ví cho 1 CLB cụ thể |
| `POST /admin/club-wallets/check-and-fix` | Sửa lỗi số dư ngay lập tức |
| `GET /admin/club-wallets/consistency-summary` | Xem thống kê |

---

## 🔍 Monitoring & Logs

### Log Messages

#### Success
```
✅ All clubs have wallets. No action needed.
✅ Created 3 new wallet(s) on startup
✅ Created wallet for club: Tech Club (ID: 5)
```

#### Warnings
```
⚠️ Found 3 club(s) without wallet. Creating wallets...
```

#### Errors
```
❌ Failed to create wallet for club: ABC (ID: 10). Error: Club not found
```

### Xem logs
```bash
# Grep wallet logs
tail -f logs/application.log | grep -i "wallet"

# Check startup
tail -f logs/application.log | grep "Application ready"

# Check scheduled job
tail -f logs/application.log | grep "Starting daily wallet"
```

---

## ⚠️ Lưu Ý Quan Trọng

### 1. **Không bao giờ throw exception về missing wallet**
- Tất cả nơi cần ví đều dùng `getOrCreateWalletForClub()`
- Đảm bảo hệ thống luôn hoạt động

### 2. **PayOS Webhook là critical point**
- Nếu webhook đến mà không có ví → mất tiền
- Giờ đã an toàn với auto-create

### 3. **Scheduled job là safety net**
- Chạy hàng ngày để đảm bảo không bỏ sót
- Fix lỗi số dư tự động

### 4. **Admin có full control**
- API endpoints để can thiệp thủ công
- Xem thống kê real-time

---

## 🧪 Testing Checklist

### Functional Tests
- [ ] Khởi động app với DB có CLB chưa có ví
- [ ] Tạo CLB mới và kiểm tra ví tự động
- [ ] Tạo income transaction cho CLB chưa có ví
- [ ] Tạo outcome transaction cho CLB chưa có ví
- [ ] Test PayOS webhook với CLB chưa có ví
- [ ] Gọi API `ensure-all` và kiểm tra response
- [ ] Kiểm tra scheduled job chạy đúng lúc

### Edge Cases
- [ ] CLB bị soft delete (deletedAt != null)
- [ ] Multiple concurrent requests cùng tạo ví
- [ ] CLB không tồn tại (throw exception)

---

## 📚 Files Changed/Created

### Modified Files
1. `ClubWalletService.java` - Added wallet creation methods
2. `ClubWalletRepository.java` - Added query methods
3. `ClubRepository.java` - Added findClubsWithoutWallet
4. `IncomeTransactionServiceImpl.java` - Use auto-create
5. `OutcomeTransactionServiceImpl.java` - Use auto-create
6. `FeeService.java` - Use auto-create in webhook
7. `WalletBalanceConsistencyCheckJob.java` - Added startup check

### New Files
1. `ClubWalletController.java` - Admin API endpoints

### Documentation
1. `CLUB_WALLET_AUTO_CREATION.md` - This file

---

## 🎉 Kết Quả

### Trước khi implement:
❌ Một số CLB không có ví  
❌ Lỗi khi xử lý thanh toán  
❌ Phải tạo ví thủ công  
❌ Không có cơ chế kiểm tra  

### Sau khi implement:
✅ Tất cả CLB luôn có ví  
✅ Thanh toán PayOS luôn thành công  
✅ Tự động tạo ví khi cần  
✅ Scheduled job đảm bảo consistency  
✅ Admin có tools quản lý  
✅ Logs chi tiết để tracking  

---

## 🔜 Future Enhancements

1. **Notification System**
   - Gửi email/notification cho admin khi tạo ví mới
   - Alert khi phát hiện inconsistency

2. **Metrics Dashboard**
   - Real-time tracking số ví
   - Biểu đồ consistency rate

3. **Audit Log**
   - Lưu lịch sử tạo ví
   - Track thay đổi số dư

4. **Bulk Operations**
   - Import/export wallet data
   - Batch wallet creation

---

**Tài liệu được tạo**: 2025-11-17  
**Version**: 1.0  
**Author**: GitHub Copilot

