# React Router Setup cho React 19

## 📦 Cài đặt

```bash
npm install react-router-dom@latest
```

## 🚀 Cách sử dụng

### 1. Import Router vào `main.tsx`

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
```

### 2. Config Routes trong `src/routes/index.tsx`

File `src/routes/index.tsx` đã được tạo sẵn với config cơ bản.

## 📝 Các Pattern thường dùng

### Basic Route
```tsx
{
  path: '/about',
  element: <AboutPage />,
}
```

### Nested Routes với Layout
```tsx
{
  path: '/',
  element: <MainLayout />,
  children: [
    { index: true, element: <HomePage /> },
    { path: 'about', element: <AboutPage /> },
  ]
}
```

### Lazy Loading (Code Splitting)
```tsx
import { lazy, Suspense } from 'react';

const HomePage = lazy(() => import('@/pages/Home'));

{
  path: '/',
  element: (
    <Suspense fallback={<div>Loading...</div>}>
      <HomePage />
    </Suspense>
  )
}
```

### Protected Routes
```tsx
// Tạo ProtectedRoute component
const ProtectedRoute = ({ children }) => {
  const isAuth = localStorage.getItem('token');
  return isAuth ? children : <Navigate to="/login" />;
};

// Sử dụng
{
  path: '/dashboard',
  element: <ProtectedRoute><Dashboard /></ProtectedRoute>
}
```

### Dynamic Routes
```tsx
{
  path: '/users/:userId',
  element: <UserProfile />,
}

// Access params trong component
import { useParams } from 'react-router-dom';
const { userId } = useParams();
```

### Data Loader (React Router v6.4+)
```tsx
{
  path: '/posts/:postId',
  element: <PostDetail />,
  loader: async ({ params }) => {
    const res = await fetch(`/api/posts/${params.postId}`);
    return res.json();
  }
}

// Access data trong component
import { useLoaderData } from 'react-router-dom';
const data = useLoaderData();
```

## 🔗 Navigation

### Link Component
```tsx
import { Link } from 'react-router-dom';

<Link to="/about">About</Link>
<Link to="/users/123">User 123</Link>
```

### NavLink (với active state)
```tsx
import { NavLink } from 'react-router-dom';

<NavLink 
  to="/about" 
  className={({ isActive }) => isActive ? 'active' : ''}
>
  About
</NavLink>
```

### Programmatic Navigation
```tsx
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();

navigate('/dashboard');
navigate(-1); // Go back
navigate(1);  // Go forward
```

## 📂 Cấu trúc thư mục đề xuất

```
src/
├── routes/
│   └── index.tsx          # Router config
├── pages/
│   ├── Home.tsx
│   ├── About.tsx
│   └── auth/
│       ├── Login.tsx
│       └── Register.tsx
├── layouts/
│   ├── MainLayout.tsx
│   └── AuthLayout.tsx
├── components/
│   ├── ProtectedRoute.tsx
│   └── ...
└── main.tsx
```

## 🎯 Best Practices

1. **Lazy Loading**: Dùng cho các route lớn để giảm bundle size
2. **Layout Components**: Tách layout để reuse
3. **Protected Routes**: Wrapper component cho auth routes
4. **Error Boundary**: Handle errors trong routes
5. **TypeScript**: Type params và loader data

## 📚 Resources

- [React Router Docs](https://reactrouter.com)
- [React 19 Docs](https://react.dev)

