import axios, { AxiosError } from 'axios';
import type { SignupRequest, LoginRequest, AuthResponse, User, AuthError } from './types';

const CONTROL_PLANE_URL = process.env.NEXT_PUBLIC_CONTROL_PLANE_URL || 'http://localhost:8000';

// Create axios instance with default config
const authClient = axios.create({
  baseURL: `${CONTROL_PLANE_URL}/api/auth`,
  withCredentials: true, // 🍪 This is crucial for cookie-based auth!
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Sign up a new user
 * 
 * @param data - Signup request data (name, email, password, confirmPassword)
 * @returns Promise with auth response (token + user)
 * @throws AuthError if signup fails
 */
export async function signup(data: SignupRequest): Promise<AuthResponse> {
  try {
    const response = await authClient.post<AuthResponse>('/signup', data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<AuthError>;
      throw new Error(axiosError.response?.data?.detail || 'Signup failed');
    }
    throw new Error('An unexpected error occurred during signup');
  }
}

/**
 * Login with email and password
 * 
 * @param data - Login credentials (email, password)
 * @returns Promise with auth response (token + user)
 * @throws AuthError if login fails
 */
export async function login(data: LoginRequest): Promise<AuthResponse> {
  try {
    const response = await authClient.post<AuthResponse>('/login', data);
    console.log(response.data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<AuthError>;
      throw new Error(axiosError.response?.data?.detail || 'Login failed');
    }
    throw new Error('An unexpected error occurred during login');
  }
}

/**
 * Check if user is authenticated by calling /me endpoint
 * 
 * This function sends a request to /me with cookies automatically.
 * No need to manually send tokens - cookies are sent via withCredentials!
 * 
 * @returns Promise with User if authenticated, null if not
 */
export async function authenticate(): Promise<User | null> {
  try {
    const response = await authClient.get<User>('/me');
    return response.data;
  } catch {
    // If 401 or any error, user is not authenticated
    return null;
  }
}

/**
 * Logout the current user
 * 
 * Clears the authentication cookie on the server
 * 
 * @returns Promise that resolves when logout is complete
 */
export async function logout(): Promise<void> {
  try {
    await authClient.post('/logout');
  } catch (error) {
    console.error('Logout error:', error);
    // Even if logout fails, we can consider the user logged out on client
  }
}

/**
 * Check if user is authenticated (alias for authenticate)
 * 
 * @returns Promise with boolean indicating auth status
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await authenticate();
  return user !== null;
}

/**
 * Get current authenticated user
 * 
 * @returns Promise with User if authenticated
 * @throws Error if not authenticated
 */
export async function getCurrentUser(): Promise<User> {
  const user = await authenticate();
  if (!user) {
    throw new Error('Not authenticated');
  }
  return user;
}
