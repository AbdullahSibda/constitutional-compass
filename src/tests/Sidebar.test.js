import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Sidebar from '../components/Sidebar/Sidebar';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { supabase } from '../contexts/client';
import { MemoryRouter } from 'react-router-dom';

// Mock Supabase client
jest.mock('../contexts/client');

// Mock useAuth for controlled testing
jest.mock('../contexts/AuthContext', () => ({
  ...jest.requireActual('../contexts/AuthContext'),
  useAuth: jest.fn(),
}));

// Mock react-router-dom's Link (optional, for coverage)
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
}));

describe('Sidebar', () => {
  const mockSignIn = jest.fn().mockResolvedValue({ error: null });
  const mockSignOut = jest.fn().mockResolvedValue({ error: null });
  const mockSetIsOpen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Default useAuth mock
    useAuth.mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      userRole: 'user',
      signIn: mockSignIn,
      signOut: mockSignOut,
    });
    // Default Supabase mocks
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: '123', email: 'test@example.com' } } },
      error: null,
    });
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: '123', email: 'test@example.com' } },
      error: null,
    });
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { admin_application_reason: null, role: 'user' },
            error: null,
          }),
        }),
      }),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders sidebar with logo, title, and basic navigation links', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />
          </AuthProvider>
        </MemoryRouter>
      );
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(screen.getByAltText('Logo')).toHaveAttribute('src', 'mocked-file');
      expect(screen.getByText('Constitutional Compass')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/');
      expect(screen.getByRole('link', { name: /about/i })).toHaveAttribute('href', '/about');
      expect(screen.getByRole('link', { name: /features/i })).toHaveAttribute('href', '/features');
    });
  });

  test('renders sign out button when user is logged in', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />
          </AuthProvider>
        </MemoryRouter>
      );
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      expect(signOutButton).toBeInTheDocument();
      fireEvent.click(signOutButton);
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  test('handles sign out error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSignOut.mockRejectedValue(new Error('Sign out failed'));
    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />
          </AuthProvider>
        </MemoryRouter>
      );
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      expect(signOutButton).toBeInTheDocument();
      fireEvent.click(signOutButton);
      expect(mockSignOut).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Auth Action Error:', expect.any(Error));
    });

    consoleErrorSpy.mockRestore();
  });

  test('renders sign in button when user is not logged in', async () => {
    useAuth.mockReturnValue({
      user: null,
      userRole: null,
      signIn: mockSignIn,
      signOut: mockSignOut,
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />
          </AuthProvider>
        </MemoryRouter>
      );
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      const signInButton = screen.getByRole('button', { name: /sign in with google/i });
      expect(signInButton).toBeInTheDocument();
      fireEvent.click(signInButton);
      expect(mockSignIn).toHaveBeenCalled();
    });
  });

  test('renders dashboard link for admin role', async () => {
    useAuth.mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      userRole: 'admin',
      signIn: mockSignIn,
      signOut: mockSignOut,
    });
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { admin_application_reason: 'Accepted', role: 'admin' },
            error: null,
          }),
        }),
      }),
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />
          </AuthProvider>
        </MemoryRouter>
      );
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard');
      expect(screen.queryByRole('link', { name: /applications/i })).not.toBeInTheDocument();
    });
  });

  test('renders dashboard and applications links for moderator role', async () => {
    useAuth.mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      userRole: 'moderator',
      signIn: mockSignIn,
      signOut: mockSignOut,
    });
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { admin_application_reason: null, role: 'moderator' },
            error: null,
          }),
        }),
      }),
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />
          </AuthProvider>
        </MemoryRouter>
      );
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard');
      expect(screen.getByRole('link', { name: /applications/i })).toHaveAttribute('href', '/applications');
    });
  });

  test('displays accepted application status', async () => {
    useAuth.mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      userRole: 'user',
      signIn: mockSignIn,
      signOut: mockSignOut,
    });
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { admin_application_reason: 'Application Accepted', role: 'user' },
            error: null,
          }),
        }),
      }),
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />
          </AuthProvider>
        </MemoryRouter>
      );
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(screen.getByText('Application Status')).toBeInTheDocument();
      expect(screen.getByText('Accepted')).toHaveClass('status accepted');
    });
  });

  test('displays rejected application status', async () => {
    useAuth.mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      userRole: 'user',
      signIn: mockSignIn,
      signOut: mockSignOut,
    });
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { admin_application_reason: 'Application Rejected', role: 'user' },
            error: null,
          }),
        }),
      }),
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />
          </AuthProvider>
        </MemoryRouter>
      );
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(screen.getByText('Application Status')).toBeInTheDocument();
      expect(screen.getByText('Rejected')).toHaveClass('status rejected');
    });
  });

  test('displays pending application status', async () => {
    useAuth.mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      userRole: 'pending',
      signIn: mockSignIn,
      signOut: mockSignOut,
    });
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { admin_application_reason: null, role: 'pending' },
            error: null,
          }),
        }),
      }),
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />
          </AuthProvider>
        </MemoryRouter>
      );
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(screen.getByText('Application Status')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toHaveClass('status pending');
    });
  });

  test('does not display application status when user is null', async () => {
    useAuth.mockReturnValue({
      user: null,
      userRole: null,
      signIn: mockSignIn,
      signOut: mockSignOut,
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />
          </AuthProvider>
        </MemoryRouter>
      );
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(screen.queryByText('Application Status')).not.toBeInTheDocument();
    });
  });

  test('does not display application status for admin role', async () => {
    useAuth.mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      userRole: 'admin',
      signIn: mockSignIn,
      signOut: mockSignOut,
    });
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { admin_application_reason: null, role: 'admin' },
            error: null,
          }),
        }),
      }),
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />
          </AuthProvider>
        </MemoryRouter>
      );
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(screen.queryByText('Application Status')).not.toBeInTheDocument();
    });
  });

  test('closes sidebar on outside click', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />
          </AuthProvider>
        </MemoryRouter>
      );
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(screen.getByText('Constitutional Compass')).toBeInTheDocument();
    });

    // Simulate click outside
    fireEvent.mouseDown(document.body);
    expect(mockSetIsOpen).toHaveBeenCalledWith(false);
  });

  test('does not close sidebar on inside click', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />
          </AuthProvider>
        </MemoryRouter>
      );
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      const sidebar = screen.getByText('Constitutional Compass').closest('aside');
      fireEvent.mouseDown(sidebar);
      expect(mockSetIsOpen).not.toHaveBeenCalled();
    });
  });

  test('handles Supabase fetch error gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    useAuth.mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      userRole: 'user',
      signIn: mockSignIn,
      signOut: mockSignOut,
    });
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockRejectedValue(new Error('Fetch error')),
        }),
      }),
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <Sidebar isOpen={true} setIsOpen={mockSetIsOpen} />
          </AuthProvider>
        </MemoryRouter>
      );
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(screen.getByText('Constitutional Compass')).toBeInTheDocument();
      expect(screen.queryByText('Application Status')).not.toBeInTheDocument();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching application status:', expect.any(Error));
    });

    consoleErrorSpy.mockRestore();
  });
});