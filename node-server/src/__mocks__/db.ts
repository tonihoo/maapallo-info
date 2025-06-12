// Mock for the database module
const mockPool = {
  query: jest.fn(),
  maybeOne: jest.fn(),
  one: jest.fn()
};

export const getPool = jest.fn(() => mockPool);

export const SharedPool = {
  getPool: jest.fn(() => mockPool)
};

export const createDatabasePool = jest.fn(async () => {
  return Promise.resolve();
});
