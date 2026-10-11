import { View, Animated } from "react-native";
import { useState, useEffect, useRef } from "react";
import { colors as theme } from "@/config/theme";

// Simple confetti particle component
// Falls with randomized per-particle timing — a decorative one-off effect,
// not a UI transition, so it intentionally doesn't route through
// durations.*/motion.* (those durations are far shorter than a good confetti
// fall needs).
const ConfettiParticle = ({ delay, duration, startX }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 600,
        duration: duration,
        delay: delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: (Math.random() - 0.5) * 200,
        duration: duration,
        delay: delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: duration,
        delay: delay,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: Math.random() * 720,
        duration: duration,
        delay: delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const confettiColors = [theme.mint, theme.slate, theme.bone, theme.stone];
  const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: startX,
        top: -20,
        width: 10,
        height: 10,
        backgroundColor: color,
        borderRadius: 5,
        transform: [
          { translateY },
          { translateX },
          {
            rotate: rotate.interpolate({
              inputRange: [0, 720],
              outputRange: ["0deg", "720deg"],
            }),
          },
        ],
        opacity,
      }}
    />
  );
};

export default function ConfettiOverlay({ onComplete }) {
  const [particles] = useState(() =>
    Array.from({ length: 40 }, (_, i) => ({
      key: i,
      delay: Math.random() * 200,
      duration: 1500 + Math.random() * 500,
      startX: Math.random() * 400,
    })),
  );

  useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      {particles.map((p) => (
        <ConfettiParticle
          key={p.key}
          delay={p.delay}
          duration={p.duration}
          startX={p.startX}
        />
      ))}
    </View>
  );
}
