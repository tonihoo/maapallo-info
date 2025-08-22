import { useCallback, useRef } from "react";
import { Map as OlMap } from "ol";
import VectorSource from "ol/source/Vector";
import { Draw } from "ol/interaction";
import { LineString } from "ol/geom";
import { getLength } from "ol/sphere";
import { unByKey } from "ol/Observable";
import { Circle } from "ol/style";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import {
  setIsMeasuring,
  setCurrentMeasurement,
} from "../../store/slices/mapSlice";

interface UseMeasurementProps {
  olMap: OlMap;
  measureSourceRef: React.RefObject<VectorSource | null>;
}

export function useMeasurement({
  olMap,
  measureSourceRef,
}: UseMeasurementProps) {
  // Redux state and dispatch
  const isMeasuring = useAppSelector((state) => state.map.isMeasuring);
  const currentMeasurement = useAppSelector(
    (state) => state.map.currentMeasurement
  );
  const dispatch = useAppDispatch();

  const measureDrawRef = useRef<Draw | null>(null);

  const formatLength = useCallback((length: number) => {
    if (length > 100) {
      return Math.round((length / 1000) * 100) / 100 + " km";
    } else {
      return Math.round(length * 100) / 100 + " m";
    }
  }, []);

  const toggleMeasurement = useCallback(() => {
    if (isMeasuring) {
      // Stop measuring
      if (measureDrawRef.current) {
        olMap.removeInteraction(measureDrawRef.current);
        measureDrawRef.current = null;
      }
      dispatch(setIsMeasuring(false));
    } else {
      // Start measuring - clear previous measurements
      if (measureSourceRef.current) {
        measureSourceRef.current.clear();
      }
      dispatch(setCurrentMeasurement(""));

      const draw = new Draw({
        source: measureSourceRef.current || new VectorSource(),
        type: "LineString",
        style: new Style({
          stroke: new Stroke({
            color: "#ffcc33",
            width: 3,
            lineDash: [10, 10],
          }),
          image: new Circle({
            radius: 5,
            fill: new Fill({ color: "#ffcc33" }),
            stroke: new Stroke({ color: "#ff9900", width: 2 }),
          }),
        }),
      });

      measureDrawRef.current = draw;
      olMap.addInteraction(draw);

      let listener: ReturnType<typeof unByKey> | null = null;
      draw.on("drawstart", (evt) => {
        const sketch = evt.feature;
        const geometry = sketch.getGeometry();
        if (geometry) {
          listener = geometry.on("change", (evt) => {
            const geom = evt.target as LineString;
            const length = getLength(geom);
            dispatch(setCurrentMeasurement(formatLength(length)));
          });
        }
      });

      draw.on("drawend", () => {
        if (listener) {
          unByKey(listener);
        }
        // Keep the measurement active but remove the draw interaction
        olMap.removeInteraction(draw);
        measureDrawRef.current = null;
        dispatch(setIsMeasuring(false));
      });

      dispatch(setIsMeasuring(true));
    }
  }, [isMeasuring, olMap, formatLength, dispatch, measureSourceRef]);

  const clearMeasurements = useCallback(() => {
    if (measureSourceRef.current) {
      measureSourceRef.current.clear();
    }
    dispatch(setCurrentMeasurement(""));
    if (measureDrawRef.current) {
      olMap.removeInteraction(measureDrawRef.current);
      measureDrawRef.current = null;
    }
    dispatch(setIsMeasuring(false));
  }, [olMap, dispatch, measureSourceRef]);

  return {
    isMeasuring,
    currentMeasurement,
    toggleMeasurement,
    clearMeasurements,
  };
}
