import { colors } from "@/config/theme";

// Shared between InboxScreen's thread-row badges and ConversationDetailsSheet's
// tag-change picker, mirroring web's TAG_STYLES tag set (Application/Collab/Pitch).
export const TAG_OPTIONS = ["Application", "Collab", "Pitch"];

export const TAG_COLORS = {
  Collab: colors.mint,
  Application: colors.stone,
  Pitch: "#F7DCD3",
  Collabnb: colors.ink,
  Notifications: colors.slate,
};

export const TAG_TEXT_COLORS = {
  Collab: colors.slate,
  Application: colors.slate,
  Pitch: "#B5502F",
  Collabnb: colors.bone,
  Notifications: colors.bone,
};
