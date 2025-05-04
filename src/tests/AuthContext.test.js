import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { supabase } from '../contexts/client';

// Mock the Supabase client
jest.mock('@supabase/supabase-js');

// Mock document visibilityState
const mockVisibilityState = jest.fn();
Object.defineProperty(document, 'visibilityState', {
  get: mockVisibilityState,
  configurable: true,
});

// Mock window.location for signOut redirect
const mockLocation = { href: '' };
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('AuthProvider', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockVisibilityState.mockReturnValue('visible');
    mockLocation.href = '';
    supabase.auth.getSession.mockImplementation(() =>
      new Promise((resolve) => setTimeout(() => resolve({ data: { session: null }, error: null }), 0))
    );
    supabase.auth.onAuthStateChange.mockImplementation((callback) => {
      supabase.auth._onAuthStateChangeCallback = callback;
      return {
        data: {
          subscription: {
            unsubscribe: jest.fn(),
          },
        },
      };
    });
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { role: 'user' }, error: null }),
        }),
      }),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllTimers();
  });

  test('renders children and sets initial loading state', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <div>Test Child</div>
        </AuthProvider>
      );
    });
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  test('initializes with no session and loading true', async () => {
    let authContext;
    const TestComponent = () => {
      authContext = useAuth();
      return null;
    };

    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });

    // Check initial loading state before timers
    expect(authContext.loading).toBe(true);
    expect(authContext.session).toBe(null);
    expect(authContext.user).toBe(null);
    expect(authContext.userRole).toBe(null);

    // Advance timers to resolve getSession
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => expect(authContext.loading).toBe(false));
  });

  test('sets session, user, and role when a session exists', async () => {
    const mockSession = {
      user: { id: '123', email: 'test@example.com' },
    };
    supabase.auth.getSession.mockImplementationOnce(() =>
      new Promise((resolve) => setTimeout(() => resolve({ data: { session: mockSession }, error: null }), 0))
    );
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
        }),
      }),
    });

    let authContext;
    const TestComponent = () => {
      authContext = useAuth();
      return null;
    };

    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => expect(authContext.loading).toBe(false));
    expect(authContext.session).toBe(mockSession);
    expect(authContext.user).toBe(mockSession.user);
    expect(authContext.userRole).toBe('admin');
    expect(supabase.from).toHaveBeenCalledWith('user_profiles');
  });

  test('refreshes session on visibility change', async () => {
    const mockSession = {
      user: { id: '789', email: 'visible@example.com' },
    };
    supabase.auth.getSession
      .mockImplementationOnce(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: { session: null }, error: null }), 0))
      )
      .mockImplementationOnce(() =>
        new Promise((resolve) => setTimeout(() => resolve({ data: { session: mockSession }, error: null }), 0))
      );
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { role: 'editor' }, error: null }),
        }),
      }),
    });

    let authContext;
    const TestComponent = () => {
      authContext = useAuth();
      return null;
    };

    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => expect(authContext.loading).toBe(false));
    expect(authContext.session).toBe(null);

    // Simulate visibility change
    await act(async () => {
      mockVisibilityState.mockReturnValue('visible');
      document.dispatchEvent(new Event('visibilitychange'));
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => expect(authContext.userRole).toBe('editor'));
    expect(authContext.session).toBe(mockSession);
    expect(authContext.user).toBe(mockSession.user);
    expect(supabase.auth.getSession).toHaveBeenCalledTimes(2);
  });

  test('refreshes session every 5 minutes when visible', async () => {
    const mockSession = {
      user: { id: '123', email: 'test@example.com' },
    };
    supabase.auth.getSession.mockImplementation(() =>
      new Promise((resolve) => setTimeout(() => resolve({ data: { session: mockSession }, error: null }), 0))
    );
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { role: 'user' }, error: null }),
        }),
      }),
    });

    let authContext;
    const TestComponent = () => {
      authContext = useAuth();
      return null;
    };

    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => expect(authContext.loading).toBe(false));
    expect(supabase.auth.getSession).toHaveBeenCalledTimes(1);

    // Advance time by 5 minutes
    await act(async () => {
      jest.advanceTimersByTime(5 * 60 * 1000);
    });

    await waitFor(() => expect(supabase.auth.getSession).toHaveBeenCalledTimes(2));
    expect(authContext.session).toBe(mockSession);
  });

  test('does not refresh session every 5 minutes when not visible', async () => {
    mockVisibilityState.mockReturnValue('hidden');
    supabase.auth.getSession.mockImplementation(() =>
      new Promise((resolve) => setTimeout(() => resolve({ data: { session: null }, error: null }), 0))
    );

    let authContext;
    const TestComponent = () => {
      authContext = useAuth();
      return null;
    };

    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => expect(authContext.loading).toBe(false));
    expect(supabase.auth.getSession).toHaveBeenCalledTimes(1);

    // Advance time by 5 minutes
    await act(async () => {
      jest.advanceTimersByTime(5 * 60 * 1000);
    });

    expect(supabase.auth.getSession).toHaveBeenCalledTimes(1); // No additional call
  });

  test('handles fetchUserRole error', async () => {
    const mockSession = {
      user: { id: '123', email: 'test@example.com' },
    };
    supabase.auth.getSession.mockImplementation(() =>
      new Promise((resolve) => setTimeout(() => resolve({ data: { session: mockSession }, error: null }), 0))
    );
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
        }),
      }),
    });

    // Suppress console.error for this test
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    let authContext;
    const TestComponent = () => {
      authContext = useAuth();
      return null;
    };

    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => expect(authContext.loading).toBe(false));
    expect(authContext.session).toBe(mockSession);
    expect(authContext.user).toBe(mockSession.user);
    expect(authContext.userRole).toBe('user'); // Default role on error

    consoleErrorSpy.mockRestore();
  });

  test('signIn calls supabase.auth.signInWithOAuth', async () => {
    let authContext;
    const TestComponent = () => {
      authContext = useAuth();
      return null;
    };

    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
      jest.advanceTimersByTime(1000);
    });

    await act(async () => {
      await authContext.signIn();
    });

    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:3000/auth-callback',
      },
    });
  });

  test('signIn uses production URL', async () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'wonderful-river-0d8fbf010.6.azurestaticapps.net' },
      writable: true,
    });

    let authContext;
    const TestComponent = () => {
      authContext = useAuth();
      return null;
    };

    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
      jest.advanceTimersByTime(1000);
    });

    await act(async () => {
      await authContext.signIn();
    });

    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'https://wonderful-river-0d8fbf010.6.azurestaticapps.net/auth-callback',
      },
    });
  });

  test('useAuth throws error when used outside AuthProvider', () => {
    const TestComponent = () => {
      expect(() => useAuth()).toThrow('useAuth must be used within an AuthProvider');
      return null;
    };

    render(<TestComponent />);
  });
});