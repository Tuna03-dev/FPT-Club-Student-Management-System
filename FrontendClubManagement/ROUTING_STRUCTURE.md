# Cấu trúc Routing và Folder - MyClub Management

## 📁 Cấu trúc Folder

```
src/
├── routes/                         # Routing configuration
│   └── index.tsx                  # Router + Route constants + Helper functions
│
├── layouts/                        # Layouts
│   └── ClubLayout.tsx             # Layout cho MyClub module (với Outlet)
│
├── pages/                          # Trang chính
│   ├── Home.tsx                   # Trang chủ
│   └── myclub/                    # Module quản lý câu lạc bộ
│       ├── Dashboard.tsx          # Dashboard tổng quan
│       ├── Notifications.tsx      # Trang thông báo
│       ├── Settings.tsx           # Cài đặt
│       ├── members/               # Quản lý thành viên
│       │   └── MemberList.tsx
│       └── events/                # Quản lý sự kiện
│           └── EventList.tsx
│
├── components/                     # Components tái sử dụng
│   └── ui/                        # UI components (Button, Input, Avatar, etc.)
│
├── api/                           # API calls
│   └── axiosClient.ts
│
├── hooks/                         # Custom hooks
├── types/                         # TypeScript types
└── utils/                         # Utility functions
```

## 🛣️ Cấu trúc Routes

### Routes hiện tại:

| Path | Component | Mô tả |
|------|-----------|-------|
| `/` | Home | Trang chủ |
| `/myclub` | ClubLayout > Dashboard | Dashboard tổng quan CLB |
| `/myclub/members` | ClubLayout > MemberList | Danh sách thành viên |
| `/myclub/events` | ClubLayout > EventList | Danh sách sự kiện |
| `/myclub/notifications` | ClubLayout > Notifications | Thông báo |
| `/myclub/settings` | ClubLayout > Settings | Cài đặt |
| `/myclub/department/:slug` | ClubLayout > Dashboard | Chi tiết phòng ban |

### Route Constants

Tất cả routes được định nghĩa trong `routes/index.tsx`:

```typescript
import { ROUTES } from "@/routes";

// Sử dụng
<Link to={ROUTES.MYCLUB.MEMBERS.LIST}>Thành viên</Link>
```

### Helper Functions

```typescript
import { generatePath } from "@/routes";

// Generate dynamic routes
const memberUrl = generatePath.memberDetail("123"); 
// => "/myclub/members/123"
```

## 🎨 Layout System

### ClubLayout
- **Vị trí**: `src/layouts/ClubLayout.tsx`
- **Sử dụng**: Wrapper cho tất cả pages trong `/myclub`
- **Tính năng**:
  - Header với navigation (Bảng tin, Thành viên, Sự kiện, Thông báo)
  - Sidebar với danh sách phòng ban
  - Search bar
  - User profile menu
  - **Outlet** để render nested routes

## 📄 Thêm Route Mới

### 1. Tạo Page Component

```tsx
// src/pages/myclub/NewPage.tsx
export const NewPage = () => {
  return (
    <div className="p-6">
      <h1>New Page</h1>
    </div>
  );
};
```

### 2. Thêm Route Constant (Optional)

```typescript
// src/routes/index.tsx
export const ROUTES = {
  MYCLUB: {
    // ... existing routes
    NEW_PAGE: '/myclub/new-page',
  },
};
```

### 3. Thêm Route vào Router

```tsx
// src/routes/index.tsx
import { NewPage } from "@/pages/myclub/NewPage";

// Trong children của ClubLayout:
{
  path: "new-page",
  element: <NewPage />,
}
```

### 4. Thêm Link vào Navigation (nếu cần)

```tsx
// src/layouts/ClubLayout.tsx
const navItems = [
  // ... existing items
  { title: "New Page", url: "/myclub/new-page", icon: YourIcon },
];
```

## 🚀 Chạy Ứng Dụng

```bash
# Development
npm run dev

# Build
npm run build

# Preview build
npm run preview
```

## 📝 Best Practices

1. **Route Organization**: Tất cả routes nên được định nghĩa trong `routes.config.ts`
2. **Nested Routes**: Sử dụng Outlet trong layout để render nested routes
3. **Dynamic Routes**: Dùng helper functions để generate dynamic paths
4. **Component Structure**: Mỗi page nên là một component riêng biệt
5. **Lazy Loading**: Có thể thêm lazy loading cho các routes lớn:

```tsx
const Dashboard = lazy(() => import("@/pages/myclub/Dashboard"));

// Wrap with Suspense
<Suspense fallback={<Loading />}>
  <Dashboard />
</Suspense>
```

## 🔒 Protected Routes (Tương lai)

Để thêm protected routes, tạo component `ProtectedRoute`:

```tsx
// src/routes/ProtectedRoute.tsx
export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuth(); // Your auth logic
  
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" />;
  }
  
  return <>{children}</>;
};

// Sử dụng:
{
  path: ROUTES.MYCLUB.ROOT,
  element: <ProtectedRoute><ClubLayout /></ProtectedRoute>,
}
```

## 📚 Resources

- [React Router Documentation](https://reactrouter.com/)
- [Nested Routes Guide](https://reactrouter.com/en/main/start/tutorial#nested-routes)
- [Layout Routes](https://reactrouter.com/en/main/start/concepts#layout-routes)

