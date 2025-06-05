import { getAllHedgehogs, getHedgehogById, createHedgehog } from '../hedgehog';
import { getPool } from '@server/db';

jest.mock('@server/db');

jest.mock('../hedgehog', () => {
  jest.mock('@shared/hedgehog', () => ({
    hedgehogSchema: {
      parse: jest.fn(data => data)
    }
  }), { virtual: true });

  return jest.requireActual('../hedgehog');
});

describe('Hedgehog application logic', () => {
  const mockPool = {
    query: jest.fn(),
    maybeOne: jest.fn(),
    one: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getPool as jest.Mock).mockReturnValue(mockPool);
  });

  describe('getAllHedgehogs', () => {
    it('should return all hedgehogs', async () => {
      const mockHedgehogs = [
        { id: 1, name: 'Saara Sijainti' },
        { id: 2, name: 'Sami Sijainti' }
      ];
      mockPool.query.mockResolvedValueOnce({ rows: mockHedgehogs });

      const result = await getAllHedgehogs();

      expect(mockPool.query).toHaveBeenCalled();
      expect(result).toEqual(mockHedgehogs);
    });

    it('should throw an error if the database query fails', async () => {
      const mockError = new Error('Database connection failed');
      mockPool.query.mockRejectedValueOnce(mockError);

      await expect(getAllHedgehogs()).rejects.toThrow('Database error');
    });
  });

  describe('getHedgehogById', () => {
    it('should return a hedgehog by id', async () => {
      const mockHedgehog = {
        id: 1,
        name: 'Saara Sijainti',
        age: 3,
        gender: 'female',
        location: { type: 'Point', coordinates: [385000, 6670000] }
      };
      mockPool.maybeOne.mockResolvedValueOnce(mockHedgehog);

      const result = await getHedgehogById(1);

      expect(mockPool.maybeOne).toHaveBeenCalled();
      expect(result).toEqual(mockHedgehog);
    });

    it('should return null if hedgehog does not exist', async () => {
      mockPool.maybeOne.mockResolvedValueOnce(null);

      const result = await getHedgehogById(999);

      expect(mockPool.maybeOne).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('createHedgehog', () => {
    it('should create a new hedgehog and return it', async () => {
      const newHedgehog = {
        name: 'Uusi Sijainti',
        age: 1,
        gender: 'male',
        location: {
          type: 'Point',
          coordinates: [666879, 7017394]
        }
      };

      const returnedHedgehog = {
        id: 3,
        ...newHedgehog
      };

      mockPool.one.mockResolvedValueOnce(returnedHedgehog);

      const result = await createHedgehog(newHedgehog);

      expect(mockPool.one).toHaveBeenCalled();
      expect(result).toEqual(returnedHedgehog);
      // Verify the SQL contained the hedgehog data
      expect(mockPool.one.mock.calls[0][0].values).toContainEqual(newHedgehog.name);
      expect(mockPool.one.mock.calls[0][0].values).toContainEqual(newHedgehog.age);
      expect(mockPool.one.mock.calls[0][0].values).toContainEqual(newHedgehog.gender);
    });

    it('should throw an error if creating a hedgehog fails', async () => {
      const mockError = new Error('Insert failed');
      mockPool.one.mockRejectedValueOnce(mockError);

      await expect(createHedgehog({
        name: 'Epäonninen Sijainti',
        age: 2,
        gender: 'unknown',
        location: {
          type: 'Point',
          coordinates: [666879, 7017394]
        }
      })).rejects.toThrow('Database error');
    });
  });
});
