# Fee Reminder Scheduled Job

## 📋 Tổng quan

Scheduled job tự động gửi thông báo và email nhắc nhở cho các thành viên chưa đóng phí bắt buộc (mandatory fees) khi gần đến hạn.

---

## 🕐 Schedule

### Cron Expression: `0 0 9 * * *`
- **Thời gian chạy**: 09:00 AM mỗi ngày
- **Timezone**: Server timezone (UTC+7 for Vietnam)

### Lịch nhắc nhở:
- **7 ngày trước hạn**: Thông báo sớm
- **3 ngày trước hạn**: Nhắc nhở khẩn cấp
- **1 ngày trước hạn**: Cảnh báo quan trọng
- **Ngày hết hạn**: Nhắc cuối cùng

---

## 🎯 Tính năng

### 1. **Tự động kiểm tra fees**
- ✅ Chỉ kiểm tra fees **bắt buộc** (`isMandatory = true`)
- ✅ Chỉ fees **đã publish** (`isDraft = false`)
- ✅ Chỉ fees **chưa hết hạn** (`hasEverExpired = false`)
- ✅ Fees có `dueDate` phù hợp với các mốc nhắc nhở

### 2. **Phát hiện members chưa đóng**
- Query tất cả active members trong club
- Loại trừ members đã đóng phí thành công
- Chỉ nhắc những người chưa đóng

### 3. **Gửi thông báo đa kênh**

#### a) **In-app Notification**
```java
NotificationType: FEE_REMINDER
Priority: HIGH
Title: Dựa theo số ngày còn lại
Message: Chi tiết về fee + hạn cuối
ActionUrl: /clubs/{clubId}/fees/{feeId}
```

#### b) **Email Notification**
- HTML-formatted email
- Thông tin đầy đủ về fee
- Call-to-action button
- Warning cho fees gần hết hạn
- Responsive design

---

## 📧 Email Template

### Subject Format:
- 7 ngày trước: `[Club Name] Nhắc nhở đóng phí: {Fee Title}`
- 3 ngày trước: `[Club Name] Nhắc nhở đóng phí: {Fee Title}`
- 1 ngày trước: `[Club Name] Còn 1 ngày để đóng phí: {Fee Title}`
- Ngày hết hạn: `[Club Name] HÔM NAY là hạn đóng phí: {Fee Title}`

### Email Content:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset='UTF-8'>
</head>
<body style='font-family: Arial, sans-serif;'>
  <!-- Header with club name -->
  <div style='background-color: #f8f9fa; padding: 20px;'>
    <h2 style='color: #007bff;'>Club Name</h2>
  </div>
  
  <!-- Greeting -->
  <div style='padding: 20px;'>
    <p>Xin chào <strong>Full Name</strong>,</p>
    
    <!-- Urgency message -->
    <p style='color: #dc3545; font-weight: bold;'>
      ⚠️ HÔM NAY là hạn cuối đóng phí bắt buộc!
    </p>
    
    <!-- Fee details box -->
    <div style='background-color: #f8f9fa; padding: 15px;'>
      <h3>Chi tiết khoản phí</h3>
      <p><strong>Tên khoản phí:</strong> {Fee Title}</p>
      <p><strong>Mô tả:</strong> {Fee Description}</p>
      <p><strong>Số tiền:</strong> {Amount} VND</p>
      <p><strong>Hạn cuối:</strong> {Due Date}</p>
      <p><strong>Loại phí:</strong> {Fee Type}</p>
    </div>
    
    <!-- Warning (for urgent cases) -->
    <div style='background-color: #fff3cd; padding: 15px;'>
      <p>⚠️ <strong>Lưu ý:</strong> Vui lòng đóng phí trước hạn 
      để tránh bị ảnh hưởng đến tư cách thành viên!</p>
    </div>
    
    <!-- Action button -->
    <div style='text-align: center; margin: 30px 0;'>
      <a href='{{frontend_url}}/clubs/{clubId}/fees/{feeId}' 
         style='display: inline-block; padding: 12px 30px; 
                background-color: #007bff; color: white;'>
        Đóng phí ngay
      </a>
    </div>
    
    <p style='color: #6c757d;'>
      Nếu bạn đã đóng phí, vui lòng bỏ qua email này.
    </p>
  </div>
  
  <!-- Footer -->
  <div style='background-color: #f8f9fa; padding: 15px;'>
    <p style='text-align: center; font-size: 12px;'>
      Email này được gửi tự động từ hệ thống quản lý câu lạc bộ.
    </p>
  </div>
</body>
</html>
```

---

## 🔧 Implementation Details

### Class Structure:
```java
@Component
@RequiredArgsConstructor
@Slf4j
public class FeeReminderScheduledJob {
    
    private final FeeRepository feeRepository;
    private final IncomeTransactionRepository incomeTransactionRepository;
    private final RoleMemberShipRepository roleMemberShipRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final UserRepository userRepository;
    
    @Scheduled(cron = "0 0 9 * * *")
    @Transactional
    public void sendFeeReminders() {
        // Main entry point
    }
}
```

### Processing Flow:
```
1. sendFeeReminders()
   ↓
2. For each reminder day (7, 3, 1, 0):
   ↓
3. sendRemindersForDate()
   ↓
4. Find fees due on target date
   ↓
5. For each fee:
   ↓
6. sendRemindersForFee()
   ↓
7. Get active members
   ↓
8. Filter unpaid members
   ↓
