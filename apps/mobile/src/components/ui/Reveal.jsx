// Staggered entrance for list items: each child rises and fades in a beat after
// the one before it. Only the first few items animate — long lists are
// virtualised, and re-animating rows as they scroll back in feels busy. Honours
// the system "reduce motion" setting.

import Animated, { FadeInDown, ReduceMotion } from "react-native-reanimated";

const STEP = 55;
const MAX_ANIMATED = 8;

export function Reveal({ index = 0, children, style }) {
  if (index >= MAX_ANIMATED) return <Animated.View style={style}>{children}</Animated.View>;
  return (
    <Animated.View
      entering={FadeInDown.delay(index * STEP).duration(420).springify().damping(18).reduceMotion(ReduceMotion.System)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}
