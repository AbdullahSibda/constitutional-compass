import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as pdfjsLib from 'pdfjs-dist';
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

jest.mock('pdfjs-dist', () => ({
  getDocument: jest.fn().mockReturnValue({
    promise: Promise.resolve({
      numPages: 2,
    }),
  }),
  GlobalWorkerOptions: {
    workerSrc: 'abc.worker.js',
  },
}));

jest.mock('../../components/Applications/Applications.css', () => ({}));

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
    static now() {
      return new OriginalDate('2025-04-20T12:00:00Z').getTime();
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
      cv_url: 'http://example.com/cv1.pdf',
      motivational_letter_url: 'http://example.com/letter1.pdf',
    },
    {
      id: 'user2',
      email: 'user2@example.com',
      admin_application_reason: 'Experienced moderator',
      applied_at: '2025-04-18T15:00:00Z',
      role: 'pending',
      cv_url: null,
      motivational_letter_url: null,
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
      expect(screen.getByText('4/19/2025')).toBeInTheDocument();
      expect(screen.getByText('user2@example.com')).toBeInTheDocument();
      expect(screen.getByText('4/18/2025')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'Accept' })).toHaveLength(2);
      expect(screen.getAllByRole('button', { name: 'Reject' })).toHaveLength(2);
      expect(screen.getAllByRole('button', { name: 'View Documents' })).toHaveLength(2);
    });
  });

  test('toggles sidebar visibility', async () => {
    render(<Applications />);
    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    });
    const sidebarToggle = screen.getByRole('button', { name: 'Open sidebar' });
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
    expect(sidebarToggle).toBeVisible();
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

  test('toggles document visibility and loads PDFs', async () => {
    render(<Applications />);
    await waitFor(() => {
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    });

    // Initial state: documents hidden
    expect(screen.queryByText('CV')).not.toBeInTheDocument();
    expect(screen.queryByText('Motivational Letter')).not.toBeInTheDocument();

    // Click to expand documents
    const viewDocsButton = screen.getAllByRole('button', { name: 'View Documents' })[0];
    await act(async () => {
      fireEvent.click(viewDocsButton);
    });

    // Check documents are visible and PDFs are loaded
    await waitFor(() => {
      expect(screen.getByText('CV')).toBeInTheDocument();
      expect(screen.getByText('Motivational Letter')).toBeInTheDocument();
      expect(screen.getAllByText('PDF loaded (2 pages)')).toHaveLength(2);
      expect(screen.getByRole('link', { name: 'View cv' })).toHaveAttribute('href', 'http://example.com/cv1.pdf');
      expect(screen.getByRole('link', { name: 'View letter' })).toHaveAttribute('href', 'http://example.com/letter1.pdf');
    });

    // Verify PDF loading calls
    expect(pdfjsLib.getDocument).toHaveBeenCalledWith('http://example.com/cv1.pdf');
    expect(pdfjsLib.getDocument).toHaveBeenCalledWith('http://example.com/letter1.pdf');

    // Click to hide documents
    const hideDocsButton = screen.getByRole('button', { name: 'Hide Documents' });
    await act(async () => {
      fireEvent.click(hideDocsButton);
    });

    // Check documents are hidden
    expect(screen.queryByText('CV')).not.toBeInTheDocument();
    expect(screen.queryByText('Motivational Letter')).not.toBeInTheDocument();
  });

  test('handles missing CV and motivational letter', async () => {
    render(<Applications />);
    await waitFor(() => {
      expect(screen.getByText('user2@example.com')).toBeInTheDocument();
    });

    // Click to expand documents for user2 (no CV or letter)
    const viewDocsButton = screen.getAllByRole('button', { name: 'View Documents' })[1];
    await act(async () => {
      fireEvent.click(viewDocsButton);
    });

    // Check no PDFs are loaded and correct messages are shown
    await waitFor(() => {
      expect(screen.getByText('CV')).toBeInTheDocument();
      expect(screen.getByText('Motivational Letter')).toBeInTheDocument();
      expect(screen.getByText('No CV uploaded')).toBeInTheDocument();
      expect(screen.getByText('No motivational letter uploaded')).toBeInTheDocument();
      expect(pdfjsLib.getDocument).not.toHaveBeenCalled();
    });
  });
});