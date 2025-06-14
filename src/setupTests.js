// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
require('@testing-library/jest-dom');
window.alert = jest.fn();
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  if (args[0].includes('React Router Future Flag Warning')) {
    return;
  }
  originalConsoleWarn(...args);
};
