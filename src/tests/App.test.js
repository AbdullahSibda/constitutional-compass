import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';

test('should not find any div elements', () => {
  const { container } = render(<App />);

  expect(container.firstChild.nodeName).toBe('H1');
  expect(container.querySelector('div')).toBeNull();
});