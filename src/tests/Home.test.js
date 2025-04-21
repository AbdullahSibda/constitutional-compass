import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import Home from '../components/Home/Home';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar/Sidebar';
import { BrowserRouter } from 'react-router-dom';

// Mock dependencies
jest.mock('../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../components/Sidebar/Sidebar', () => jest.fn(() => null));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Link: jest.fn(({ children, to }) => <a href={to}>{children}</a>),
}));

describe('Home Component', () => {
  const mockUseAuth = useAuth;
  const mockUser = { id: '123', email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mocks
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      userRole: null,
    });
    Sidebar.mockImplementation(({ isOpen, setIsOpen }) => (
      <div data-testid="sidebar" data-open={isOpen}>
        <button onClick={() => setIsOpen(false)}>Close Sidebar</button>
      </div>
    ));
    // Ensure NODE_ENV is 'test' for consistent behavior
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test('renders loading message when loading is true', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      userRole: null,
    });
    render(<Home />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toHaveClass('loading');
  });

  test('renders loading message when ready is false', async () => {
    jest.useFakeTimers();
    process.env.NODE_ENV = 'development';
    render(<Home />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    await act(async () => {
      jest.runAllTimers();
    });
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  test('renders main content when loading is false and ready is true', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );
    expect(screen.getByText('Constitutional Compass')).toBeInTheDocument();
    expect(screen.getByText('Navigate the Foundations of Democracy')).toBeInTheDocument();
    expect(screen.getByText('Explore constitutional documents from across the world')).toBeInTheDocument();
    expect(screen.getByAltText('Logo')).toHaveAttribute('src', '/images/logo.png');
    expect(screen.getByTestId('sidebar-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask the compass...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Search/i })).toBeInTheDocument();
  });

  test('displays welcome message for logged-in user', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      userRole: 'user',
    });
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );
    expect(screen.getByText(`Welcome, ${mockUser.email}`)).toBeInTheDocument();
  });

  test('displays dashboard link for admin role', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      userRole: 'admin',
    });
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );
    const dashboardLink = screen.getByText('Go to Dashboard →');
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink).toHaveAttribute('href', '/dashboard');
  });

  test('displays dashboard link for moderator role', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      userRole: 'moderator',
    });
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );
    const dashboardLink = screen.getByText('Go to Dashboard →');
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink).toHaveAttribute('href', '/dashboard');
  });

  test('does not display dashboard link for non-admin/moderator role', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      userRole: 'user',
    });
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );
    expect(screen.queryByText('Go to Dashboard →')).not.toBeInTheDocument();
  });

  test('does not display welcome section for logged-out user', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      userRole: null,
    });
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );
    expect(screen.queryByText(/Welcome,/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Go to Dashboard →')).not.toBeInTheDocument();
  });

  test('renders sidebar with correct props', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );
    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).toHaveAttribute('data-open', 'false');
    expect(Sidebar).toHaveBeenCalledWith(
      expect.objectContaining({
        isOpen: false,
        setIsOpen: expect.any(Function),
      }),
      {}
    );
  });

  test('shows sidebar toggle button when sidebar is closed', () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );
    const toggleButton = screen.getByTestId('sidebar-toggle');
    expect(toggleButton).toHaveStyle({ display: 'block' });
  });

  test('hides sidebar toggle button when sidebar is open', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );
    // Simulate opening sidebar
    await user.click(screen.getByTestId('sidebar-toggle'));
    const toggleButton = screen.getByTestId('sidebar-toggle');
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toHaveStyle({ display: 'none' });
    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'true');
  });

  test('toggles sidebar when toggle button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );
    const toggleButton = screen.getByTestId('sidebar-toggle');
    await user.click(toggleButton);
    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'true');
    // Simulate closing sidebar via Sidebar component
    await user.click(screen.getByText('Close Sidebar'));
    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'false');
  });

  test('renders search form and prevents default submission', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );
    const searchInput = screen.getByPlaceholderText('Ask the compass...');
    const searchButton = screen.getByRole('button', { name: /Search/i });
    expect(searchInput).toBeInTheDocument();
    expect(searchButton).toBeInTheDocument();
    // Simulate form submission
    await user.type(searchInput, 'test query');
    await user.click(searchButton);
    // No navigation or reload should occur; verify input retains value
    expect(searchInput).toHaveValue('test query');
  });

  test('sets ready immediately in test mode', () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    render(<Home />);
    expect(setTimeoutSpy).not.toHaveBeenCalled();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    expect(screen.getByText('Constitutional Compass')).toBeInTheDocument();
    setTimeoutSpy.mockRestore();
  });

  test('delays ready in non-test mode', async () => {
    jest.useFakeTimers();
    process.env.NODE_ENV = 'development';
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 400);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    // Simulate timeout
    await act(async () => {
      jest.runAllTimers();
    });
    await waitFor(() => {
      expect(screen.getByText('Constitutional Compass')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
    setTimeoutSpy.mockRestore();
  });

  test('cleans up timeout on unmount', () => {
    jest.useFakeTimers();
    process.env.NODE_ENV = 'development';
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const { unmount } = render(<Home />);
    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  test('handles invalid userRole', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      userRole: 'invalid',
    });
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );
    expect(screen.getByText(`Welcome, ${mockUser.email}`)).toBeInTheDocument();
    expect(screen.queryByText('Go to Dashboard →')).not.toBeInTheDocument();
  });

  test('search form submission with empty input', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );
    const searchInput = screen.getByPlaceholderText('Ask the compass...');
    const searchButton = screen.getByRole('button', { name: /Search/i });
    await user.click(searchButton);
    expect(searchInput).toHaveValue('');
  });
});
