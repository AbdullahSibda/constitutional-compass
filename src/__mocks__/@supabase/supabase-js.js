const queryBuilder = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  is: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  ilike: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
};

const mockSupabase = {
  auth: {
    getSession: jest.fn().mockImplementation(() => {
      return Promise.resolve({
        data: { session: { user: { id: '123', email: 'test@example.com' } } },
        error: null,
      });
    }),
    getUser: jest.fn().mockImplementation(() => {
      return Promise.resolve({
        data: { user: { id: '123', email: 'test@example.com' } },
        error: null,
      });
    }),
    onAuthStateChange: jest.fn().mockImplementation((callback) => {
      callback('SIGNED_IN', { user: { id: '123', email: 'test@example.com' } });
      return {
        data: { subscription: { unsubscribe: jest.fn() } },
      };
    }),
    signInWithOAuth: jest.fn().mockImplementation(() => {
      return Promise.resolve({ error: null });
    }),
    signOut: jest.fn().mockImplementation(() => {
      return Promise.resolve({ error: null });
    }),
  },
  from: jest.fn().mockImplementation((table) => {
    if (table === 'users') {
      return {
        ...queryBuilder,
        select: jest.fn().mockReturnValue({
          ...queryBuilder,
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockImplementation(() => {
              return Promise.resolve({
                data: { role: 'user' },
                error: null,
              });
            }),
          }),
        }),
      };
    }
    if (table === 'documents') {
      return {
        ...queryBuilder,
        select: jest.fn().mockReturnValue({
          ...queryBuilder,
          is: jest.fn().mockImplementation(() => {
            return Promise.resolve({
              data: [
                { id: 'folder1', name: 'Folder 1', is_folder: true, parent_id: null, is_deleted: false, metadata: { type: 'folder' } },
                { id: 'file1', name: 'File 1', is_folder: false, parent_id: null, is_deleted: false, metadata: { displayName: 'File 1', file_type: 'pdf' } },
              ],
              error: null,
            });
          }),
          eq: jest.fn().mockImplementation(() => {
            return Promise.resolve({
              data: [
                { id: 'file2', name: 'File 2', is_folder: false, parent_id: 'folder1', is_deleted: false, metadata: { displayName: 'File 2', file_type: 'doc' } },
              ],
              error: null,
            });
          }),
          or: jest.fn().mockReturnValue({
            in: jest.fn().mockImplementation(() => {
              return Promise.resolve({
                data: [
                  { id: 'file3', name: 'File 3', is_folder: false, parent_id: 'folder1', metadata: { displayName: 'File 3', file_type: 'pdf' }, parentFolder: { name: 'Folder 1' } },
                ],
                error: null,
              });
            }),
          }),
          ilike: jest.fn().mockImplementation(() => {
            return Promise.resolve({
              data: [
                { id: 'file1', name: 'File 1', is_folder: false, parent_id: 'folder1', is_deleted: false, metadata: { displayName: 'File 1', file_type: 'pdf' } },
              ],
              error: null,
            });
          }),
          order: jest.fn().mockReturnThis(),
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockImplementation(() => {
            return Promise.resolve({ data: [{ id: 'new-folder' }], error: null });
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockImplementation(() => {
            return Promise.resolve({ error: null });
          }),
        }),
        upsert: jest.fn().mockImplementation(() => {
          return Promise.resolve({ error: null });
        }),
      };
    }
    return queryBuilder;
  }),
  storage: {
    from: jest.fn().mockReturnValue({
      download: jest.fn().mockImplementation(() => {
        return Promise.resolve({ data: new Blob(), error: null });
      }),
      upload: jest.fn().mockImplementation((path, file, options) => {
        if (options.onProgress) {
          options.onProgress({ loaded: 50, total: 100 }); // Simulate 50% progress
        }
        return Promise.resolve({ data: { path }, error: null });
      }),
      remove: jest.fn().mockImplementation(() => {
        return Promise.resolve({ error: null });
      }),
    }),
  },
};

export const createClient = jest.fn().mockImplementation(() => {
  return mockSupabase;
});