import { createBrowserRouter } from 'react-router-dom';


export const router = createBrowserRouter([
  {
    path: '/',
    element: <div>Main Layout</div>,
    children: [
      {
        index: true,
        element: <div>Home Page</div>,
      },
      {
        path: 'about',
        element: <div>About Page</div>,
      },
    ],
  },
  {
    path: '*',
    element: <div>404 Not Found</div>,
  },
]);

/**
 * USAGE EXAMPLES:
 * 
 * 1. Basic Route:
 * {
 *   path: '/about',
 *   element: <AboutPage />,
 * }
 * 
 * 2. Nested Routes:
 * {
 *   path: '/dashboard',
 *   element: <DashboardLayout />,
 *   children: [
 *     { index: true, element: <DashboardHome /> },
 *     { path: 'settings', element: <Settings /> },
 *   ]
 * }
 * 
 * 3. Lazy Loading:
 * const HomePage = lazy(() => import('@/pages/Home'));
 * {
 *   path: '/',
 *   element: <Suspense fallback={<Loading />}><HomePage /></Suspense>
 * }
 * 
 * 4. Protected Routes:
 * {
 *   path: '/admin',
 *   element: <ProtectedRoute><AdminLayout /></ProtectedRoute>,
 *   children: [...]
 * }
 * 
 * 5. Dynamic Routes:
 * {
 *   path: '/users/:userId',
 *   element: <UserProfile />,
 * }
 * 
 * 6. Route with Loader (Data Fetching):
 * {
 *   path: '/posts/:postId',
 *   element: <PostDetail />,
 *   loader: async ({ params }) => {
 *     return fetch(`/api/posts/${params.postId}`);
 *   }
 * }
 */
