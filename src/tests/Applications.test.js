import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Applications from '../components/Applications/Applications';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../contexts/client';

// Mock dependencies
jest.mock('../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../contexts/client', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('../components/Sidebar/Sidebar', () => {
  return function MockSidebar({ isOpen, setIsOpen }) {
    return (
      <div data-testid="sidebar" className={isOpen ? 'open' : 'closed'}>
        <button onClick={() => setIsOpen(false)}>Close Sidebar</button>
      </div>
    );
  };
});

// Mock Date to respect input dates
const OriginalDate = global.Date;
beforeAll(() => {
  global.Date = class extends OriginalDate {
    constructor(...args) {
      if (args.length) {
        return new OriginalDate(...args); // Respect input dates (e.g., applied_at)
      }
      return new OriginalDate('2025-04-20T12:00:00Z'); // Default to mock date
    }
  };
});
afterAll(() => {
  global.Date = OriginalDate; // Restore original Date
});

describe('Applications Component', () => {
  const mockUseAuth = useAuth;
  const mockApplications = [
    {
      id: 'user1',
      email: 'user1@example.com',
      admin_application_reason: 'I want to be an admin',
      applied_at: '2025-04-19T10:00:00Z',
      role: 'pending',
    },
    {
      id: 'user2',
      email: 'user2@example.com',
      admin_application_reason: 'Experienced moderator',
      applied_at: '2025-04-18T15:00:00Z',
      role: 'pending',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ userRole: 'moderator' });
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: mockApplications, error: null }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders unauthorized message for non-moderator roles', async () => {
    mockUseAuth.mockReturnValue({ userRole: 'user' });
    render(<Applications />);
    expect(screen.getByText('You are not authorized to view this page.')).toBeInTheDocument();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('displays loading message when loading', async () => {
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockImplementation(() => new Promise(() => {})),
      }),
    }));
    render(<Applications />);
    expect(screen.getByText('Loading applications...')).toBeInTheDocument();
  });

  test('displays no applications message when applications are empty', async () => {
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }));
    render(<Applications />);
    await waitFor(() => {
      expect(screen.getByText('No pending applications')).toBeInTheDocument();
    });
  });

  test('renders list of applications with correct details', async () => {
    render(<Applications />);
    await waitFor(() => {
      expect(screen.getByText('Pending Applications')).toBeInTheDocument();
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
      expect(screen.getByText('I want to be an admin')).toBeInTheDocument();
      expect(screen.getByText('4/19/2025')).toBeInTheDocument();
      expect(screen.getByText('user2@example.com')).toBeInTheDocument();
      expect(screen.getByText('Experienced moderator')).toBeInTheDocument();
      expect(screen.getByText('4/18/2025')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'Accept' })).toHaveLength(2);
      expect(screen.getAllByRole('button', { name: 'Reject' })).toHaveLength(2);
    });
  });

  test('toggles sidebar visibility', async () => {
    render(<Applications />);
    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    });
    const sidebarToggle = screen.getByText('☰');
    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).toHaveClass('closed');
    expect(sidebarToggle).toBeVisible();
    await act(async () => {
      fireEvent.click(sidebarToggle);
    });
    expect(sidebar).toHaveClass('open');
    expect(sidebarToggle).not.toBeVisible();
    const closeButton = screen.getByText('Close Sidebar');
    await act(async () => {
      fireEvent.click(closeButton);
    });
    expect(sidebar).toHaveClass('closed');
  });

  test('handles fetch applications error', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: new Error('Fetch failed') }),
      }),
    }));
    render(<Applications />);
    await waitFor(() => {
      expect(screen.getByText('No pending applications')).toBeInTheDocument();
      expect(console.error).toHaveBeenCalledWith('Error fetching applications:', expect.any(Error));
    });
    console.error.mockRestore();
  });

  test('handles application decision error', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: mockApplications, error: null }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: new Error('Update failed') }),
      }),
    }));
    render(<Applications />);
    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    });
    const acceptButton = screen.getAllByRole('button', { name: 'Accept' })[0];
    await act(async () => {
      fireEvent.click(acceptButton);
    });
    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith('Error updating application:', expect.any(Error));
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    });
    console.error.mockRestore();
  });
});