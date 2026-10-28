// "Keep pulling to see more": content tucked below the end of a ScrollView
// that only appears once the user drags past the bottom and lets go. Empty
// sections pop a short toast instead of a permanent empty state.

import { useCallback, useEffect, useRef, useState } from "react";
import { Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as haptic from "@/utils/haptics";
import { colors, shadows } from "@/config/theme";
import Glass from "@/components/Glass";
import { Body } from "@/components/ui";

const PULL_THRESHOLD = 70;

// Spread onto the ScrollView. `onPull` fires once per over-drag past the
// bottom edge. Short content counts too: the whole drag is overscroll then.
export function useBottomPull(onPull, threshold = PULL_THRESHOLD) {
  const metrics = useRef({ y: 0, contentH: 0, layoutH: 0 });
  const onScroll = useCallback((e) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    metrics.current = { y: contentOffset.y, contentH: contentSize.height, layoutH: layoutMeasurement.height };
  }, []);
  const onScrollEndDrag = useCallback(
    (e) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const maxY = Math.max(0, contentSize.height - layoutMeasurement.height);
      if (contentOffset.y - maxY > threshold) {
        haptic.tap();
        onPull();
      }
    },
    [onPull, threshold],
  );
  return { onScroll, onScrollEndDrag, alwaysBounceVertical: true, scrollEventThrottle: 16 };
}

// Rises out of the bottom edge with a squash-and-stretch, like it's being
// pulled up from under the page.
export function PulledSection({ children, style }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(t, { toValue: 1, damping: 13, stiffness: 140, mass: 0.9, useNativeDriver: true }).start();
  }, [t]);
  return (
    <Animated.View
      style={[
        {
          opacity: t.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
          transform: [
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) },
            { scaleY: t.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.6, 1.05, 1] }) },
            { scaleX: t.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.92, 0.98, 1] }) },
          ],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

// Small glass pill above the tab bar. Call show(text) to pop it for a moment.
export function usePullToast() {
  const [text, setText] = useState(null);
  const timer = useRef(null);
  const show = useCallback((msg) => {
    clearTimeout(timer.current);
    setText(msg);
    timer.current = setTimeout(() => setText(null), 2400);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return { text, show };
}

export function PullToast({ text }) {
  const insets = useSafeAreaInsets();
  const t = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(text);

  useEffect(() => {
    if (text) {
      setShown(text);
      Animated.spring(t, { toValue: 1, damping: 14, stiffness: 220, useNativeDriver: true }).start();
    } else {
      Animated.timing(t, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setShown(null));
    }
  }, [text, t]);

  if (!shown) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        alignSelf: "center",
        bottom: Math.max(insets.bottom, 8) + 84,
        opacity: t,
        transform: [
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
          { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
        ],
        ...shadows.md,
      }}
    >
      <Glass variant="small" style={{ borderRadius: 999 }} contentStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}>
        <Body size={13} weight="medium" color={colors.ink}>
          {shown}
        </Body>
      </Glass>
    </Animated.View>
  );
}
