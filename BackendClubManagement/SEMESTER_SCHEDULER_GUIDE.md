# Semester Scheduled Job - Tự Động Cập Nhật Kỳ Hiện Tại

## 📋 Tổng Quan

Đã tạo scheduled job tự động kiểm tra và cập nhật kỳ hiện tại mỗi ngày vào lúc **00:01 AM**.

## 📁 Files Đã Tạo/Sửa

### 1. **SemesterScheduledJob.java** (Mới)
**Path:** `src/main/java/com/sep490/backendclubmanagement/scheduled/SemesterScheduledJob.java`

**Chức năng:**
- Chạy tự động mỗi ngày lúc 00:01 AM
- Kiểm tra ngày hiện tại có nằm trong khoảng thời gian của kỳ nào không
- Cập nhật `isCurrent = true` cho kỳ đúng
- Cập nhật `isCurrent = false` cho các kỳ khác

**Cron Expression:** `"0 1 0 * * *"`
- Giây: 0
- Phút: 1
- Giờ: 0 (nửa đêm)
- Ngày trong tháng: * (mỗi ngày)
- Tháng: * (mỗi tháng)
- Ngày trong tuần: * (mỗi ngày)

### 2. **SemesterRepository.java** (Đã Sửa)
**Thêm 3 methods mới:**

#### `findSemesterByDate(LocalDate today)`
Tìm kỳ học dựa trên ngày cho trước
```java
@Query("""
    SELECT s FROM Semester s 
    WHERE :today BETWEEN s.startDate AND s.endDate
    AND s.deletedAt IS NULL
""")
Optional<Semester> findSemesterByDate(@Param("today") LocalDate today);
```

#### `setAllSemestersNotCurrent()`
Set tất cả các kỳ thành không phải kỳ hiện tại
```java
@Modifying
@Query("""
    UPDATE Semester s 
    SET s.isCurrent = false
    WHERE s.isCurrent = true
    AND s.deletedAt IS NULL
""")
void setAllSemestersNotCurrent();
```

#### `setCurrentSemester(Long semesterId)`
Set một kỳ cụ thể thành kỳ hiện tại
```java
@Modifying
@Query("""
    UPDATE Semester s 
    SET s.isCurrent = true
    WHERE s.id = :semesterId
""")
void setCurrentSemester(@Param("semesterId") Long semesterId);
```

### 3. **SemesterController.java** (Mới)
**Path:** `src/main/java/com/sep490/backendclubmanagement/controller/SemesterController.java`

**Endpoints:**

#### GET `/api/semesters`
Lấy tất cả các kỳ học

#### GET `/api/semesters/current`
Lấy kỳ học hiện tại

#### GET `/api/semesters/{id}`
Lấy kỳ học theo ID

#### POST `/api/semesters`
Tạo kỳ học mới

#### PUT `/api/semesters/{id}`
Cập nhật kỳ học

#### DELETE `/api/semesters/{id}`
Xóa kỳ học (soft delete)

#### POST `/api/semesters/trigger-update` ⭐
**Trigger thủ công scheduled job** - Dùng để test hoặc cập nhật ngay lập tức

## 🔄 Luồng Hoạt Động

```
1. Scheduled Job chạy lúc 00:01 AM mỗi ngày
   ↓
2. Lấy ngày hiện tại (today)
   ↓
3. Query tìm kỳ học có: today BETWEEN startDate AND endDate
   ↓
4. Nếu TÌM THẤY kỳ phù hợp:
   ├─ Check xem kỳ đó đã là current chưa?
   │  ├─ Nếu ĐÃ là current → Không làm gì (skip)
   │  └─ Nếu CHƯA là current →
   │     ├─ Set ALL semesters: isCurrent = false
   │     └─ Set kỳ tìm được: isCurrent = true
   ↓
5. Nếu KHÔNG TÌM THẤY (không trong kỳ nào):
   └─ Set ALL semesters: isCurrent = false
```

## 🧪 Cách Test

### 1. Test Thủ Công Qua API

```bash
# Trigger update ngay lập tức
POST http://localhost:8080/api/semesters/trigger-update

# Kiểm tra kỳ hiện tại
GET http://localhost:8080/api/semesters/current

# Xem tất cả các kỳ
GET http://localhost:8080/api/semesters
```

### 2. Test Với Database

#### Tạo test data:
```sql
-- Kỳ trong quá khứ
INSERT INTO semesters (semester_name, semester_code, start_date, end_date, is_current, created_at, updated_at)
VALUES ('Fall 2024', 'FALL2024', '2024-09-01', '2024-12-31', false, NOW(), NOW());

-- Kỳ hiện tại (2025)
INSERT INTO semesters (semester_name, semester_code, start_date, end_date, is_current, created_at, updated_at)
VALUES ('Spring 2025', 'SPRING2025', '2025-01-01', '2025-05-31', false, NOW(), NOW());

-- Kỳ trong tương lai
INSERT INTO semesters (semester_name, semester_code, start_date, end_date, is_current, created_at, updated_at)
VALUES ('Fall 2025', 'FALL2025', '2025-09-01', '2025-12-31', false, NOW(), NOW());
```

