// Native counterpart to Collabnb Website/app/src/components/map/CollabMap.jsx —
// same pill markers, grid clustering and clamped-cell math, rebuilt on
// react-native-maps since Mapbox GL JS is web-only. Region delta stands in for
// Mapbox zoom when sizing cluster cells.

import { forwardRef, useMemo, useState, useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { colors, fonts, radii, shadows } from "@/config/theme";

const DEFAULT_REGION = { latitude: 39.5, longitude: -98.5, latitudeDelta: 40, longitudeDelta: 40 };

function regionForPoints(points, paddingFactor = 1.6) {
  if (!points.length) return DEFAULT_REGION;
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const p of points) {
    minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng); maxLng = Math.max(maxLng, p.lng);
  }
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * paddingFactor, 0.08),
    longitudeDelta: Math.max((maxLng - minLng) * paddingFactor, 0.08),
  };
}

// Mirrors CollabMap's clusterPoints: never cluster a handful of pins, and
// stop clustering once zoomed in close (small latitudeDelta ~ high zoom).
function clusterPoints(points, latitudeDelta) {
  if (points.length <= 18 || latitudeDelta <= 0.05) {
    return points.map((p) => ({ type: "point", ...p }));
  }
  const cell = latitudeDelta * 0.6;
  const grid = new Map();
  for (const p of points) {
    const key = `${Math.floor(p.lng / cell)}:${Math.floor(p.lat / cell)}`;
    (grid.get(key) || grid.set(key, []).get(key)).push(p);
  }
  const out = [];
  for (const group of grid.values()) {
    if (group.length === 1) { out.push({ type: "point", ...group[0] }); continue; }
    const lat = group.reduce((s, p) => s + p.lat, 0) / group.length;
    const lng = group.reduce((s, p) => s + p.lng, 0) / group.length;
    out.push({ type: "cluster", lat, lng, count: group.length, points: group });
  }
  return out;
}

function Pill({ label, active, minted }) {
  return (
    <View
      style={{
        paddingHorizontal: active ? 11 : 10,
        paddingVertical: 6,
        borderRadius: radii.pill,
        borderWidth: active ? 1.5 : 1,
        borderColor: active ? colors.ink : colors.hairline,
        backgroundColor: active ? colors.ink : minted ? colors.mint : colors.surface,
        ...shadows.sm,
      }}
    >
      <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: active ? "#fff" : colors.ink }}>
        {label || "·"}
      </Text>
    </View>
  );
}

function ClusterPill({ count }) {
  return (
    <View
      style={{
        width: 34, height: 34, borderRadius: 17,
        alignItems: "center", justifyContent: "center",
        borderWidth: 1.5, borderColor: colors.hairline,
        backgroundColor: colors.surface,
        ...shadows.sm,
      }}
    >
      <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.ink }}>{count}</Text>
    </View>
  );
}

// points: [{ id, lat, lng, label, redacted }]
const ExploreMap = forwardRef(function ExploreMap(
  { points = [], activeId = null, savedIds, visitedIds, onPinPress, onRegionChange, fitPoints },
  ref
) {
  const [latitudeDelta, setLatitudeDelta] = useState(DEFAULT_REGION.latitudeDelta);
  const initialRegion = useMemo(
    () => regionForPoints(fitPoints?.length ? fitPoints : points),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const clusters = useMemo(() => clusterPoints(points, latitudeDelta), [points, latitudeDelta]);

  const handleRegionChangeComplete = useCallback((region) => {
    setLatitudeDelta(region.latitudeDelta);
    onRegionChange?.({
      north: region.latitude + region.latitudeDelta / 2,
      south: region.latitude - region.latitudeDelta / 2,
      east: region.longitude + region.longitudeDelta / 2,
      west: region.longitude - region.longitudeDelta / 2,
    });
  }, [onRegionChange]);

  const handleClusterPress = (cluster) => {
    ref?.current?.fitToCoordinates(
      cluster.points.map((p) => ({ latitude: p.lat, longitude: p.lng })),
      { edgePadding: { top: 80, right: 80, bottom: 80, left: 80 }, animated: true }
    );
  };

  const handlePointPress = (point) => {
    onPinPress?.(point.id);
    ref?.current?.animateToRegion(
      { latitude: point.lat, longitude: point.lng, latitudeDelta: Math.min(latitudeDelta, 4), longitudeDelta: Math.min(latitudeDelta, 4) },
      450
    );
  };

  return (
    <MapView
      ref={ref}
      style={{ flex: 1 }}
      initialRegion={initialRegion}
      onRegionChangeComplete={handleRegionChangeComplete}
      showsUserLocation={false}
      showsCompass={false}
      toolbarEnabled={false}
    >
      {clusters.map((c) =>
        c.type === "cluster" ? (
          <Marker
            key={`c-${c.lat.toFixed(3)}-${c.lng.toFixed(3)}-${c.count}`}
            coordinate={{ latitude: c.lat, longitude: c.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
            onPress={() => handleClusterPress(c)}
          >
            <ClusterPill count={c.count} />
          </Marker>
        ) : (
          <Marker
            key={c.id}
            coordinate={{ latitude: c.lat, longitude: c.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={c.id === activeId}
            onPress={() => handlePointPress(c)}
          >
            <Pill
              label={c.label}
              active={c.id === activeId}
              minted={savedIds?.has?.(c.id) || visitedIds?.has?.(c.id)}
            />
          </Marker>
        )
      )}
    </MapView>
  );
});

export default ExploreMap;
