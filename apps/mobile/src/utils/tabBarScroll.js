// Revolut-style tab bar: scrolling down shrinks the bar to icons only,
// scrolling up (or reaching the top) brings the labels back.
// Tab screens pass `onTabScroll` to their main scroll view; GlassTabBar reads
// `tabBarCollapse` (0 = full, 1 = mini).
import { Easing, makeMutable, withTiming } from "react-native-reanimated";

export const tabBarCollapse = makeMutable(0);

// Timing, not a spring: a spring overshoots and the icons visibly bounce.
const TIMING = { duration: 280, easing: Easing.out(Easing.cubic) };
const TOP_ZONE = 24;
const THRESHOLD = 10;

let collapsed = false;
let anchorY = null;

export function setTabBarCollapsed(next) {
  if (next === collapsed) return;
  collapsed = next;
  tabBarCollapse.value = withTiming(next ? 1 : 0, TIMING);
}

// New tab: start expanded, and let the next scroll event set the baseline.
export function resetTabBar() {
  anchorY = null;
  setTabBarCollapsed(false);
}

export function onTabScroll(e) {
  const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
  // Clamp out the rubber-band at the bottom so the bounce doesn't re-expand it.
  const maxY = Math.max(contentSize.height - layoutMeasurement.height, 0);
  const y = Math.min(contentOffset.y, maxY);
  if (y <= TOP_ZONE) {
    anchorY = y;
    setTabBarCollapsed(false);
    return;
  }
  if (anchorY == null) {
    anchorY = y;
    return;
  }
  const dy = y - anchorY;
  if (Math.abs(dy) < THRESHOLD) return;
  anchorY = y;
  setTabBarCollapsed(dy > 0);
}
