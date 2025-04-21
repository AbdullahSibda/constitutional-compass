import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import AuthCallback from '../components/Auth/AuthCallback';
import { useAuth } from '../contexts/AuthContext';

// Mock dependencies
jest.mock('../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

describe('AuthCallback Component', () => {
  const mockUseAuth = useAuth;
  const mockNavigate = jest.fn();
  const mockUser = { id: '123', email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mocks
    mockUseAuth.mockReturnValue({
      user: null,
      userRole: null,
      loading: true,
    });
    jest.spyOn(require('react-router-dom'), 'useNavigate').mockReturnValue(mockNavigate);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading message when loading is true', () => {
    render(
      <BrowserRouter>
        <AuthCallback />
      </BrowserRouter>
    );
    expect(screen.getByText('Loading user information...')).toBeInTheDocument();
    expect(screen.getByText('Loading user information...')).toHaveClass('auth-callback-message');
  });

  test('does not navigate when loading is true', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      userRole: 'admin',
      loading: true,
    });
    render(
      <BrowserRouter>
        <AuthCallback />
      </BrowserRouter>
    );
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByText('Loading user information...')).toBeInTheDocument();
  });

  test('does not navigate when user is null', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      userRole: null,
      loading: false,
    });
    render(
      <BrowserRouter>
        <AuthCallback />
      </BrowserRouter>
    );
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByText('Loading user information...')).toBeInTheDocument();
  });

  test('navigates to /dashboard for admin role', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      userRole: 'admin',
      loading: false,
    });
    render(
      <BrowserRouter>
        <AuthCallback />
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('navigates to /dashboard for moderator role', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      userRole: 'moderator',
      loading: false,
    });
    render(
      <BrowserRouter>
        <AuthCallback />
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('navigates to / for pending role', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      userRole: 'pending',
      loading: false,
    });
    render(
      <BrowserRouter>
        <AuthCallback />
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  test('navigates to /PostLogin for user role', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      userRole: 'user',
      loading: false,
    });
    render(
      <BrowserRouter>
        <AuthCallback />
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/PostLogin');
    });
  });

  test('navigates to /PostLogin for undefined userRole', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      userRole: undefined,
      loading: false,
    });
    render(
      <BrowserRouter>
        <AuthCallback />
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/PostLogin');
    });
  });

  test('navigates to /PostLogin for invalid userRole', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      userRole: 'invalid',
      loading: false,
    });
    render(
      <BrowserRouter>
        <AuthCallback />
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/PostLogin');
    });
  });

  test('handles rapid changes in user and loading', async () => {
    const { rerender } = render(
      <BrowserRouter>
        <AuthCallback />
      </BrowserRouter>
    );
    // Simulate loading state
    mockUseAuth.mockReturnValue({
      user: null,
      userRole: null,
      loading: true,
    });
    rerender(
      <BrowserRouter>
        <AuthCallback />
      </BrowserRouter>
    );
    expect(mockNavigate).not.toHaveBeenCalled();

    // Simulate user login
    mockUseAuth.mockReturnValue({
      user: mockUser,
      userRole: 'admin',
      loading: false,
    });
    rerender(
      <BrowserRouter>
        <AuthCallback />
      </BrowserRouter>
    );
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('cleans up useEffect on unmount', () => {
    const useEffectSpy = jest.spyOn(React, 'useEffect');
    const { unmount } = render(
      <BrowserRouter>
        <AuthCallback />
      </BrowserRouter>
    );
    const effectCallback = useEffectSpy.mock.calls[0][0];
    const cleanup = effectCallback();
    unmount();
    expect(cleanup).toBeUndefined(); // No explicit cleanup, but ensure no errors
    useEffectSpy.mockRestore();
  });
});