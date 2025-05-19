import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import Home from '../components/Home/Home';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar/Sidebar';
import SearchResults from '../components/SearchResults/SearchResults';
import { getCorrection } from '../api/thirdParty/dymtService';
import { initializeDictionary } from '../components/utils/spellCheck';
import { BrowserRouter } from 'react-router-dom';

// Mock dependencies
jest.mock('../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../components/Sidebar/Sidebar', () => jest.fn());

jest.mock('../components/SearchResults/SearchResults', () => jest.fn());

jest.mock('../api/thirdParty/dymtService', () => ({
  getCorrection: jest.fn(),
}));

jest.mock('../components/utils/spellCheck', () => ({
  initializeDictionary: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Link: jest.fn(({ children, to }) => <a href={to}>{children}</a>),
}));

// Mock fetch
global.fetch = jest.fn();

describe('Home Component', () => {
  const mockUseAuth = useAuth;
  const mockUser = { id: '123', email: 'test@example.com' };
  const mockDictionary = {
    check: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockReset(); // Ensure fetch mock is reset to avoid interference
    jest.useRealTimers();
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      userRole: null,
    });
    Sidebar.mockImplementation(({ isOpen, setIsOpen }) => {
      return (
        <div data-testid="sidebar" data-open={isOpen}>
          <button onClick={() => setIsOpen(false)}>Close Sidebar</button>
        </div>
      );
    });
    SearchResults.mockImplementation(({ results, query }) => {
      return (
        <div data-testid="search-results" data-query={query}>
          {results.map((r, i) => (
            <div key={i}>{r.title}</div>
          ))}
        </div>
      );
    });
    getCorrection.mockResolvedValue({
      corrected_text: 'the',
      original_text: 'teh',
      confidence: 0.95,
    });
    initializeDictionary.mockResolvedValue(mockDictionary);
    // Default to valid words to bypass spell-check unless specified
    mockDictionary.check.mockImplementation((word) => true);
    fetch.mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        json: jest.fn().mockResolvedValue({ results: [] }),
      });
    });
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders main content when loading is false and ready is true', async () => {
    render(<BrowserRouter><Home /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('Constitutional Compass')).toBeInTheDocument();
      expect(screen.getByText('Navigate the Foundations of Democracy')).toBeInTheDocument();
    });
  });

  test('renders loading message when auth is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      userRole: null,
    });
    render(<Home />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toHaveClass('loading');
  });

  test('renders loading message when ready is false in non-test mode', async () => {
    jest.useFakeTimers();
    process.env.NODE_ENV = 'development';
    render(<BrowserRouter><Home /></BrowserRouter>);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    await act(async () => {
      jest.runAllTimers();
    });
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      expect(screen.getByText('Constitutional Compass')).toBeInTheDocument();
    });
  });

  test('displays welcome message for logged-in user', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      userRole: 'user',
    });
    render(<BrowserRouter><Home /></BrowserRouter>);
    expect(screen.getByText(`Welcome, ${mockUser.email}`)).toBeInTheDocument();
  });

  test('displays dashboard link for admin role', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      userRole: 'admin',
    });
    render(<BrowserRouter><Home /></BrowserRouter>);
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
    render(<BrowserRouter><Home /></BrowserRouter>);
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
    render(<BrowserRouter><Home /></BrowserRouter>);
    expect(screen.queryByText('Go to Dashboard →')).not.toBeInTheDocument();
  });

  test('does not display welcome section for logged-out user', () => {
    render(<BrowserRouter><Home /></BrowserRouter>);
    expect(screen.queryByText(/Welcome,/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Go to Dashboard →')).not.toBeInTheDocument();
  });

  test('renders sidebar with correct props', () => {
    render(<BrowserRouter><Home /></BrowserRouter>);
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
    render(<BrowserRouter><Home /></BrowserRouter>);
    const toggleButton = screen.getByTestId('sidebar-toggle');
    expect(toggleButton).toHaveStyle({ display: 'block' });
  });

  test('hides sidebar toggle button when sidebar is open', async () => {
    const user = userEvent.setup();
    render(<BrowserRouter><Home /></BrowserRouter>);
    await user.click(screen.getByTestId('sidebar-toggle'));
    const toggleButton = screen.getByTestId('sidebar-toggle');
    expect(toggleButton).toHaveStyle({ display: 'none' });
    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'true');
  });

  test('toggles sidebar when toggle button is clicked', async () => {
    const user = userEvent.setup();
    render(<BrowserRouter><Home /></BrowserRouter>);
    const toggleButton = screen.getByTestId('sidebar-toggle');
    await user.click(toggleButton);
    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'true');
    await user.click(screen.getByText('Close Sidebar'));
    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-open', 'false');
  });

  test('displays error when search fails', async () => {
    const user = userEvent.setup();
    fetch.mockReset();
    fetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Server Error',
    });
    render(<BrowserRouter><Home /></BrowserRouter>);
    const searchInput = screen.getByPlaceholderText('Ask the compass...');
    const searchButton = screen.getByRole('button', { name: /Search/i });
    await user.type(searchInput, 'test query');
    await user.click(searchButton);
    await waitFor(() => {
      expect(screen.getByText('There was an issue with your search. Please try again.')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Ask the compass...')).toHaveClass('input-error');
      expect(screen.queryByTestId('search-results')).not.toBeInTheDocument();
    });
  });

  test('displays no results message when search returns empty', async () => {
    const user = userEvent.setup();
    fetch.mockReset();
    fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce({ results: [] }),
    });
    render(<BrowserRouter><Home /></BrowserRouter>);
    const searchInput = screen.getByPlaceholderText('Ask the compass...');
    const searchButton = screen.getByRole('button', { name: /Search/i });
    await user.type(searchInput, 'test query');
    await user.click(searchButton);
    await waitFor(() => {
      expect(screen.getByText('No results match your search')).toBeInTheDocument();
      expect(screen.queryByTestId('search-results')).not.toBeInTheDocument();
    });
  });

  test('handles empty search input', async () => {
    const user = userEvent.setup();
    render(<BrowserRouter><Home /></BrowserRouter>);
    const searchInput = screen.getByPlaceholderText('Ask the compass...');
    const searchButton = screen.getByRole('button', { name: /Search/i });
    await user.click(searchButton);
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.queryByText('No results match your search')).not.toBeInTheDocument();
  });

  test('sets ready immediately in test mode', () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    render(<BrowserRouter><Home /></BrowserRouter>);
    expect(setTimeoutSpy).not.toHaveBeenCalled();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    expect(screen.getByText('Constitutional Compass')).toBeInTheDocument();
    setTimeoutSpy.mockRestore();
  });

  test('delays ready in non-test mode', async () => {
    jest.useFakeTimers();
    process.env.NODE_ENV = 'development';
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    render(<BrowserRouter><Home /></BrowserRouter>);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 400);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    await act(async () => {
      jest.runAllTimers();
    });
    await waitFor(() => {
      expect(screen.getByText('Constitutional Compass')).toBeInTheDocument();
    });
    setTimeoutSpy.mockRestore();
  });

  test('cleans up timeout on unmount', () => {
    jest.useFakeTimers();
    process.env.NODE_ENV = 'development';
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const { unmount } = render(<BrowserRouter><Home /></BrowserRouter>);
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
    render(<BrowserRouter><Home /></BrowserRouter>);
    expect(screen.getByText(`Welcome, ${mockUser.email}`)).toBeInTheDocument();
    expect(screen.queryByText('Go to Dashboard →')).not.toBeInTheDocument();
  });

  test('displays loading indicator during search', async () => {
    const user = userEvent.setup();
    fetch.mockReset();
    fetch.mockImplementationOnce(() =>
      new Promise((resolve) =>
        setTimeout(() =>
          resolve({
            ok: true,
            json: jest.fn().mockResolvedValue({ results: [] }),
          }),
          100
        )
      )
    );
    render(<BrowserRouter><Home /></BrowserRouter>);
    const searchInput = screen.getByPlaceholderText('Ask the compass...');
    const searchButton = screen.getByRole('button', { name: /Search/i });
    await user.type(searchInput, 'test query');
    await user.click(searchButton);
    await waitFor(() => {
      expect(screen.getByText('Searching...')).toBeInTheDocument();
    }, { timeout: 150 });
    await waitFor(() => {
      expect(screen.queryByText('Searching...')).not.toBeInTheDocument();
    });
  });

  test('handles input change and clears error', async () => {
    const user = userEvent.setup();
    fetch.mockReset();
    fetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Server Error',
    });
    render(<BrowserRouter><Home /></BrowserRouter>);
    const searchInput = screen.getByPlaceholderText('Ask the compass...');
    const searchButton = screen.getByRole('button', { name: /Search/i });
    await user.type(searchInput, 'test query');
    await user.click(searchButton);
    await waitFor(() => {
      expect(screen.getByText('There was an issue with your search. Please try again.')).toBeInTheDocument();
    });
    await user.type(searchInput, 'new query');
    expect(screen.queryByText('There was an issue with your search. Please try again.')).not.toBeInTheDocument();
  });

  test('formats query for exact match', async () => {
    const user = userEvent.setup();
    fetch.mockReset();
    fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ results: [] }),
    });
    render(<BrowserRouter><Home /></BrowserRouter>);
    const searchInput = screen.getByPlaceholderText('Ask the compass...');
    const searchButton = screen.getByRole('button', { name: /Search/i });
    await user.type(searchInput, 'hello   world');
    await user.click(searchButton);
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        `https://constitutional-compass-function-app.azurewebsites.net/api/search?q=${encodeURIComponent('"hello" "world"')}`
      );
    });
  });

  test('accessibility attributes are set correctly', () => {
    render(<BrowserRouter><Home /></BrowserRouter>);
    const searchInput = screen.getByPlaceholderText('Ask the compass...');
    expect(searchInput).toHaveAttribute('aria-label', 'Search constitutional documents');
    expect(searchInput).not.toHaveAttribute('aria-describedby');
    const searchButton = screen.getByRole('button', { name: /Search/i });
    expect(searchButton).toHaveAttribute('aria-label', 'Search');
    expect(searchButton).toHaveAttribute('aria-busy', 'false');
    const searchResultsSection = screen.getByRole('region', { name: /search results/i });
    expect(searchResultsSection).toHaveAttribute('aria-live', 'polite');
  });
});