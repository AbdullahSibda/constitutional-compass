import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '../components/Dashboard/Dashboard';
import { AuthProvider } from '../contexts/AuthContext';
import { supabase } from '../contexts/client';
import { MemoryRouter } from 'react-router-dom';

// Mock Supabase client
jest.mock('../contexts/client');

// Mock Sidebar and FolderBrowser components
jest.mock('../components/Sidebar/Sidebar', () => ({ isOpen, setIsOpen }) => (
  <div data-testid="sidebar" className={isOpen ? 'open' : 'closed'}>
    <button onClick={() => setIsOpen(false)}>Close Sidebar</button>
  </div>
));
jest.mock('../components/FileManager/FolderBrowser', () => () => (
  <div data-testid="folder-browser">Folder Browser</div>
));

// Mock react-router-dom's useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Default mocks for Supabase
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
          single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
        }),
      }),
    });
    supabase.auth.onAuthStateChange.mockImplementation((callback) => {
      supabase.auth._authStateChangeCallback = callback;
      return {
        data: { subscription: { unsubscribe: jest.fn() } },
      };
    });
    supabase.auth._authStateChangeCallback = null; // Ensure reset
  });

  afterEach(() => {
    jest.useRealTimers();
    supabase.auth._authStateChangeCallback = null;
  });

  test('renders Admin Dashboard header and components', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <Dashboard />
          </AuthProvider>
        </MemoryRouter>
      );
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('folder-browser')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /☰/ })).toBeInTheDocument();
    });
  });

  test('toggles sidebar when clicking the toggle button', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <Dashboard />
          </AuthProvider>
        </MemoryRouter>
      );
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(screen.getByTestId('sidebar')).toHaveClass('closed');
      expect(screen.getByRole('button', { name: /☰/ })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /☰/ }));

    expect(screen.getByTestId('sidebar')).toHaveClass('open');
    expect(screen.queryByRole('button', { name: /☰/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close sidebar/i }));
    expect(screen.getByTestId('sidebar')).toHaveClass('closed');
    expect(screen.getByRole('button', { name: /☰/ })).toBeInTheDocument();
  });

  test('redirects to home if user is not admin or moderator', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { role: 'user' }, error: null }),
        }),
      }),
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <Dashboard />
          </AuthProvider>
        </MemoryRouter>
      );
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    }, { timeout: 2000 });
  });

  test('redirects if user is null', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <Dashboard />
          </AuthProvider>
        </MemoryRouter>
      );
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    }, { timeout: 2000 });
  });

  test('handles unauthenticated user', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('No user'),
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <Dashboard />
          </AuthProvider>
        </MemoryRouter>
      );
      if (supabase.auth._authStateChangeCallback) {
        await supabase.auth._authStateChangeCallback('SIGNED_OUT', null);
      }
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    }, { timeout: 2000 });
  });

  test('handles Supabase role fetch error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: new Error('Role fetch failed') }),
        }),
      }),
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <Dashboard />
          </AuthProvider>
        </MemoryRouter>
      );
      if (supabase.auth._authStateChangeCallback) {
        await supabase.auth._authStateChangeCallback('SIGNED_IN', {
          user: { id: '123', email: 'test@example.com' },
        });
      }
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    }, { timeout: 2000 });

    consoleErrorSpy.mockRestore();
  });
});