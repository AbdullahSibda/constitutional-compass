import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Manage from '../components/Manage/Manage';
import { supabase } from '../contexts/client';

// Mock dependencies
jest.mock('../contexts/client', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../components/Sidebar/Sidebar', () => {
  return jest.fn(({ isOpen, setIsOpen }) => (
    <div data-testid="sidebar" className={isOpen ? 'open' : 'closed'}>
      <button onClick={() => setIsOpen(false)}>Close Sidebar</button>
    </div>
  ));
});

describe('Manage Component', () => {
  const mockUseAuth = require('../contexts/AuthContext').useAuth;
  const mockUser = { id: '123', email: 'admin@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockUseAuth.mockReturnValue({ user: mockUser });
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: [
          { id: 'user1', email: 'user1@example.com', role: 'admin' },
          { id: 'user2', email: 'user2@example.com', role: 'admin' },
        ],
        error: null,
      }),
      update: jest.fn().mockReturnThis(),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Original tests
  test('renders manage users header and loading state', async () => {
    render(<Manage />);
    
    expect(screen.getByText('Manage Users')).toBeInTheDocument();
    expect(screen.getByText('Loading users...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText('Loading users...')).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });

  test('handles empty user list', async () => {
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: [], error: null }),
    }));
    
    render(<Manage />);
    
    await waitFor(() => {
      expect(screen.queryByText('Loading users...')).not.toBeInTheDocument();
      expect(screen.queryByText(/@example.com/)).not.toBeInTheDocument();
      expect(screen.getByText('Manage Users')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  test('handles fetch error', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: null, error: new Error('Fetch failed') }),
    }));
    
    render(<Manage />);
    
    await waitFor(() => {
      expect(screen.queryByText('Loading users...')).not.toBeInTheDocument();
      expect(screen.queryByText(/@example.com/)).not.toBeInTheDocument();
      expect(console.error).toHaveBeenCalledWith('Error fetching users:', expect.any(Error));
    }, { timeout: 1000 });
    
    console.error.mockRestore();
  });

  test('toggles sidebar visibility', async () => {
    const user = userEvent.setup();
    render(<Manage />);
    
    const toggleButton = screen.getByRole('button', { name: /☰/ });
    const sidebar = screen.getByTestId('sidebar');
    
    expect(sidebar).toHaveClass('closed');
    expect(toggleButton).toBeVisible();
    
    await act(async () => {
      await user.click(toggleButton);
    });
    
    await waitFor(() => {
      expect(sidebar).toHaveClass('open');
      expect(toggleButton).not.toBeVisible();
    }, { timeout: 1000 });
    
    const closeButton = screen.getByRole('button', { name: 'Close Sidebar' });
    
    await act(async () => {
      await user.click(closeButton);
    });
    
    await waitFor(() => {
      expect(sidebar).toHaveClass('closed');
      expect(toggleButton).toBeVisible();
    }, { timeout: 1000 });
  });

  test('renders without authenticated user', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    
    render(<Manage />);
    
    await waitFor(() => {
      expect(screen.getByText('Manage Users')).toBeInTheDocument();
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
      expect(supabase.from).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  test('hides sidebar toggle when sidebar is open', async () => {
    const user = userEvent.setup();
    render(<Manage />);

    const toggleButton = screen.getByRole('button', { name: /☰/ });
    expect(toggleButton).toBeVisible();

    await act(async () => {
      await user.click(toggleButton);
    });

    await waitFor(() => {
      expect(toggleButton).not.toBeVisible();
    }, { timeout: 1000 });
  });
});