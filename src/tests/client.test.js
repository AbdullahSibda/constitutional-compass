import { supabase } from '../contexts/client';
import { createClient } from '@supabase/supabase-js';

jest.mock('@supabase/supabase-js');

describe('Supabase Client', () => {
  test('initializes with correct URL and key', () => {
    expect(createClient).toHaveBeenCalledWith(
      'https://mock-supabase-url.supabase.co',
      'mock-anon-key',
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          storage: localStorage
        }
      }
    );
    expect(supabase).toBeDefined();
  });
});
