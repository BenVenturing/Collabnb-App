// The shared component library. Import from here, not from the files directly:
//   import { ListingCard, Chip, SectionHeading } from "@/components/ui";
//
// These mirror the web app's component vocabulary — see COMPONENT-SPEC.md for
// what each one is and which web element it corresponds to. Screens assemble
// from these rather than styling from scratch.

export { EyebrowLabel, Display, Body, SectionHeading } from "./Text";
export { Chip, PillButton, RoundButton } from "./Chip";
export { StatGrid, ListingCard, CompactListRow } from "./Cards";
export { FormField, SearchBar, SegmentedToggle } from "./Inputs";
export {
  StickyActionBar,
  BottomSheet,
  ProfileHeader,
  MessageBubble,
  MenuOverlay,
} from "./Chrome";

export { default as Glass } from "../Glass";
export { default as AtmosphericBackground } from "../AtmosphericBackground";
