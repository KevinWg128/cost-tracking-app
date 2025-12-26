# Protect Routes
## You can create a higher-order component (HOC) or use a custom hook to protect pages that require authentication

```typescript
// hooks/useAuthRedirect.ts
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext'; // Your Auth Context

const useAuthRedirect = (redirectTo = '/login') => {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push(redirectTo);
    }
  }, [currentUser, loading, router, redirectTo]);

  return { currentUser, loading };
};

export default useAuthRedirect;

// Example protected page (pages/dashboard.tsx)
import useAuthRedirect from '../hooks/useAuthRedirect';

const DashboardPage = () => {
  const { currentUser, loading } = useAuthRedirect('/login');

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!currentUser) {
    return null; // Redirect is handled by the hook
  }

  return (
    <div>
      <h1>Welcome, {currentUser.email}!</h1>
      {/* Your dashboard content */}
    </div>
  );
};

export default DashboardPage;

```
