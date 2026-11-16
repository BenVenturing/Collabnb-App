import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import { Image } from "expo-image";

export default function FloatingArt({ source, size = 150, style }) {
  const y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: -5, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [y]);

  return (
    <Animated.View style={[{ transform: [{ translateY: y }], marginBottom: 12, opacity: 0.88 }, style]}>
      <Image source={source} style={{ width: size, height: size }} contentFit="contain" />
    </Animated.View>
  );
}
