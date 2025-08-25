import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  createFeature,
  updateFeature,
  deleteFeature,
} from "../store/slices/featuresSlice";
import { selectIsAuthenticated } from "../store/selectors";
import { FeatureTypes } from "../types/featureTypes";

export const useAuthenticatedFeatures = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const createFeatureWithAuth = useCallback(
    async (featureData: Partial<FeatureTypes>) => {
      if (!isAuthenticated) {
        throw new Error("Authentication required to create features");
      }
      return dispatch(createFeature(featureData));
    },
    [dispatch, isAuthenticated]
  );

  const updateFeatureWithAuth = useCallback(
    async (id: number, featureData: Partial<FeatureTypes>) => {
      if (!isAuthenticated) {
        throw new Error("Authentication required to update features");
      }
      return dispatch(updateFeature({ id, data: featureData }));
    },
    [dispatch, isAuthenticated]
  );

  const deleteFeatureWithAuth = useCallback(
    async (id: number) => {
      if (!isAuthenticated) {
        throw new Error("Authentication required to delete features");
      }
      return dispatch(deleteFeature(id));
    },
    [dispatch, isAuthenticated]
  );

  return {
    createFeature: createFeatureWithAuth,
    updateFeature: updateFeatureWithAuth,
    deleteFeature: deleteFeatureWithAuth,
    isAuthenticated,
  };
};
