import { useState } from "react";
import useSavedCollections from "@/hooks/useSavedCollections";

export function useListingDetail(listing) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAllDeliverables, setShowAllDeliverables] = useState(false);
  const [showBrandGuidelines, setShowBrandGuidelines] = useState(false);
  const [showIdealCreator, setShowIdealCreator] = useState(false);
  const [expandedThingsToKnow, setExpandedThingsToKnow] = useState({
    revision: false,
    usage: false,
    dispute: false,
  });

  // Was SavedStore (AsyncStorage, device-local) while Explore and the Saved tab
  // read Convex collections, so a save made here never showed up in Saved and
  // never reached the user's other devices.
  const { isSaved, toggleSaved } = useSavedCollections();

  const handleSaveToggle = async () => {
    if (!listing) return;
    await toggleSaved(listing.id);
  };

  return {
    isSaved: listing ? isSaved(listing.id) : false,
    currentImageIndex,
    setCurrentImageIndex,
    showAllDeliverables,
    setShowAllDeliverables,
    showBrandGuidelines,
    setShowBrandGuidelines,
    showIdealCreator,
    setShowIdealCreator,
    expandedThingsToKnow,
    setExpandedThingsToKnow,
    handleSaveToggle,
  };
}
