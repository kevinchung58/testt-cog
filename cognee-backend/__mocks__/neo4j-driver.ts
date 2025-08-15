// Manual mock for the 'neo4j-driver' package.
// This file is automatically used by Jest in place of the real module.

console.log('JEST: Using manual mock for neo4j-driver.');

const mockTransaction = {
  run: jest.fn().mockResolvedValue({ records: [], summary: {} }),
  commit: jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
};

const mockSession = {
  run: jest.fn((query) => {
    // Add some basic logic for schema queries to return empty arrays
    if (query.includes('db.labels()')) {
      return Promise.resolve({ records: [{ get: () => [] }], summary: {} });
    }
    if (query.includes('db.relationshipTypes()')) {
      return Promise.resolve({ records: [{ get: () => [] }], summary: {} });
    }
    if (query.includes('db.propertyKeys()')) {
      return Promise.resolve({ records: [{ get: () => [] }], summary: {} });
    }
    return Promise.resolve({ records: [], summary: {} });
  }),
  writeTransaction: jest.fn(callback => callback(mockTransaction)),
  readTransaction: jest.fn(callback => callback(mockTransaction)),
  close: jest.fn().mockResolvedValue(undefined),
  beginTransaction: jest.fn(() => mockTransaction),
};

const mockDriver = {
  session: jest.fn(() => mockSession),
  verifyConnectivity: jest.fn().mockResolvedValue({}),
  close: jest.fn().mockResolvedValue(undefined),
};

export const driver = jest.fn(() => mockDriver);
export const auth = {
  basic: jest.fn(),
};

// Export any other named exports that the application code might use.
export default {
  driver,
  auth,
};
