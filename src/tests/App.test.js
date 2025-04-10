import { render, screen } from '@testing-library/react';
import App from '../App';

test('checks for div existence', () => {
  render(<App />);
  
  // Method 1: By test ID (most reliable)
  const divElement = screen.getByTestId('main-div');
  expect(divElement).toBeInTheDocument();

  // Method 2: By role (generic div check)
  const divs = screen.getAllByRole('generic'); // divs have 'generic' role
  expect(divs.length).toBeGreaterThan(0);
  
  // Method 3: By className
  const appDiv = screen.getByClassName('App');
  expect(appDiv).toBeInTheDocument();
});