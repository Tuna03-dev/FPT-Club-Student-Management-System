# Fee Search & Filter API Documentation

## Overview
API endpoint hỗ trợ tìm kiếm và lọc các khoản phí (fees) theo nhiều tiêu chí khác nhau.

## Endpoint

### GET `/api/clubs/{clubId}/fees`

**Description**: Lấy danh sách phí của club với khả năng search và filter

**Authorization**: Requires authentication (ALL_ROLES)

## Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `clubId` | Long | Yes | - | ID của club (path variable) |
| `search` | String | No | null | Từ khóa tìm kiếm trong title và description (không phân biệt hoa thường, không phân biệt dấu) |
| `isExpired` | Boolean | No | null | Lọc theo trạng thái hết hạn:<br>- `true`: Chỉ lấy phí đã hết hạn<br>- `false`: Chỉ lấy phí còn hạn<br>- `null`: Lấy tất cả |
| `page` | int | No | 0 | Số trang (bắt đầu từ 0) |
| `size` | int | No | 10 | Số lượng items mỗi trang |

## Examples

### 1. Lấy tất cả phí (không filter)
```http
GET /api/clubs/1/fees?page=0&size=10
```

### 2. Tìm kiếm phí theo từ khóa
```http
GET /api/clubs/1/fees?search=hội phí&page=0&size=10
```
- Tìm trong `title` và `description`
- Không phân biệt hoa thường
- Không phân biệt dấu (accent-insensitive) - ví dụ: "hoi phi" cũng match "hội phí"

### 3. Lọc chỉ phí đã hết hạn
```http
GET /api/clubs/1/fees?isExpired=true&page=0&size=10
```
- Lấy các phí có `due_date < CURDATE()`

### 4. Lọc chỉ phí còn hạn
```http
GET /api/clubs/1/fees?isExpired=false&page=0&size=10
```
- Lấy các phí có `due_date >= CURDATE()` hoặc `due_date IS NULL`

### 5. Kết hợp search và filter
```http
GET /api/clubs/1/fees?search=membership&isExpired=false&page=0&size=10
```
- Tìm phí có chứa "membership" VÀ còn hạn

## Response Format

```json
{
  "code": 1000,
  "message": "Success",
  "result": {
    "content": [
      {
        "id": 1,
        "title": "Phí hội viên kỳ 1",
        "description": "Phí hội viên cho học kỳ 1 năm 2024",
        "amount": 100000,
        "feeType": "MEMBERSHIP",
        "dueDate": "2024-12-31",
        "isMandatory": true,
        "isDraft": false,
        "hasEverExpired": false,
        "paidMembers": 15,
        "totalMembers": 50,
        "createdAt": "2024-01-01T00:00:00",
        "updatedAt": "2024-01-01T00:00:00"
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

## Filter Logic

### Search (accent-insensitive)
- Sử dụng `COLLATE utf8mb4_unicode_ci` trong MySQL/TiDB
- Tìm kiếm trong cả `title` và `description`
- Pattern: `LIKE %searchTerm%`

### Expiration Status
- **Expired** (`isExpired=true`): `due_date < CURDATE()`
- **Active** (`isExpired=false`): `due_date IS NULL OR due_date >= CURDATE()`
- **All** (`isExpired=null`): Không filter

## Implementation Details

### Repository Query
```java
@Query(value = "SELECT f.* FROM fees f " +
    "WHERE f.club_id = :clubId " +
    "AND f.is_draft = false " +
    "AND (:searchTerm IS NULL OR " +
    "    f.title COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', :searchTerm, '%') OR " +
    "    f.description COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', :searchTerm, '%')) " +
    "AND (:isExpired IS NULL OR " +
    "    (:isExpired = true AND f.due_date < CURDATE()) OR " +
    "    (:isExpired = false AND (f.due_date IS NULL OR f.due_date >= CURDATE())))",
    nativeQuery = true)
Page<Fee> searchFees(@Param("clubId") Long clubId,
                     @Param("searchTerm") String searchTerm,
                     @Param("isExpired") Boolean isExpired,
                     Pageable pageable);
```

### Service Method
```java
@Override
public PageResponse<FeeDetailResponse> searchFees(Long clubId, String searchTerm, Boolean isExpired, Pageable pageable) {
    String normalizedSearch = (searchTerm != null && !searchTerm.trim().isEmpty()) 
            ? searchTerm.trim() 
            : null;
    
    Page<Fee> feePage = feeRepository.searchFees(clubId, normalizedSearch, isExpired, pageable);
    return buildFeePageResponse(feePage, clubId);
}
```

## Notes

1. **Draft Fees**: Chỉ tìm kiếm trong các phí đã publish (`is_draft = false`)
2. **Paid/Total Members**: Response bao gồm thông tin số người đã đóng và tổng số thành viên
3. **Sorting**: Mặc định sắp xếp theo `createdAt DESC`
4. **Accent Insensitive**: Tìm kiếm "hoi phi" sẽ match "hội phí", "Hội Phí", "HỘI PHÍ", v.v.

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 1000 | Success | Request thành công |
| 1001 | Club not found | Club ID không tồn tại |
| 1002 | Unauthorized | Không có quyền truy cập |

## Testing

### Test Cases
1. ✅ Search với từ khóa tiếng Việt có dấu
2. ✅ Search với từ khóa tiếng Việt không dấu
3. ✅ Filter chỉ phí hết hạn
4. ✅ Filter chỉ phí còn hạn
5. ✅ Kết hợp search + filter
6. ✅ Pagination với search/filter

### Example Test
```bash
# Test 1: Search accent-insensitive
curl -X GET "http://localhost:8080/api/clubs/1/fees?search=hoi%20phi" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test 2: Filter expired fees
curl -X GET "http://localhost:8080/api/clubs/1/fees?isExpired=true" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test 3: Combine search + filter
curl -X GET "http://localhost:8080/api/clubs/1/fees?search=membership&isExpired=false" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-11-22 | Initial implementation with search and filter |

