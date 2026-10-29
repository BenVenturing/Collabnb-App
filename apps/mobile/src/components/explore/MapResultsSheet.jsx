// Airbnb's map results sheet: rests at half height over the map, drags down
// to a thin "N collabs" strip or up into a full listing feed. As it rises past
// half, a floating Map pill fades and un-blurs in; tapping it drops the sheet
// back so the map shows again.

import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { View, Pressable, Dimensions } from "react-native";
import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import Animated, { interpolate, useAnimatedStyle, useAnimatedProps, useSharedValue, Extrapolation } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { Map as MapIcon } from "lucide-react-native";
import * as haptic from "@/utils/haptics";
import { colors, radii, shadows } from "@/config/theme";
import { Body, Display, ListingTile } from "@/components/ui";

const AnimatedBlur = Animated.createAnimatedComponent(BlurView);
const TILE_W = Dimensions.get("window").width - 40;

const MapResultsSheet = forwardRef(function MapResultsSheet(
  { listings, title, savedIds, onToggleSave, onOpen, bottomInset },
  ref,
) {
  const sheet = useRef(null);
  const listRef = useRef(null);
  const index = useSharedValue(1);
  const snapPoints = useMemo(() => [96, "48%", "100%"], []);

  useImperativeHandle(ref, () => ({
    scrollTo: (i) => listRef.current?.scrollToIndex({ index: i, animated: true, viewPosition: 0 }),
    half: () => sheet.current?.snapToIndex(1),
  }));

  // 1 → 2 (half → full): pill goes from invisible + heavily blurred to crisp.
  const pillStyle = useAnimatedStyle(() => ({
    opacity: interpolate(index.value, [1.3, 1.9], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(index.value, [1.3, 1.9], [16, 0], Extrapolation.CLAMP) }, { scale: interpolate(index.value, [1.3, 1.9], [0.9, 1], Extrapolation.CLAMP) }],
  }));
  const veilProps = useAnimatedProps(() => ({
    intensity: interpolate(index.value, [1.3, 1.9], [60, 0], Extrapolation.CLAMP),
  }));
  // The map's own controls fade out as the sheet covers it.
  const handleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(index.value, [1.8, 2], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <>
      <BottomSheet
        ref={sheet}
        index={1}
        snapPoints={snapPoints}
        animatedIndex={index}
        enableDynamicSizing={false}
        onChange={() => haptic.select()}
        backgroundStyle={{ backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}
        handleIndicatorStyle={{ backgroundColor: colors.stone, width: 40 }}
        style={shadows.lg}
      >
        <Animated.View style={[{ alignItems: "center", paddingBottom: 12 }, handleStyle]}>
          <Display size={16}>{title}</Display>
        </Animated.View>
        <BottomSheetFlatList
          ref={listRef}
          data={listings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 24, paddingBottom: bottomInset + 120 }}
          onScrollToIndexFailed={() => {}}
          ListEmptyComponent={
            <Body size={13} color={colors.sage} style={{ textAlign: "center", paddingTop: 8 }}>
              Move the map to find collabs
            </Body>
          }
          renderItem={({ item }) => (
            <ListingTile
              width={TILE_W}
              image={item.image}
              images={item.images}
              title={item.title}
              location={item.location}
              price={item.compensation}
              deliverables={item.deliverables}
              featured={item.is_featured}
              badge={item.isSample ? "Sample" : undefined}
              saved={savedIds.has(item.id)}
              redacted={item._redacted === true}
              onToggleSave={() => onToggleSave(item)}
              onPress={() => onOpen(item)}
            />
          )}
        />
      </BottomSheet>

      <Animated.View
        pointerEvents="box-none"
        style={[{ position: "absolute", alignSelf: "center", bottom: bottomInset + 24, ...shadows.md }, pillStyle]}
      >
        <Pressable
          onPress={() => {
            haptic.tap();
            sheet.current?.snapToIndex(1);
          }}
          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.96 : 1 }] })}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: colors.ink, borderRadius: radii.pill, paddingHorizontal: 18, paddingVertical: 12, overflow: "hidden" }}>
            <Body size={14} weight="semibold" color={colors.surface}>
              Map
            </Body>
            <MapIcon color={colors.surface} size={16} />
            <AnimatedBlur animatedProps={veilProps} tint="light" pointerEvents="none" style={{ position: "absolute", inset: 0 }} />
          </View>
        </Pressable>
      </Animated.View>
    </>
  );
});

export default MapResultsSheet;
