process.env.REACT_APP_SUPABASE_URL = 'https://mock-supabase-url.supabase.co';
process.env.REACT_APP_SUPABASE_ANON = 'mock-anon-key';

Object.defineProperty(window, 'location', {
  value: {
    hostname: 'localhost',
    href: 'http://localhost:3000',
    writable: true,
  },
});