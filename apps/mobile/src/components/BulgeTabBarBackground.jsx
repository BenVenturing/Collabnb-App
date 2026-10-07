import { View, useWindowDimensions } from "react-native";
import { BlurView } from "expo-blur";
import Svg, { Path } from "react-native-svg";

// The tab bar's silhouette: a flat bar whose top edge arcs up into a true
// semicircle in the centre, then comes back down. Explore's map toggle lives
// inside that arc, so the button isn't a separate floating circle — it's part
// of the bar's own shape.
//
// Built from two overlapping BlurViews (a full-width bar plus a circle for
// the arc) rather than masking one BlurView to the path: MaskedView over a
// BlurView crashes this dev client's native render. The circle's lower half
// sits behind the bar, so the join reads as one continuous glass surface,
// and the SVG on top strokes the combined outline.

export const BULGE_RISE = 28; // also the arc radius — a true semicircle
export const BULGE_RADIUS = BULGE_RISE;

export function bulgePath(width, height, rise, withBulge) {
  const cx = width / 2;
  if (!withBulge) {
    return `M 0 ${rise} L ${width} ${rise} L ${width} ${height} L 0 ${height} Z`;
  }
  return [
    `M 0 ${rise}`,
    `L ${cx - BULGE_RADIUS} ${rise}`,
    `A ${BULGE_RADIUS} ${BULGE_RADIUS} 0 0 1 ${cx + BULGE_RADIUS} ${rise}`,
    `L ${width} ${rise}`,
    `L ${width} ${height}`,
    `L 0 ${height}`,
    "Z",
  ].join(" ");
}

export default function BulgeTabBarBackground({ height, withBulge }) {
  const { width } = useWindowDimensions();
  const d = bulgePath(width, height, BULGE_RISE, withBulge);

  return (
    <View style={{ width, height }}>
      {withBulge && (
        <BlurView
          intensity={80}
          tint="light"
          style={{
            position: "absolute",
            top: 0,
            left: width / 2 - BULGE_RADIUS,
            width: BULGE_RADIUS * 2,
            height: BULGE_RADIUS * 2,
            borderRadius: BULGE_RADIUS,
            overflow: "hidden",
          }}
        />
      )}
      <BlurView
        intensity={80}
        tint="light"
        style={{
          position: "absolute",
          top: BULGE_RISE,
          left: 0,
          width,
          height: height - BULGE_RISE,
        }}
      />
      <Svg width={width} height={height} style={{ position: "absolute" }}>
        <Path d={d} fill="none" stroke="rgba(208,213,206,0.6)" strokeWidth={1} />
      </Svg>
    </View>
  );
}
