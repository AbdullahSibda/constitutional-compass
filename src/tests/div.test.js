import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import App from '../App';
import Dashboard from '../components/Dashboard/Dashboard';
import Home from '../components/Home/Home';
import Login from '../components/Login/Login';
import Navbar from '../components/Navbar/Navbar';

// Mock all CSS imports
jest.mock('../components/Navbar/Navbar.css', () => ({}));
jest.mock('../components/Dashboard/Dashboard.css', () => ({}));
jest.mock('../components/Home/Home.css', () => ({}));
jest.mock('../components/Login/Login.css', () => ({}));

// Mock AuthContext
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    signIn: jest.fn(),
    signOut: jest.fn(),
    signUp: jest.fn()
  })
}));

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signIn: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn()
    }
  }))
}));

describe('Div Element Checks', () => {
  test('App component has no div elements', () => {
    const { container } = render(
      <Router>
        <App />
      </Router>
    );
    expect(container.firstChild.nodeName).not.toBe('DIV');
    expect(container.querySelector('div')).toBeNull();
  });

  test('Dashboard component has no div elements', () => {
    const { container } = render(
      <Router>
        <Dashboard />
      </Router>
    );
    expect(container.firstChild.nodeName).not.toBe('DIV');
    expect(container.querySelector('div')).toBeNull();
  });

  test('Home component has no div elements', () => {
    const { container } = render(
      <Router>
        <Home />
      </Router>
    );
    expect(container.firstChild.nodeName).not.toBe('DIV');
    expect(container.querySelector('div')).toBeNull();
  });

  test('Login component has no div elements', () => {
    const { container } = render(
      <Router>
        <Login />
      </Router>
    );
    expect(container.firstChild.nodeName).not.toBe('DIV');
    expect(container.querySelector('div')).toBeNull();
  });

  test('Navbar component has no div elements', () => {
    const { container } = render(
      <Router>
        <Navbar />
      </Router>
    );
    expect(container.firstChild.nodeName).not.toBe('DIV');
    expect(container.querySelector('div')).toBeNull();
  });
});