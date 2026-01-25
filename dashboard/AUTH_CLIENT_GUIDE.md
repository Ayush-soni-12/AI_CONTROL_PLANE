# Authentication Client Usage Guide

## 🎯 Overview

This guide shows you how to use the authentication client in your Next.js dashboard. All functions use **axios** with **`withCredentials: true`** for secure cookie-based authentication.

## 📦 What's Included

### Files Created:

- ✅ `lib/auth-client.ts` - Authentication functions (signup, login, authenticate, logout)
- ✅ `lib/types.ts` - Updated with auth types
- ✅ `lib/control-plane-client.ts` - Migrated to axios for consistency

### Dependencies Installed:

- ✅ `axios` - HTTP client with cookie support

---

## 🔐 Authentication Functions

### 1. **signup(data)** - Register New User

```typescript
import { signup } from "@/lib/auth-client";

// In your component or server action
try {
  const result = await signup({
    name: "John Doe",
    email: "john@example.com",
    password: "password123",
    confirmPassword: "password123",
  });

  console.log("User created:", result.user);
  console.log("Token:", result.access_token);
  // Cookie is automatically set by the server!
} catch (error) {
  console.error("Signup failed:", error.message);
}
```

**Returns:**

```typescript
{
  access_token: string;
  token_type: "bearer";
  user: {
    id: number;
    name: string;
    email: string;
    created_at: string;
  }
}
```

---

### 2. **login(data)** - Login User

```typescript
import { login } from "@/lib/auth-client";

try {
  const result = await login({
    email: "john@example.com",
    password: "password123",
  });

  console.log("Logged in:", result.user);
  // Cookie is automatically set! No need to store anything in localStorage
} catch (error) {
  console.error("Login failed:", error.message);
}
```

---

### 3. **authenticate()** - Check Authentication Status ⭐

This is the **most important function**! It checks if the user is authenticated by calling `/me` endpoint.

```typescript
import { authenticate } from "@/lib/auth-client";

// Check if user is logged in
const user = await authenticate();

if (user) {
  console.log("User is authenticated:", user);
  // user = { id, name, email, created_at }
} else {
  console.log("User is not authenticated");
  // Redirect to login
}
```

**Key Features:**

- ✅ Automatically sends cookies via `withCredentials: true`
- ✅ No need to manually handle tokens
- ✅ Returns `User` object if authenticated, `null` if not
- ✅ Safe to call multiple times (no side effects)

---

### 4. **logout()** - Logout User

```typescript
import { logout } from "@/lib/auth-client";

await logout();
// Cookie is cleared on server
// Redirect user to login page
```

---

### 5. **isAuthenticated()** - Boolean Check

```typescript
import { isAuthenticated } from "@/lib/auth-client";

const isLoggedIn = await isAuthenticated();

if (isLoggedIn) {
  // Show dashboard
} else {
  // Show login page
}
```

---

### 6. **getCurrentUser()** - Get User or Throw

```typescript
import { getCurrentUser } from "@/lib/auth-client";

try {
  const user = await getCurrentUser();
  console.log("Current user:", user);
} catch (error) {
  console.error("Not authenticated");
  // Redirect to login
}
```

---

## 🚀 Real-World Examples

### Example 1: Login Page Component

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/auth-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login({ email, password });
      console.log('Login successful:', result.user);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <p className="text-red-500">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

---

### Example 2: Protected Route (Middleware)

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Note: You'll need to implement server-side auth check
  // For now, this is a client-side example

  const protectedPaths = ["/dashboard", "/settings", "/profile"];
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (isProtectedPath) {
    // Check authentication on server
    // If not authenticated, redirect to login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}
```

---

### Example 3: Dashboard with Auth Check

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authenticate, logout } from '@/lib/auth-client';
import type { User } from '@/lib/types';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication on mount
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const authenticatedUser = await authenticate();

    if (!authenticatedUser) {
      // Not authenticated, redirect to login
      router.push('/login');
      return;
    }

    setUser(authenticatedUser);
    setLoading(false);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Welcome, {user?.name}!</h1>
      <p>Email: {user?.email}</p>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
```

---

### Example 4: Signup Page

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signup } from '@/lib/auth-client';

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signup(formData);
      console.log('Signup successful:', result.user);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignup}>
      <input
        type="text"
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
        placeholder="Full Name"
        required
      />
      <input
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({...formData, email: e.target.value})}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={formData.password}
        onChange={(e) => setFormData({...formData, password: e.target.value})}
        placeholder="Password"
        required
      />
      <input
        type="password"
        value={formData.confirmPassword}
        onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
        placeholder="Confirm Password"
        required
      />
      {error && <p className="text-red-500">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Creating account...' : 'Sign Up'}
      </button>
    </form>
  );
}
```

---

### Example 5: Auth Context (Global State)

```typescript
// contexts/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { authenticate, logout as logoutUser } from '@/lib/auth-client';
import type { User } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const authenticatedUser = await authenticate();
    setUser(authenticatedUser);
    setLoading(false);
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshAuth: checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

**Usage:**

```typescript
// app/layout.tsx
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

// In any component:
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, loading, logout } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please login</div>;

  return <div>Hello {user.name}!</div>;
}
```

---

## 🔒 Security Features

### ✅ Cookie-Based Authentication

- Cookies are **HttpOnly** (can't be accessed by JavaScript)
- Automatically sent with every request via `withCredentials: true`
- More secure than localStorage (protected from XSS attacks)

### ✅ No Manual Token Management

- No need to store tokens in localStorage
- No need to manually add Authorization headers
- Axios handles everything automatically!

### ✅ CORS Configuration

Make sure your backend allows credentials:

```python
# In your FastAPI app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Your frontend URL
    allow_credentials=True,  # ⭐ This is crucial!
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 🎯 Key Points to Remember

1. **Always use `withCredentials: true`** - Already configured in auth-client.ts
2. **Don't store tokens in localStorage** - Cookies are more secure
3. **Use `authenticate()` to check auth status** - It's the single source of truth
4. **Cookies are sent automatically** - No manual work needed
5. **Backend must allow credentials** - Check CORS settings

---

## 🧪 Testing

```typescript
// Test authentication flow
import { signup, login, authenticate, logout } from "@/lib/auth-client";

async function testAuth() {
  // 1. Signup
  const signupResult = await signup({
    name: "Test User",
    email: "test@example.com",
    password: "password123",
    confirmPassword: "password123",
  });
  console.log("✅ Signup:", signupResult.user);

  // 2. Check authentication
  const user1 = await authenticate();
  console.log("✅ Authenticated:", user1);

  // 3. Logout
  await logout();
  console.log("✅ Logged out");

  // 4. Check authentication again
  const user2 = await authenticate();
  console.log("❌ Not authenticated:", user2); // Should be null

  // 5. Login
  const loginResult = await login({
    email: "test@example.com",
    password: "password123",
  });
  console.log("✅ Login:", loginResult.user);
}
```

---

## 📚 Summary

You now have a complete, secure authentication system using:

- ✅ Axios with `withCredentials: true`
- ✅ Cookie-based authentication (no localStorage)
- ✅ Simple, easy-to-use functions
- ✅ TypeScript types for safety
- ✅ Comprehensive error handling

**Main function to remember:** `authenticate()` - Use this to check if user is logged in!

Happy coding! 🚀
