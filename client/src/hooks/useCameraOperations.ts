import { useCallback } from "react";
import * as Cesium from "cesium";
import { INITIAL_CAMERA, LIMITS_AND_DURATIONS } from "../utils/cesiumConfig";

export function useCameraOperations(
  viewerRef: React.MutableRefObject<Cesium.Viewer | null>
) {
  const handleZoom = useCallback((zoomIn: boolean) => {
    if (!viewerRef.current) return;

    const camera = viewerRef.current.scene.camera;
    const currentHeight = camera.positionCartographic.height;
    const newHeight = zoomIn
      ? Math.max(currentHeight * 0.5, LIMITS_AND_DURATIONS.zoom.min)
      : Math.min(currentHeight * 2, LIMITS_AND_DURATIONS.zoom.max);

    camera.flyTo({
      destination: Cesium.Cartesian3.fromRadians(
        camera.positionCartographic.longitude,
        camera.positionCartographic.latitude,
        newHeight
      ),
      orientation: {
        heading: camera.heading,
        pitch: camera.pitch,
        roll: camera.roll,
      },
      duration: LIMITS_AND_DURATIONS.animation.zoom,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    });
  }, []);

  const handleTiltAdjust = useCallback((direction: "up" | "down") => {
    if (!viewerRef.current) return;

    const camera = viewerRef.current.scene.camera;
    const pitchIncrement = Cesium.Math.toRadians(15);
    const newPitch =
      direction === "up"
        ? Math.min(camera.pitch + pitchIncrement, 0)
        : Math.max(camera.pitch - pitchIncrement, -Cesium.Math.PI_OVER_TWO);

    camera.flyTo({
      destination: camera.position,
      orientation: {
        heading: camera.heading,
        pitch: newPitch,
        roll: camera.roll,
      },
      duration: LIMITS_AND_DURATIONS.animation.tilt,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    });
  }, []);

  const handleRotate = useCallback((direction: "left" | "right") => {
    if (!viewerRef.current) return;

    const camera = viewerRef.current.scene.camera;
    const rotationIncrement = Cesium.Math.toRadians(15);
    const newHeading =
      direction === "left"
        ? camera.heading - rotationIncrement
        : camera.heading + rotationIncrement;

    camera.flyTo({
      destination: camera.position,
      orientation: {
        heading: newHeading,
        pitch: camera.pitch,
        roll: camera.roll,
      },
      duration: LIMITS_AND_DURATIONS.animation.rotate,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    });
  }, []);

  const handleHome = useCallback(() => {
    if (!viewerRef.current) return;

    viewerRef.current.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        INITIAL_CAMERA.position.longitude,
        INITIAL_CAMERA.position.latitude,
        INITIAL_CAMERA.position.height
      ),
      orientation: INITIAL_CAMERA.orientation,
      duration: LIMITS_AND_DURATIONS.animation.home,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    });
  }, []);

  const handleLocationSelect = useCallback((lat: number, lon: number) => {
    if (!viewerRef.current) return;

    // Use a much closer zoom level for location search results
    const zoomHeight = 50000; // 50 km height for a good overview of the area

    viewerRef.current.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, zoomHeight),
      duration: 2.0,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    });
  }, []);

  return {
    handleZoom,
    handleTiltAdjust,
    handleRotate,
    handleHome,
    handleLocationSelect,
  };
}