9. Send notifications + emails
```

### Key Methods:

#### 1. `sendRemindersForDate(LocalDate dueDate, int daysBeforeDue)`
- Find all mandatory fees due on target date
- Filter by: published, mandatory, not expired
- Process each fee

#### 2. `sendRemindersForFee(Fee fee, int daysBeforeDue)`
- Get all active members
- Filter unpaid members
- Send notifications & emails

#### 3. `hasPaidFee(Long feeId, Long userId)`
- Check if user has successful transaction for fee

#### 4. `sendNotifications(Fee fee, List<Long> unpaidMemberIds, int daysBeforeDue)`
- Send in-app notifications to unpaid members
- Type: FEE_REMINDER, Priority: HIGH

#### 5. `sendEmails(Fee fee, List<Long> unpaidMemberIds, int daysBeforeDue)`
- Send HTML emails to unpaid members
- Batch processing with error handling

---

## 📊 Business Logic

### Fee Selection Criteria:
```sql
WHERE isDraft = false
  AND isMandatory = true
  AND hasEverExpired = false
  AND dueDate = :targetDate
```

### Member Selection Criteria:
```sql
-- Get active members
SELECT user_id FROM role_memberships 
WHERE club_id = :clubId 
  AND is_active = true

-- Exclude paid members
AND NOT EXISTS (
  SELECT 1 FROM income_transactions 
  WHERE user_id = member.user_id 
    AND fee_id = :feeId 
    AND status = 'SUCCESS'
)
```

---

## 🔐 Security & Authorization

- **Job execution**: System-level, no user context
- **Notification actor**: NULL (system notification)
- **Email sender**: System configured email
- **Data access**: Read-only queries

---

## ⚡ Performance Considerations

### Query Optimization:
- ✅ Filter at database level
- ✅ Index on: `fees(due_date, is_draft, is_mandatory, has_ever_expired)`
- ✅ Index on: `income_transactions(fee_id, user_id, status)`
- ✅ Batch email sending

### Expected Load:
- Typical club: 50-200 members
- Typical fees per day: 1-5
- Total notifications: 50-1000 per execution
- Execution time: ~10-30 seconds

### Error Handling:
- Try-catch per fee (one failure doesn't stop others)
- Try-catch per email (one failure doesn't stop batch)
- Comprehensive logging for debugging

---

## 📝 Configuration

### Application Properties:
```yaml
# application.yml

# Mail configuration
spring:
  mail:
    host: smtp.gmail.com
    port: 587
    username: ${MAIL_USERNAME}
    password: ${MAIL_PASSWORD}
    properties:
      mail:
        smtp:
          auth: true
          starttls:
            enable: true
            required: true

# Frontend URL for email links
app:
  frontend:
    url: http://localhost:5173  # Change for production
```

### Environment Variables:
```bash
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
```

---

## 🧪 Testing

### Manual Testing:
```java
@Autowired
private FeeReminderScheduledJob job;

@Test
public void testFeeReminders() {
    // Manually trigger
    job.sendFeeReminders();
}
```

### Test Scenarios:

#### 1. **Normal Flow**
- Create mandatory fee with due date = today + 7 days
- Create active member without payment
- Run job
- Verify notification sent
- Verify email sent

#### 2. **Already Paid**
- Member has successful transaction
- Run job
- Verify NO notification/email sent

#### 3. **Draft Fee**
- Fee is draft
- Run job
- Verify NO notification sent

#### 4. **Non-Mandatory Fee**
- Fee is not mandatory
- Run job
- Verify NO notification sent

#### 5. **Multiple Members**
- 10 unpaid members
- Run job
- Verify all 10 receive notifications

---

## 📊 Monitoring & Logging

### Log Levels:

```java
// INFO: Normal execution
log.info("Starting scheduled job: Send Fee Reminders");
log.info("Found {} mandatory fees due on {}", fees.size(), dueDate);
log.info("Sent reminders to {} members for fee {}", count, feeId);

// ERROR: Failures
log.error("Error sending reminders for fee {}: {}", feeId, e.getMessage(), e);
log.error("Failed to send email to user {}: {}", userId, e.getMessage());
```

### Metrics to Monitor:
- Job execution time
- Number of fees processed
- Number of notifications sent
- Number of emails sent
- Failure rate

---

## 🚨 Error Scenarios & Handling

### 1. **Email Service Down**
- Log error
- Continue with other emails
- Don't stop notification sending

### 2. **Database Connection Lost**
- Job fails
- Will retry next day
- Members still get reminder (just later)

### 3. **Member Has No Email**
- Skip email sending
- Still send in-app notification

### 4. **Invalid Fee Data**
- Log error
- Skip that fee
- Continue with other fees

---

## 🔄 Related Components

| Component | Usage |
|-----------|-------|
| `FeeRepository` | Query fees by criteria |
| `IncomeTransactionRepository` | Check payment status |
| `RoleMemberShipRepository` | Get active members |
| `NotificationService` | Send in-app notifications |
| `EmailService` | Send emails |
| `UserRepository` | Get user details |

---

## 📈 Future Enhancements

### Planned:
- [ ] Customizable reminder schedule per club
- [ ] SMS notifications for urgent reminders
- [ ] Push notifications for mobile app
- [ ] Admin dashboard to track reminder effectiveness
- [ ] A/B testing different reminder templates
- [ ] Reminder history tracking

### Under Consideration:
- [ ] Allow members to snooze reminders
- [ ] Escalation to club admins if unpaid after deadline
- [ ] Auto-payment integration
- [ ] Penalty fee auto-calculation

---

## 📚 References

- Spring Scheduling: https://spring.io/guides/gs/scheduling-tasks/
- Cron Expressions: https://www.baeldung.com/cron-expressions
- JavaMail API: https://javaee.github.io/javamail/

---

**Version**: 1.0.0  
**Date**: November 23, 2025  
**Author**: Backend Team

