import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { supabase } from '../contexts/client';

// Mock the Supabase client
jest.mock('@supabase/supabase-js');

describe('AuthProvider', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
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
  });

  afterEach(() => {
    jest.useRealTimers();
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

    // Render and capture initial state synchronously
    const { rerender } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Check initial loading state
    expect(authContext.loading).toBe(true);
    expect(authContext.session).toBe(null);
    expect(authContext.user).toBe(null);
    expect(authContext.userRole).toBe(null);

    // Advance timers to resolve getSession
    await act(async () => {
      jest.runAllTimers();
    });

    // Rerender to update authContext
    rerender(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for loading to resolve
    await waitFor(() => expect(authContext.loading).toBe(false));
  });

  test('sets session, user, and role when a session exists', async () => {
    const mockSession = {
      user: { id: '123', email: 'test@example.com' },
    };
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: mockSession }, error: null });
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
      jest.runAllTimers();
    });

    await waitFor(() => expect(authContext.loading).toBe(false));
    expect(authContext.session).toBe(mockSession);
    expect(authContext.user).toBe(mockSession.user);
    expect(authContext.userRole).toBe('admin');
    expect(supabase.from).toHaveBeenCalledWith('user_profiles');
  });

  test('handles auth state changes', async () => {
    const mockSession = {
      user: { id: '456', email: 'new@example.com' },
    };
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
      jest.runAllTimers();
    });

    // Simulate auth state change
    await act(async () => {
      await supabase.auth._onAuthStateChangeCallback('SIGNED_IN', mockSession);
      jest.runAllTimers();
    });

    await waitFor(() => expect(authContext.userRole).toBe('user'));
    expect(authContext.session).toBe(mockSession);
    expect(authContext.user).toBe(mockSession.user);
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
      jest.runAllTimers();
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

  test('signOut calls supabase.auth.signOut and redirects', async () => {
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
      jest.runAllTimers();
    });

    await act(async () => {
      await authContext.signOut();
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(window.location.href).toBe('http://localhost:3000/');
  });

  test('useAuth throws error when used outside AuthProvider', () => {
    const TestComponent = () => {
      expect(() => useAuth()).toThrow('useAuth must be used within an AuthProvider');
      return null;
    };

    render(<TestComponent />);
  });
});