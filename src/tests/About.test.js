import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import About from '../components/About/About';

// Mock the Sidebar component
jest.mock('../components/Sidebar/Sidebar', () => {
  return jest.fn(({ isOpen, setIsOpen }) => (
    <div data-testid="sidebar" data-isopen={isOpen}>
      Mocked Sidebar
      <button onClick={() => setIsOpen(!isOpen)}>Toggle from Sidebar</button>
    </div>
  ));
});

// Mock the CSS import
jest.mock('../About.css', () => ({}));

describe('About', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders About component with title and text', () => {
    render(<About />);

    // Check title
    expect(screen.getByRole('heading', { name: /about/i })).toBeInTheDocument();

    // Check paragraph text (partial match for brevity)
    expect(screen.getByText(/welcome to the constitutional compass/i)).toBeInTheDocument();
    expect(screen.getByText(/historical constitutional archive platform/i)).toBeInTheDocument();
  });

  test('shows sidebar toggle button when sidebar is closed', () => {
    render(<About />);

    // Check toggle button is visible
    const toggleButton = screen.getByTestId('sidebar-toggle');
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toHaveStyle({ display: 'block' });
  });

  test('hides sidebar toggle button when sidebar is open', () => {
    render(<About />);

    // Click toggle button to open sidebar
    fireEvent.click(screen.getByTestId('sidebar-toggle'));

    // Check toggle button is hidden
    const toggleButton = screen.queryByTestId('sidebar-toggle');
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toHaveStyle({ display: 'none' });
  });

  test('toggles sidebar state when called from Sidebar', () => {
    render(<About />);

    // Initial state
    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-isopen', 'false');

    // Click toggle button from mocked Sidebar
    fireEvent.click(screen.getByText('Toggle from Sidebar'));

    // Check sidebar is open
    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-isopen', 'true');

    // Click again to close
    fireEvent.click(screen.getByText('Toggle from Sidebar'));

    // Check sidebar is closed
    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-isopen', 'false');
  });

  test('applies correct CSS classes', () => {
    render(<About />);

    // Check main article class
    expect(screen.getByRole('article')).toHaveClass('about-section');

    // Check container class
    expect(screen.getByText(/welcome to the constitutional compass/i).closest('section')).toHaveClass('about-container');

    // Check title class
    expect(screen.getByRole('heading', { name: /about/i })).toHaveClass('about-title');

    // Check text class
    expect(screen.getByText(/welcome to the constitutional compass/i)).toHaveClass('about-text');

    // Check toggle button class
    expect(screen.getByTestId('sidebar-toggle')).toHaveClass('sidebar-toggle');
  });
});