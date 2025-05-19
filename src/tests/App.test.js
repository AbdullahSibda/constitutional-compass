import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import App, { AppLayout, ProtectedRoute } from '../App';
import { useAuth } from '../contexts/AuthContext';

// Mock dependencies
jest.mock('../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  RouterProvider: jest.fn(({ router }) => <div data-testid="router-provider" router={router}>RouterProvider</div>),
  Outlet: jest.fn(() => <div data-testid="outlet">Outlet</div>),
  Navigate: jest.fn(({ to, replace }) => <div data-testid="navigate" to={to} replace={replace}>Navigate</div>),
}));
jest.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {
    workerSrc: '',
  },
  getDocument: jest.fn(),
}));

describe('App Component', () => {
  const mockUseAuth = useAuth;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('App renders RouterProvider with router', () => {
    render(<App />);
    const routerProvider = screen.getByTestId('router-provider');
    expect(routerProvider).toBeInTheDocument();
    expect(routerProvider).toHaveAttribute('router');
  });

  test('AppLayout renders section with Outlet', () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    );
    const section = screen.getByRole('region', { name: 'application content' });
    expect(section).toHaveClass('App');
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });

  test('ProtectedRoute shows loading when loading is true', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Child</div>
        </ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('ProtectedRoute renders children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({ user: { id: '123' }, loading: false });
    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div data-testid="child">Child</div>
        </ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Child')).toBeInTheDocument();
  });
});