import { HeaderMenu } from "./HeaderMenu";

interface AppHeaderProps {
  onSelectFeature: (id: number) => void;
  selectedFeatureId?: number | null;
  refreshTrigger?: number;
  is3DMode?: boolean;
}

export const AppHeader = ({
  onSelectFeature,
  selectedFeatureId,
  refreshTrigger,
  is3DMode,
}: AppHeaderProps) => {
  return (
    <>
      {/* Left side - Hamburger menu */}
      <HeaderMenu
        onSelectFeature={onSelectFeature}
        selectedFeatureId={selectedFeatureId}
        refreshTrigger={refreshTrigger}
        is3DMode={is3DMode}
      />
    </>
  );
};
