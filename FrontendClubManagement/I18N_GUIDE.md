# 🌍 Hướng dẫn sử dụng i18n (Đa ngôn ngữ)

## Đã cài đặt

✅ **i18next** - Thư viện i18n chính  
✅ **react-i18next** - Tích hợp React  
✅ **i18next-browser-languagedetector** - Tự động phát hiện ngôn ngữ  
✅ **i18next-http-backend** - Load translation files từ server  

## Cấu trúc Translation Files

```
public/
└── locales/
    ├── vi/
    │   └── common.json    # Tiếng Việt
    └── en/
        └── common.json    # English
```

## Các tính năng đã triển khai

### 1. Tooltip khi hover (giống Facebook)
Khi di chuột vào các item trên navbar, sẽ hiển thị tooltip với tên tương ứng:
- 🏠 Bảng tin / Dashboard
- 👥 Thành viên / Members
- 📅 Sự kiện / Events
- 🔔 Thông báo / Notifications
- ⚙️ Cài đặt / Settings

### 2. Đa ngôn ngữ
Hỗ trợ 2 ngôn ngữ:
- 🇻🇳 Tiếng Việt (mặc định)
- 🇺🇸 English

## Sử dụng trong Component

### Import hook
```tsx
import { useTranslation } from "react-i18next";
```

### Sử dụng trong component
```tsx
const MyComponent = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t("nav.dashboard")}</h1>
      <p>{t("search")}</p>
    </div>
  );
};
```

## Thêm Translation Mới

### 1. Thêm vào file JSON

**public/locales/vi/common.json**
```json
{
  "myNewKey": "Văn bản tiếng Việt",
  "nested": {
    "key": "Giá trị lồng nhau"
  }
}
```

**public/locales/en/common.json**
```json
{
  "myNewKey": "English text",
  "nested": {
    "key": "Nested value"
  }
}
```

### 2. Sử dụng trong code
```tsx
{t("myNewKey")}
{t("nested.key")}
```

## Translation Keys hiện có

### Navigation
```tsx
t("nav.dashboard")      // Bảng tin / Dashboard
t("nav.members")        // Thành viên / Members
t("nav.events")         // Sự kiện / Events
t("nav.notifications")  // Thông báo / Notifications
t("nav.settings")       // Cài đặt / Settings
```

### Departments
```tsx
t("departments.title")          // Phòng ban / Departments
t("departments.chuyen-mon")     // Ban Chuyên môn / Professional Department
t("departments.truyen-thong")   // Ban Truyền thông / Media Department
t("departments.to-chuc")        // Ban Tổ chức / Organization Department
t("departments.noi-vu")         // Ban Nội vụ / Internal Affairs Department
t("departments.doi-ngoai")      // Ban Đối ngoại / External Affairs Department
```

### Other
```tsx
t("search")  // Tìm kiếm... / Search...
```

## Đổi ngôn ngữ

### Từ code
```tsx
import { useTranslation } from "react-i18next";

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };
  
  return (
    <div>
      <button onClick={() => changeLanguage("vi")}>🇻🇳 Tiếng Việt</button>
      <button onClick={() => changeLanguage("en")}>🇺🇸 English</button>
    </div>
  );
};
```

### Từ URL
```
https://yourapp.com?lng=en
```

### Từ LocalStorage
Ngôn ngữ được lưu tự động vào localStorage sau khi chọn.

## Tooltip Component

### Cơ bản
```tsx
import { Tooltip } from "@/components/ui/tooltip";

<Tooltip content="Nội dung tooltip">
  <button>Hover me</button>
</Tooltip>
```

### Với i18n
```tsx
<Tooltip content={t("nav.dashboard")}>
  <YourComponent />
</Tooltip>
```

### Vị trí
```tsx
<Tooltip content="Text" position="top">     {/* Trên */}
<Tooltip content="Text" position="bottom">  {/* Dưới (mặc định) */}
<Tooltip content="Text" position="left">    {/* Trái */}
<Tooltip content="Text" position="right">   {/* Phải */}
```

## Auto-detection

i18n sẽ tự động phát hiện ngôn ngữ theo thứ tự:
1. Query string (?lng=en)
2. Cookie
3. LocalStorage
4. Trình duyệt (navigator.language)
5. Fallback: Tiếng Việt

## Namespace (Nâng cao)

Hiện tại dùng namespace mặc định là `common`. Bạn có thể tạo thêm namespace:

```
public/locales/vi/
  - common.json
  - auth.json      # Cho trang auth
  - dashboard.json # Cho dashboard
```

Sử dụng:
```tsx
const { t } = useTranslation(['common', 'auth']);

{t("common:nav.dashboard")}
{t("auth:login.title")}
```

## Best Practices

1. ✅ **Luôn dùng i18n** - Ngay cả khi chỉ có 1 ngôn ngữ
2. ✅ **Key rõ ràng** - Dùng nested keys: `nav.dashboard` thay vì `dashboard`
3. ✅ **Đồng bộ files** - Đảm bảo vi.json và en.json có cùng keys
4. ✅ **Fallback** - Luôn có text tiếng Việt (fallback language)
5. ✅ **Component riêng** - Tạo LanguageSwitcher component để đổi ngôn ngữ

## Ví dụ thực tế

### Trang Dashboard
```tsx
import { useTranslation } from "react-i18next";

const Dashboard = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t("nav.dashboard")}</h1>
      <p>Welcome message here...</p>
    </div>
  );
};
```

### Language Switcher Button
```tsx
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

const LanguageToggle = () => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;
  
  const toggleLanguage = () => {
    const newLang = currentLang === "vi" ? "en" : "vi";
    i18n.changeLanguage(newLang);
  };
  
  return (
    <Button onClick={toggleLanguage}>
      {currentLang === "vi" ? "🇺🇸 EN" : "🇻🇳 VI"}
    </Button>
  );
};
```

## Debug

Bật debug mode trong development:
```tsx
// src/i18n/i18n.ts
debug: import.meta.env.DEV,  // Đã bật
```

Xem console để kiểm tra:
- Translation keys loaded
- Missing translations
- Language changes




