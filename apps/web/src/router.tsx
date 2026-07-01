import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import { LoginPage } from "./routes/login";
import { RegisterPage } from "./routes/register";
import { TodosPage } from "./routes/todos";

// Centered spinner shown while the session is being restored.
function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center" role="status" aria-label="Loading">
      <div className="size-6 animate-spin rounded-full border-2 border-border border-t-accent" />
    </div>
  );
}

// Wraps every route with the auth provider.
function Root() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

// Gate that redirects unauthenticated users to /login.
function Protected() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

// Keeps authenticated users away from the auth pages.
function PublicOnly() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      {
        element: <Protected />,
        children: [{ path: "/", element: <TodosPage /> }],
      },
      {
        element: <PublicOnly />,
        children: [
          { path: "/login", element: <LoginPage /> },
          { path: "/register", element: <RegisterPage /> },
        ],
      },
    ],
  },
]);