#### Trigger update:
```bash
POST http://localhost:8080/api/semesters/trigger-update
```

#### Verify kết quả:
```sql
SELECT id, semester_name, start_date, end_date, is_current 
FROM semesters 
WHERE deleted_at IS NULL
ORDER BY start_date;
```

**Kết quả mong đợi (ngày hôm nay: 2025-11-12):**
- Fall 2024: `is_current = FALSE` ❌
- Spring 2025: `is_current = FALSE` ❌
- Fall 2025: `is_current = TRUE` ✅ (vì 2025-11-12 nằm trong 2025-09-01 đến 2025-12-31)

### 3. Kiểm Tra Logs

Xem logs để theo dõi scheduled job:
```
[INFO] Starting scheduled job: Update Current Semester
[INFO] Checking for current semester on date: 2025-11-12
[INFO] Setting all semesters to isCurrent = false
[INFO] Setting semester 'Fall 2025' (ID: 3) as current
[INFO] Successfully updated current semester to: 'Fall 2025' (ID: 3), Period: 2025-09-01 to 2025-12-31
[INFO] Completed scheduled job: Update Current Semester
```

## ⚙️ Configuration

### Thay Đổi Thời Gian Chạy

Sửa cron expression trong `SemesterScheduledJob.java`:

```java
// Chạy mỗi ngày lúc 00:01 AM (mặc định)
@Scheduled(cron = "0 1 0 * * *")

// Chạy mỗi ngày lúc 2:00 AM
@Scheduled(cron = "0 0 2 * * *")

// Chạy mỗi giờ (để test)
@Scheduled(cron = "0 0 * * * *")

// Chạy mỗi 5 phút (để test)
@Scheduled(cron = "0 */5 * * * *")

// Chạy mỗi 30 giây (để test nhanh)
@Scheduled(fixedDelay = 30000)
```

### Enable/Disable Scheduling

Trong `application.yml`:
```yaml
spring:
  task:
    scheduling:
      enabled: true  # Set false để tắt tất cả scheduled jobs
```

Hoặc tắt riêng job bằng cách comment annotation:
```java
// @Scheduled(cron = "0 1 0 * * *")
public void updateCurrentSemester() {
    // ...
}
```

## 🔐 Security Considerations

### Protect Manual Trigger Endpoint

Nên bảo vệ endpoint `/api/semesters/trigger-update` chỉ cho ADMIN:

```java
@PostMapping("/trigger-update")
@PreAuthorize("hasRole('ADMIN')")  // Thêm annotation này
public ApiResponse<String> triggerSemesterUpdate() {
    // ...
}
```

## 📊 Monitoring

### Metrics Để Theo Dõi

1. **Số lần job chạy thành công/thất bại**
2. **Thời gian xử lý mỗi lần chạy**
3. **Số lần cập nhật kỳ hiện tại**
4. **Alert khi không tìm thấy kỳ nào cho ngày hiện tại**

### Health Check

Có thể thêm endpoint để check last run:
```java
@GetMapping("/scheduler-status")
public ApiResponse<SchedulerStatus> getSchedulerStatus() {
    // Return last run time, status, etc.
}
```

## 🐛 Troubleshooting

### Job không chạy?

1. **Check @EnableScheduling** trong `BackendClubManagementApplication.java`:
   ```java
   @SpringBootApplication
   @EnableScheduling  // ✅ Phải có annotation này
   public class BackendClubManagementApplication {
   ```

2. **Check logs** xem có error không

3. **Test manual trigger** qua API endpoint

### Không cập nhật đúng kỳ?

1. **Check dữ liệu** trong database:
   ```sql
   SELECT * FROM semesters WHERE deleted_at IS NULL;
   ```

2. **Check logic** xem ngày hiện tại có nằm trong khoảng nào không

3. **Run manual trigger** và xem logs chi tiết

## 📝 Notes

- Job chạy với `@Transactional` nên nếu có lỗi sẽ tự động rollback
- Sử dụng `LocalDate.now()` để lấy ngày hiện tại (server timezone)
- Soft delete: Chỉ check các kỳ có `deletedAt IS NULL`
- Thread-safe: Spring Scheduler đảm bảo không chạy đồng thời nhiều instance

## 🎯 Future Enhancements

1. **Add notification** khi chuyển kỳ
2. **Send email** thông báo cho admin
3. **Store job execution history** trong database
4. **Dashboard** để xem lịch sử chạy job
5. **Configurable schedule** qua database/config file

