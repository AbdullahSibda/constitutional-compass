import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
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
  let uploadMock, getPublicUrlMock, upsertMock, getUserMock;
  const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockAlert.mockClear();

    // Mock Date.now directly
    jest.spyOn(global.Date, 'now').mockReturnValue(1234567890);
    jest.spyOn(global.Date.prototype, 'toISOString').mockReturnValue('2025-05-18T16:57:00.000Z');

    // Mock input required attribute to bypass validation
    jest.spyOn(HTMLInputElement.prototype, 'required', 'get').mockReturnValue(false);

    // Set up mocks for supabase methods
    uploadMock = supabase.storage.from().upload;
    getPublicUrlMock = supabase.storage.from().getPublicUrl;
    upsertMock = supabase.from().upsert;
    getUserMock = supabase.auth.getUser;

    // Default mock behavior
    getUserMock.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    uploadMock.mockImplementation((path, file) => {
      console.log('Uploading file:', path);
      return Promise.resolve({
        data: { path: `${path.split('/')[1]}/${mockUser.id}_${Date.now()}_${file.name}` },
        error: null,
      });
    });
    getPublicUrlMock.mockImplementation((path) => {
      console.log('Getting public URL for:', path);
      return { data: { publicUrl: `http://mock.storage/${path}` } };
    });
    upsertMock.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    mockAlert.mockClear();
    jest.spyOn(global.Date, 'now').mockRestore();
    jest.spyOn(global.Date.prototype, 'toISOString').mockRestore();
    jest.spyOn(HTMLInputElement.prototype, 'required', 'get').mockRestore();
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

  test('navigates home on Continue as User', async () => {
    render(<MemoryRouter><PostLogin /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: /continue as user/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  test('shows admin form on Apply click', async () => {
    render(<MemoryRouter><PostLogin /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: /apply to be an admin/i }));
    expect(screen.getByText(/admin application/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/upload your cv/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/upload your motivational letter/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit application/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  test('cancels admin application and resets form', async () => {
    render(<MemoryRouter><PostLogin /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: /apply to be an admin/i }));

    const cvFile = new File(['cv'], 'cv.pdf', { type: 'application/pdf' });
    await act(async () => {
      await userEvent.upload(screen.getByLabelText(/upload your cv/i), cvFile);
    });
    expect(screen.getByText(`Selected: ${cvFile.name}`)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.getByRole('button', { name: /continue as user/i })).toBeInTheDocument();
    expect(screen.queryByText(/admin application/i)).not.toBeInTheDocument();
    expect(screen.queryByText(`Selected: ${cvFile.name}`)).not.toBeInTheDocument();
  });

  test('requires both files for submission', async () => {
    render(<MemoryRouter><PostLogin /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: /apply to be an admin/i }));
    const form = screen.getByRole('form', { name: 'Admin Application Form' });
    await act(async () => {
      fireEvent.submit(form);
    });
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Please upload both your CV and motivational letter');
      expect(uploadMock).not.toHaveBeenCalled();
    });
  });

  test('handles authentication failure', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: new Error('Auth failed') });

    const cvFile = new File(['cv'], 'cv.pdf', { type: 'application/pdf' });
    const letterFile = new File(['letter'], 'letter.pdf', { type: 'application/pdf' });

    render(<MemoryRouter><PostLogin /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: /apply to be an admin/i }));

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/upload your cv/i), { target: { files: [cvFile] } });
      fireEvent.change(screen.getByLabelText(/upload your motivational letter/i), { target: { files: [letterFile] } });
      fireEvent.submit(screen.getByRole('form', { name: 'Admin Application Form' }));
    });

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Error: Authentication failed');
      expect(uploadMock).not.toHaveBeenCalled();
    });
  });

  test('submits application successfully with valid files', async () => {
    const cvFile = new File(['cv'], 'cv.pdf', { type: 'application/pdf' });
    const letterFile = new File(['letter'], 'letter.pdf', { type: 'application/pdf' });

    render(<MemoryRouter><PostLogin /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: /apply to be an admin/i }));

    const cvInput = screen.getByLabelText(/upload your cv/i);
    const letterInput = screen.getByLabelText(/upload your motivational letter/i);
    const form = screen.getByRole('form', { name: 'Admin Application Form' });

    await act(async () => {
      fireEvent.change(cvInput, { target: { files: [cvFile] } });
      fireEvent.change(letterInput, { target: { files: [letterFile] } });
      console.log('Submitting form with files:', cvInput.files, letterInput.files);
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(uploadMock).toHaveBeenCalledTimes(2);
      expect(uploadMock).toHaveBeenCalledWith(
        `cv/${mockUser.id}_1234567890_cv.pdf`,
        cvFile
      );
      expect(uploadMock).toHaveBeenCalledWith(
        `letters/${mockUser.id}_1234567890_letter.pdf`,
        letterFile
      );
      expect(getPublicUrlMock).toHaveBeenCalledWith(`cv/${mockUser.id}_1234567890_cv.pdf`);
      expect(getPublicUrlMock).toHaveBeenCalledWith(`letters/${mockUser.id}_1234567890_letter.pdf`);
      expect(upsertMock).toHaveBeenCalledWith({
        id: mockUser.id,
        role: 'pending',
        admin_application_reason: 'pending',
        cv_url: `http://mock.storage/cv/${mockUser.id}_1234567890_cv.pdf`,
        motivational_letter_url: `http://mock.storage/letters/${mockUser.id}_1234567890_letter.pdf`,
        applied_at: '2025-05-18T16:57:00.000Z',
      });
      expect(mockAlert).toHaveBeenCalledWith('Application submitted successfully!');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  test('displays selected file names after upload', async () => {
    const cvFile = new File(['cv'], 'cv.pdf', { type: 'application/pdf' });
    const letterFile = new File(['letter'], 'letter.pdf', { type: 'application/pdf' });

    render(<MemoryRouter><PostLogin /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: /apply to be an admin/i }));

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/upload your cv/i), { target: { files: [cvFile] } });
      fireEvent.change(screen.getByLabelText(/upload your motivational letter/i), { target: { files: [letterFile] } });
    });

    expect(screen.getByText(`Selected: ${cvFile.name}`)).toBeInTheDocument();
    expect(screen.getByText(`Selected: ${letterFile.name}`)).toBeInTheDocument();
  });

  test('shows submitting state during application submission', async () => {
    const cvFile = new File(['cv'], 'cv.pdf', { type: 'application/pdf' });
    const letterFile = new File(['letter'], 'letter.pdf', { type: 'application/pdf' });

    uploadMock.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({
      data: { path: `cv/${mockUser.id}_1234567890_cv.pdf` },
      error: null,
    }), 100)));

    render(<MemoryRouter><PostLogin /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: /apply to be an admin/i }));

    const cvInput = screen.getByLabelText(/upload your cv/i);
    const letterInput = screen.getByLabelText(/upload your motivational letter/i);
    const form = screen.getByRole('form', { name: 'Admin Application Form' });

    await act(async () => {
      fireEvent.change(cvInput, { target: { files: [cvFile] } });
      fireEvent.change(letterInput, { target: { files: [letterFile] } });
      fireEvent.submit(form);
    });

    expect(screen.getByRole('button', { name: /submitting.../i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submit application/i })).not.toBeDisabled();
    });
  });

  test('handles file upload failure', async () => {
    uploadMock.mockRejectedValueOnce(new Error('Upload failed'));

    const cvFile = new File(['cv'], 'cv.pdf', { type: 'application/pdf' });
    const letterFile = new File(['letter'], 'letter.pdf', { type: 'application/pdf' });

    render(<MemoryRouter><PostLogin /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: /apply to be an admin/i }));

    const cvInput = screen.getByLabelText(/upload your cv/i);
    const letterInput = screen.getByLabelText(/upload your motivational letter/i);
    const form = screen.getByRole('form', { name: 'Admin Application Form' });

    await act(async () => {
      fireEvent.change(cvInput, { target: { files: [cvFile] } });
      fireEvent.change(letterInput, { target: { files: [letterFile] } });
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Error: Upload failed');
      expect(upsertMock).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  test('handles database upsert failure', async () => {
    upsertMock.mockResolvedValueOnce({ error: new Error('Database error') });

    const cvFile = new File(['cv'], 'cv.pdf', { type: 'application/pdf' });
    const letterFile = new File(['letter'], 'letter.pdf', { type: 'application/pdf' });

    render(<MemoryRouter><PostLogin /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: /apply to be an admin/i }));

    const cvInput = screen.getByLabelText(/upload your cv/i);
    const letterInput = screen.getByLabelText(/upload your motivational letter/i);
    const form = screen.getByRole('form', { name: 'Admin Application Form' });

    await act(async () => {
      fireEvent.change(cvInput, { target: { files: [cvFile] } });
      fireEvent.change(letterInput, { target: { files: [letterFile] } });
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Error: Database error');
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  test('rejects non-PDF file uploads', async () => {
    const invalidFile = new File(['cv'], 'cv.txt', { type: 'text/plain' });

    render(<MemoryRouter><PostLogin /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: /apply to be an admin/i }));

    const cvInput = screen.getByLabelText(/upload your cv/i);
    await act(async () => {
      fireEvent.change(cvInput, { target: { files: [invalidFile] } });
    });

    expect(screen.queryByText(`Selected: ${invalidFile.name}`)).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.submit(screen.getByRole('form', { name: 'Admin Application Form' }));
    });

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Please upload both your CV and motivational letter');
    });
  });

  test('accessibility attributes are set correctly', async () => {
    render(<MemoryRouter><PostLogin /></MemoryRouter>);
    const continueButton = screen.getByRole('button', { name: /continue as user/i });
    expect(continueButton).not.toHaveAttribute('type');
    const applyButton = screen.getByRole('button', { name: /apply to be an admin/i });
    expect(applyButton).not.toHaveAttribute('type');

    await userEvent.click(applyButton);
    await waitFor(() => {
      const form = screen.getByRole('form', { name: 'Admin Application Form' });
      expect(form).toHaveAttribute('aria-label', 'Admin Application Form');
      expect(screen.getByLabelText(/upload your cv/i)).toHaveAttribute('accept', '.pdf');
      expect(screen.getByLabelText(/upload your motivational letter/i)).toHaveAttribute('accept', '.pdf');
      expect(screen.getByRole('button', { name: /submit application/i })).toHaveAttribute('type', 'submit');
      expect(screen.getByRole('button', { name: /cancel/i })).toHaveAttribute('type', 'button');
    });
  });
});