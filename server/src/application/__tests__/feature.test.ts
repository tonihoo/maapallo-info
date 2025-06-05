import { getAllFeatures, getFeatureById, createFeature } from '../feature';
import { getPool } from '@server/db';

jest.mock('@server/db');

jest.mock('../featureTypes', () => {
  jest.mock('@shared/featureTypes', () => ({
    featureSchema: {
      parse: jest.fn(data => data)
    }
  }), { virtual: true });

  return jest.requireActual('../featureTypes');
});

describe('Feature application logic', () => {
  const mockPool = {
    query: jest.fn(),
    maybeOne: jest.fn(),
    one: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getPool as jest.Mock).mockReturnValue(mockPool);
  });

  describe('getAllFeatures', () => {
    it('should return all features', async () => {
      const mockFeatures = [
        { id: 1, name: 'Saara Sijainti' },
        { id: 2, name: 'Sami Sijainti' }
      ];
      mockPool.query.mockResolvedValueOnce({ rows: mockFeatures });

      const result = await getAllFeatures();

      expect(mockPool.query).toHaveBeenCalled();
      expect(result).toEqual(mockFeatures);
    });

    it('should throw an error if the database query fails', async () => {
      const mockError = new Error('Database connection failed');
      mockPool.query.mockRejectedValueOnce(mockError);

      await expect(getAllFeatures()).rejects.toThrow('Database error');
    });
  });

  describe('getFeatureById', () => {
    it('should return a feature by id', async () => {
      const mockFeature = {
        id: 1,
        name: 'Saara Sijainti',
        age: 3,
        gender: 'female',
        location: { type: 'Point', coordinates: [385000, 6670000] }
      };
      mockPool.maybeOne.mockResolvedValueOnce(mockFeature);

      const result = await getFeatureById(1);

      expect(mockPool.maybeOne).toHaveBeenCalled();
      expect(result).toEqual(mockFeature);
    });

    it('should return null if feature does not exist', async () => {
      mockPool.maybeOne.mockResolvedValueOnce(null);

      const result = await getFeatureById(999);

      expect(mockPool.maybeOne).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('createFeature', () => {
    it('should create a new feature and return it', async () => {
      const newFeature = {
        name: 'Uusi Sijainti',
        age: 1,
        gender: 'male',
        location: {
          type: 'Point',
          coordinates: [666879, 7017394]
        }
      };

      const returnedFeature = {
        id: 3,
        ...newFeature
      };

      mockPool.one.mockResolvedValueOnce(returnedFeature);

      const result = await createFeature(newFeature);

      expect(mockPool.one).toHaveBeenCalled();
      expect(result).toEqual(returnedFeature);
      // Verify the SQL contained the feature data
      expect(mockPool.one.mock.calls[0][0].values).toContainEqual(newFeature.name);
      expect(mockPool.one.mock.calls[0][0].values).toContainEqual(newFeature.age);
      expect(mockPool.one.mock.calls[0][0].values).toContainEqual(newFeature.gender);
    });

    it('should throw an error if creating a feature fails', async () => {
      const mockError = new Error('Insert failed');
      mockPool.one.mockRejectedValueOnce(mockError);

      await expect(createFeature({
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
