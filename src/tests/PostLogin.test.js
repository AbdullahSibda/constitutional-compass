import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import PostLogin from '../components/Login/PostLogin';
import { supabase } from '../contexts/client';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../contexts/client', () => {
  const mockSupabase = {
    auth: {
      getUser: jest.fn(),
    },
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        getPublicUrl: jest.fn(),
      })),
    },
    from: jest.fn(() => ({
      upsert: jest.fn(),
    })),
  };
  return { supabase: mockSupabase };
});

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('PostLogin Component', () => {
  const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});
  let uploadMock, getPublicUrlMock, upsertMock, getUserMock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockAlert.mockClear();

    // Set up mocks for supabase methods
    uploadMock = supabase.storage.from().upload;
    getPublicUrlMock = supabase.storage.from().getPublicUrl;
    upsertMock = supabase.from().upsert;
    getUserMock = supabase.auth.getUser;

    // Default mock behavior
    getUserMock.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
      error: null,
    });
    uploadMock.mockResolvedValue({ data: { path: 'mock/path/file.pdf' }, error: null });
    getPublicUrlMock.mockReturnValue({ data: { publicUrl: 'http://mock.storage/file.pdf' } });
    upsertMock.mockResolvedValue({ error: null });
  });

  afterAll(() => {
    mockAlert.mockRestore();
  });

  test('renders initial buttons and subtext', () => {
    render(<MemoryRouter><PostLogin /></MemoryRouter>);
    expect(screen.getByText('Constitutional Compass')).toBeInTheDocument();
    expect(screen.getByText(/currently logged in as a standard user/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue as user/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /apply to be an admin/i })).toBeInTheDocument();
  });

  test('navigates home on Continue as User', () => {
    render(<MemoryRouter><PostLogin /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /continue as user/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  test('shows admin form on Apply click', () => {
    render(<MemoryRouter><PostLogin /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /apply to be an admin/i }));
    expect(screen.getByText(/admin application/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/upload your cv/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/upload your motivational letter/i)).toBeInTheDocument();
  });

  test('cancels admin application and resets form', async () => {
    render(<MemoryRouter><PostLogin /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /apply to be an admin/i }));

    const cvFile = new File(['cv'], 'cv.pdf', { type: 'application/pdf' });
    await act(async () => {
      fireEvent.change(screen.getByLabelText(/upload your cv/i), { target: { files: [cvFile] } });
    });

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.getByRole('button', { name: /continue as user/i })).toBeInTheDocument();
    expect(screen.queryByText(/admin application/i)).not.toBeInTheDocument();
  });

  test('requires both files for submission', async () => {
    render(<MemoryRouter><PostLogin /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /apply to be an admin/i }));
    await act(async () => {
      fireEvent.submit(screen.getByRole('form', { name: /admin application/i }));
    });
    expect(mockAlert).toHaveBeenCalledWith('Please upload both your CV and motivational letter');
    expect(uploadMock).not.toHaveBeenCalled();
  });

  test('handles authentication failure', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: new Error('Auth failed') });

    const cvFile = new File(['cv'], 'cv.pdf', { type: 'application/pdf' });
    const letterFile = new File(['letter'], 'letter.pdf', { type: 'application/pdf' });

    render(<MemoryRouter><PostLogin /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /apply to be an admin/i }));

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/upload your cv/i), { target: { files: [cvFile] } });
      fireEvent.change(screen.getByLabelText(/upload your motivational letter/i), { target: { files: [letterFile] } });
      fireEvent.submit(screen.getByRole('form', { name: /admin application/i }));
    });

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Error: Authentication failed');
      expect(uploadMock).not.toHaveBeenCalled();
    });
  });
});