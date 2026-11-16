import { useEffect, useRef } from "react";
import { View, TextInput, Pressable } from "react-native";
import Animated, {
  Easing,
  ZoomIn,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { colors, fonts } from "@/config/theme";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const BOX_W = 46;
const GAP = 10;
const DASH = 30;

// status: "idle" | "verifying" | "success" | "error"
// Success timeline (~1.5s, signup.jsx waits for it): boxes collapse,
// two ticks draw in, then the mark zooms through the screen.
export default function CodeBoxes({ value, onChange, length = 6, status = "idle" }) {
  const inputRef = useRef(null);
  const shake = useSharedValue(0);
  const collapse = useSharedValue(0);
  const tick1 = useSharedValue(0);
  const tick2 = useSharedValue(0);
  const label = useSharedValue(0);
  const zoom = useSharedValue(0);

  useEffect(() => {
    if (status === "error") {
      shake.value = withSequence(
        ...[-8, 8, -6, 6, -3, 0].map((x) => withTiming(x, { duration: 50 }))
      );
    }
    if (status === "success") {
      inputRef.current?.blur();
      const ease = Easing.out(Easing.cubic);
      collapse.value = withTiming(1, { duration: 380, easing: Easing.inOut(Easing.cubic) });
      tick1.value = withDelay(300, withTiming(1, { duration: 280, easing: ease }));
      tick2.value = withDelay(500, withTiming(1, { duration: 280, easing: ease }));
      label.value = withDelay(650, withTiming(1, { duration: 250 }));
      zoom.value = withDelay(1050, withTiming(1, { duration: 450, easing: Easing.in(Easing.cubic) }));
    } else {
      collapse.value = 0;
      tick1.value = 0;
      tick2.value = 0;
      label.value = 0;
      zoom.value = 0;
    }
  }, [status]);

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: (tick1.value > 0 ? 1 : 0) * (1 - zoom.value),
    transform: [{ scale: 1 + zoom.value * zoom.value * 24 }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: label.value * (1 - Math.min(1, zoom.value * 3)),
    transform: [{ translateY: (1 - label.value) * 4 }],
  }));
  const tick1Props = useAnimatedProps(() => ({ strokeDashoffset: DASH * (1 - tick1.value) }));
  const tick2Props = useAnimatedProps(() => ({ strokeDashoffset: DASH * (1 - tick2.value) }));

  const digits = value.split("");
  const center = (length - 1) / 2;

  return (
    <View style={{ alignItems: "center", justifyContent: "center", height: 72 }}>
      <Pressable onPress={() => inputRef.current?.focus()} disabled={status === "success"}>
        <Animated.View style={[{ flexDirection: "row", gap: GAP }, rowStyle]}>
          {Array.from({ length }).map((_, i) => (
            <Box
              key={i}
              index={i}
              digit={digits[i]}
              active={status !== "success" && i === Math.min(digits.length, length - 1)}
              offset={(center - i) * (BOX_W + GAP)}
              collapse={collapse}
              error={status === "error"}
            />
          ))}
        </Animated.View>
      </Pressable>

      <View pointerEvents="none" style={{ position: "absolute", alignItems: "center" }}>
        <Animated.View style={markStyle}>
          <Svg width={64} height={38} viewBox="0 0 32 19">
            <AnimatedPath
              d="M2 10 L7.5 15.5 L18 3"
              stroke={colors.slate}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray={DASH}
              animatedProps={tick1Props}
            />
            <AnimatedPath
              d="M12.5 14 L14 15.5 L24.5 3"
              stroke={colors.slate}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray={DASH}
              animatedProps={tick2Props}
            />
          </Svg>
        </Animated.View>
        <Animated.Text
          style={[
            { fontFamily: fonts.body, fontSize: 12, color: colors.sage, marginTop: 6, letterSpacing: 0.4 },
            labelStyle,
          ]}
        >
          Verified
        </Animated.Text>
      </View>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, "").slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        autoFocus
        editable={status !== "verifying" && status !== "success"}
        caretHidden
        style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
      />
    </View>
  );
}

function Box({ index, digit, active, offset, collapse, error }) {
  const float = useSharedValue(0);

  useEffect(() => {
    float.value = withDelay(
      index * 180,
      withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }), -1, true)
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - collapse.value,
    transform: [
      { translateY: -3 + float.value * 6 },
      { translateX: collapse.value * offset },
      { scale: 1 - collapse.value * 0.5 },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          width: BOX_W,
          height: 56,
          borderRadius: 14,
          backgroundColor: "transparent",
          borderWidth: 1.5,
          borderColor: error ? "#C4764A" : active ? colors.slate : colors.sage,
          opacity: 1,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      {digit ? (
        <Animated.Text
          key={digit + index}
          entering={ZoomIn.springify().damping(12).stiffness(220)}
          style={{ fontFamily: fonts.displaySemibold, fontSize: 24, color: colors.ink }}
        >
          {digit}
        </Animated.Text>
      ) : null}
    </Animated.View>
  );
}
