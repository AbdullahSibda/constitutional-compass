import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Features from '../components/Features/Features';
import Sidebar from '../components/Sidebar/Sidebar';

// Mock dependencies
jest.mock('../components/Sidebar/Sidebar', () => {
  return function MockSidebar({ isOpen, setIsOpen }) {
    return (
      <div data-testid="sidebar" className={isOpen ? 'open' : 'closed'}>
        <button onClick={() => setIsOpen(false)}>Close Sidebar</button>
      </div>
    );
  };
});

jest.mock('../components/Features/Features.css', () => ({}));

describe('Features Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders Features component with title and feature list', () => {
    render(<Features />);
    
    // Check main title
    expect(screen.getByText('Features')).toBeInTheDocument();
    
    // Check feature section titles
    expect(screen.getByText('Admin Portal')).toBeInTheDocument();
    expect(screen.getByText('Natural Language Search')).toBeInTheDocument();
    expect(screen.getByText('Structured Archival System')).toBeInTheDocument();
    expect(screen.getByText('Document & Media Access')).toBeInTheDocument();
    expect(screen.getByText('Role-Based Access')).toBeInTheDocument();
    
    // Check some feature list items
    expect(screen.getByText('Secure sign-up and login for authorized users')).toBeInTheDocument();
    expect(screen.getByText('Public-facing search bar with Perplexity-style query experience')).toBeInTheDocument();
    expect(screen.getByText('Inline previews of text content')).toBeInTheDocument();
  });

  test('toggles sidebar visibility', async () => {
    render(<Features />);
    
    // Check initial state
    const sidebarToggle = screen.getByRole('button', { name: /☰/ });
    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).toHaveClass('closed');
    expect(sidebarToggle).toBeVisible();
    
    // Open sidebar
    await act(async () => {
      fireEvent.click(sidebarToggle);
    });
    expect(sidebar).toHaveClass('open');
    expect(sidebarToggle).not.toBeVisible();
    
    // Close sidebar
    const closeButton = screen.getByText('Close Sidebar');
    await act(async () => {
      fireEvent.click(closeButton);
    });
    expect(sidebar).toHaveClass('closed');
    expect(sidebarToggle).toBeVisible();
  });
});