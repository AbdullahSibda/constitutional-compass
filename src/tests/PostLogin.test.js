import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import PostLogin from '../components/Login/PostLogin';
import { supabase } from '../contexts/client';
import { MemoryRouter } from 'react-router-dom';

// Mock Supabase client
jest.mock('../contexts/client');

// Mock react-router-dom's useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('PostLogin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Default mocks for Supabase
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: '123', email: 'test@example.com' } },
      error: null,
    });
    supabase.from.mockReturnValue({
      upsert: jest.fn().mockResolvedValue({ error: null }),
    });
    // Clear window.alert mock
    window.alert.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders initial buttons and subtext', () => {
    render(
      <MemoryRouter>
        <PostLogin />
      </MemoryRouter>
    );

    expect(screen.getByText('Constitutional Compass')).toBeInTheDocument();
    expect(screen.getByText("You're currently logged in as a standard user")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue as user/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /apply to be an admin/i })).toBeInTheDocument();
  });

  test('navigates to home when Continue as User is clicked', () => {
    render(
      <MemoryRouter>
        <PostLogin />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /continue as user/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  test('shows admin application form when Apply To Be An Admin is clicked', () => {
    render(
      <MemoryRouter>
        <PostLogin />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /apply to be an admin/i }));
    expect(screen.getByPlaceholderText('Explain why you should be an admin...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit application/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  test('cancels admin application and returns to buttons', () => {
    render(
      <MemoryRouter>
        <PostLogin />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /apply to be an admin/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByPlaceholderText('Explain why you should be an admin...')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue as user/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /apply to be an admin/i })).toBeInTheDocument();
  });

  test('shows alert when submitting empty reason', async () => {
    render(
      <MemoryRouter>
        <PostLogin />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /apply to be an admin/i }));
    const form = screen.getByRole('form', { name: /admin application form/i });
    await act(async () => {
      fireEvent.submit(form);
      jest.runAllTimers();
    });

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Please provide a reason for your application'));
  });

  test('submits admin application successfully', async () => {
    render(
      <MemoryRouter>
        <PostLogin />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /apply to be an admin/i }));
    fireEvent.change(screen.getByPlaceholderText('Explain why you should be an admin...'), {
      target: { value: 'I want to be an admin because...' },
    });
    const form = screen.getByRole('form', { name: /admin application form/i });
    await act(async () => {
      fireEvent.submit(form);
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('user_profiles');
      expect(supabase.from().upsert).toHaveBeenCalledWith({
        id: '123',
        role: 'pending',
        admin_application_reason: 'I want to be an admin because...',
        applied_at: expect.any(String),
      });
      expect(window.alert).toHaveBeenCalledWith("Application submitted successfully! You'll be notified once approved.");
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  test('disables buttons during submission', async () => {
    render(
      <MemoryRouter>
        <PostLogin />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /apply to be an admin/i }));
    fireEvent.change(screen.getByPlaceholderText('Explain why you should be an admin...'), {
      target: { value: 'I want to be an admin because...' },
    });

    supabase.from().upsert.mockReturnValueOnce(new Promise((resolve) => setTimeout(() => resolve({ error: null }), 1000)));

    const form = screen.getByRole('form', { name: /admin application form/i });
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(screen.getByText('Submitting...')).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
  });

  test('handles unauthenticated user error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('No user') });

    render(
      <MemoryRouter>
        <PostLogin />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /apply to be an admin/i }));
    fireEvent.change(screen.getByPlaceholderText('Explain why you should be an admin...'), {
      target: { value: 'I want to be an admin because...' },
    });
    const form = screen.getByRole('form', { name: /admin application form/i });
    await act(async () => {
      fireEvent.submit(form);
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Failed to submit application. Please try again.');
    });

    consoleErrorSpy.mockRestore();
  });

  test('handles Supabase upsert error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    supabase.from().upsert.mockResolvedValueOnce({ error: new Error('Upsert failed') });

    render(
      <MemoryRouter>
        <PostLogin />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /apply to be an admin/i }));
    fireEvent.change(screen.getByPlaceholderText('Explain why you should be an admin...'), {
      target: { value: 'I want to be an admin because...' },
    });
    const form = screen.getByRole('form', { name: /admin application form/i });
    await act(async () => {
      fireEvent.submit(form);
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Failed to submit application. Please try again.');
    });

    consoleErrorSpy.mockRestore();
  });

  test('textarea has accessible label', () => {
    render(
      <MemoryRouter>
        <PostLogin />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /apply to be an admin/i }));
    const textarea = screen.getByPlaceholderText('Explain why you should be an admin...');
    expect(textarea).toHaveAttribute('id', 'admin-reason');
    expect(document.querySelector('label[for="admin-reason"]')).toBeInTheDocument();
  });
});