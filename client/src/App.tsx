import { AppLayout } from "./components/common/AppLayout";
import { useAppInitialization } from "./hooks/useAppInitialization";
import { useAppSelector } from "./store/hooks";
import { selectRefreshTrigger } from "./store/selectors";

export function App() {
  // Redux state
  const refreshTrigger = useAppSelector(selectRefreshTrigger);

  // Initialize app (authentication, Cesium preloading, analytics)
  useAppInitialization(refreshTrigger);

  return <AppLayout />;
}
