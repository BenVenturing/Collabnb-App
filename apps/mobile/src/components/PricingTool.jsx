import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  TIER_IDS,
  TIERS,
  DELIVERABLE_TYPES,
  DELIVERABLE_LABELS,
  DELIVERABLE_POINTS,
  PRESET_PACKAGES,
  LOAD_TIER_LABELS,
  totalPoints,
  calcMidpoint,
  calcRange,
  calcStayOffset,
  calcHardFloor,
  calcWarnThreshold,
  evaluateZone,
  computeLoadTier,
  isDeliverableAllowedForTier,
  findPackagesForBudget,
} from "@/utils/compensationPoints";

function fmt(n) {
  return `$${Math.round(n).toLocaleString()}`;
}

const ZONE_COPY = {
  amber: "Below the recommended range — still publishable, but creators may pass.",
  red: "Below the minimum floor for this workload and tier.",
};

function Pill({ active, onPress, children, disabled }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.pill, active && styles.pillActive, disabled && { opacity: 0.4 }]}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{children}</Text>
    </TouchableOpacity>
  );
}

function Segmented({ options, value, onChange }) {
  return (
    <View style={styles.segmented}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          onPress={() => onChange(opt.value)}
          style={[styles.segment, value === opt.value && styles.segmentActive]}
        >
          <Text
            style={[
              styles.segmentText,
              value === opt.value && styles.segmentTextActive,
            ]}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function Stepper({ label, points, quantity, onChange, disabled }) {
  return (
    <View style={[styles.stepper, disabled && { opacity: 0.4 }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepperLabel}>{label}</Text>
        {points > 0 && <Text style={styles.stepperPts}>{points} pts each</Text>}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <TouchableOpacity
          disabled={disabled || quantity <= 0}
          onPress={() => onChange(Math.max(0, quantity - 1))}
          style={styles.stepBtnMinus}
        >
          <Text style={styles.stepBtnMinusText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.stepperQty}>{quantity}</Text>
        <TouchableOpacity
          disabled={disabled}
          onPress={() => onChange(quantity + 1)}
          style={styles.stepBtnPlus}
        >
          <Text style={styles.stepBtnPlusText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PresetCard({ preset, points, midpoint, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.presetCard, active && styles.presetCardActive]}
    >
      <Text style={styles.presetName}>{preset.name}</Text>
      <Text style={styles.presetMid}>~{fmt(midpoint)} mid-range</Text>
    </TouchableOpacity>
  );
}

function ThreeZoneScale({ hardFloor, warnThreshold, range, cashAmount, midpoint }) {
  const upperBound = Math.max(range.high * 1.3, (cashAmount || 0) * 1.15, hardFloor * 2, 100);
  const pct = (n) => Math.max(0, Math.min(100, (n / upperBound) * 100));
  const markerLeft = cashAmount ? pct(cashAmount) : null;
  const recommended = Math.round(midpoint / 10) * 10;
  const medianP = pct(midpoint);

  return (
    <View style={{ marginTop: 14 }}>
      <View style={{ height: 18, justifyContent: "flex-end" }}>
        <View style={{ position: "absolute", left: `${medianP}%`, transform: [{ translateX: -18 }] }}>
          <Text style={styles.medianLabel}>{fmt(recommended)}</Text>
        </View>
      </View>
      <View style={styles.scaleTrack}>
        <LinearGradient
          colors={["#DCEFE3", "#6FAE8E", "#234A3A", "#17352A"]}
          locations={[0, 0.45, 0.78, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, borderRadius: 9999 }}
        />
        {markerLeft !== null && (
          <View style={[styles.scaleMarker, { left: `${markerLeft}%` }]} />
        )}
      </View>
      <View style={styles.scaleLabelsRow}>
        <Text style={styles.scaleLabelText}>Min {fmt(hardFloor)}</Text>
        <Text style={styles.scaleLabelText}>Caution {fmt(warnThreshold)}</Text>
        <Text style={styles.scaleLabelText}>
          Recommended {fmt(range.low)}–{fmt(range.high)}
        </Text>
      </View>
    </View>
  );
}

export default function PricingTool({ initialValue, onChange }) {
  const [entryMode, setEntryMode] = useState("deliverables");
  const [tierId, setTierId] = useState(initialValue?.tierId || "ugc_pro");
  const [compensationType, setCompensationType] = useState(
    initialValue?.compensationType || "paid",
  );
  const [complexity, setComplexity] = useState(initialValue?.complexity || "standard");
  const [stayValue, setStayValue] = useState(initialValue?.stayValue || 0);
  const [deliverables, setDeliverables] = useState(initialValue?.deliverables || []);
  const [cashAmount, setCashAmount] = useState(initialValue?.cashAmount || 0);
  const [budget, setBudget] = useState(250);
  const [selectedPreset, setSelectedPreset] = useState(null);

  const tier = TIERS[tierId];
  const track = tier?.track;

  const quantities = useMemo(() => {
    const map = {};
    DELIVERABLE_TYPES.forEach((t) => (map[t] = 0));
    deliverables.forEach((d) => (map[d.type] = d.quantity));
    return map;
  }, [deliverables]);

  function setQuantity(type, quantity) {
    setSelectedPreset(null);
    setDeliverables((prev) => {
      const next = prev.filter((d) => d.type !== type);
      if (quantity > 0) next.push({ type, quantity });
      return next;
    });
  }

  function applyPreset(preset) {
    setSelectedPreset(preset.name);
    setDeliverables(preset.deliverables.map((d) => ({ ...d })));
    setEntryMode("deliverables");
  }

  const points = totalPoints(deliverables);
  const midpoint = calcMidpoint(points, tierId, complexity);
  const range = calcRange(midpoint);
  const stayOffset = compensationType === "hybrid" ? calcStayOffset(stayValue, tierId, midpoint) : 0;
  const hardFloor = calcHardFloor(midpoint, stayOffset);
  const warnThreshold = calcWarnThreshold(midpoint, stayOffset);
  const zone = points > 0 ? evaluateZone(cashAmount, midpoint, stayOffset) : null;
  const loadTier = computeLoadTier(deliverables);

  const effectiveStayOffset = compensationType === "hybrid" ? calcStayOffset(stayValue, tierId, budget) : 0;
  const effectiveBudget = budget + effectiveStayOffset;
  const { fitting, stretch } = useMemo(
    () => findPackagesForBudget({ budget: effectiveBudget, tierId, complexity, track }),
    [effectiveBudget, tierId, complexity, track],
  );

  const relevantPresets = PRESET_PACKAGES.filter((p) => p.track === track || p.track === "custom");

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.heading}>Pricing calculator</Text>
      <Text style={styles.subtitle}>
        See a fair compensation range before you set your listing's terms.
      </Text>

      <Segmented
        value={entryMode}
        onChange={setEntryMode}
        options={[
          { value: "deliverables", label: "By deliverables" },
          { value: "budget", label: "By budget" },
        ]}
      />

      <Text style={styles.sectionLabel}>CREATOR TIER</Text>
      <View style={styles.pillRow}>
        {TIER_IDS.map((id) => (
          <Pill key={id} active={tierId === id} onPress={() => setTierId(id)}>
            {TIERS[id].label}
          </Pill>
        ))}
      </View>

      <Text style={styles.sectionLabel}>COMPENSATION TYPE</Text>
      <View style={styles.pillRow}>
        <Pill active={compensationType === "paid"} onPress={() => setCompensationType("paid")}>
          Paid
        </Pill>
        <Pill active={compensationType === "hybrid"} onPress={() => setCompensationType("hybrid")}>
          Hybrid (stay + cash)
        </Pill>
      </View>
      {compensationType === "hybrid" && (
        <View style={{ marginTop: 8, marginBottom: 4 }}>
          <Text style={styles.fieldLabel}>Declared stay value</Text>
          <View style={styles.inputWrap}>
            <Text style={styles.inputPrefix}>$</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={stayValue ? String(stayValue) : ""}
              onChangeText={(v) => setStayValue(Number(v.replace(/[^0-9]/g, "")) || 0)}
              placeholder="0"
              placeholderTextColor="#959D90"
            />
          </View>
        </View>
      )}

      <Text style={styles.sectionLabel}>COMPLEXITY</Text>
      <View style={styles.pillRow}>
        <Pill active={complexity === "standard"} onPress={() => setComplexity("standard")}>
          Standard
        </Pill>
        <Pill active={complexity === "complex"} onPress={() => setComplexity("complex")}>
          Complex (shot list, drone, exclusivity)
        </Pill>
      </View>

      {entryMode === "budget" ? (
        <View style={{ marginTop: 8 }}>
          <Text style={styles.sectionLabel}>CASH BUDGET</Text>
          <View style={[styles.inputWrap, { maxWidth: 160 }]}>
            <Text style={styles.inputPrefix}>$</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={budget ? String(budget) : ""}
              onChangeText={(v) => setBudget(Number(v.replace(/[^0-9]/g, "")) || 0)}
              placeholderTextColor="#959D90"
            />
          </View>
          {compensationType === "hybrid" && effectiveStayOffset > 0 && (
            <Text style={styles.helperNote}>
              With stay value applied: effective budget {fmt(effectiveBudget)}
            </Text>
          )}

          <Text style={styles.sectionLabel}>PACKAGES THAT FIT</Text>
          {fitting.length === 0 ? (
            <Text style={styles.helperNote}>No preset fits this budget yet.</Text>
          ) : (
            <View style={styles.presetGrid}>
              {fitting.map((p) => (
                <PresetCard
                  key={p.name}
                  preset={p}
                  points={p.points}
                  midpoint={p.midpoint}
                  active={selectedPreset === p.name}
                  onPress={() => applyPreset(p)}
                />
              ))}
            </View>
          )}
          {stretch && (
            <>
              <Text style={styles.sectionLabel}>STRETCH OPTION</Text>
              <PresetCard
                preset={stretch}
                points={stretch.points}
                midpoint={stretch.midpoint}
                active={selectedPreset === stretch.name}
                onPress={() => applyPreset(stretch)}
              />
            </>
          )}
        </View>
      ) : (
        <View style={{ marginTop: 8 }}>
          <Text style={styles.sectionLabel}>PRESETS</Text>
          <View style={styles.presetGrid}>
            {relevantPresets.map((p) => {
              const pPoints = totalPoints(p.deliverables);
              const pMidpoint = calcMidpoint(pPoints, tierId, complexity);
              return (
                <PresetCard
                  key={p.name}
                  preset={p}
                  points={pPoints}
                  midpoint={pMidpoint}
                  active={selectedPreset === p.name}
                  onPress={() => applyPreset(p)}
                />
              );
            })}
          </View>

          <View style={styles.buildYourOwnCard}>
            <View style={styles.buildYourOwnHeader}>
              <Text style={styles.sectionLabel}>BUILD YOUR OWN</Text>
              <Text style={styles.loadTierText}>
                {loadTier ? LOAD_TIER_LABELS[loadTier] : "No load"} workload
              </Text>
            </View>
            {DELIVERABLE_TYPES.map((type) => (
              <Stepper
                key={type}
                label={DELIVERABLE_LABELS[type]}
                points={DELIVERABLE_POINTS[type] ?? 0}
                quantity={quantities[type]}
                disabled={!isDeliverableAllowedForTier(type, tierId)}
                onChange={(q) => setQuantity(type, q)}
              />
            ))}
          </View>

          <Text style={styles.sectionLabel}>CASH COMPENSATION</Text>
          <View style={[styles.inputWrap, { maxWidth: 160 }]}>
            <Text style={styles.inputPrefix}>$</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={cashAmount ? String(cashAmount) : ""}
              onChangeText={(v) => setCashAmount(Number(v.replace(/[^0-9]/g, "")) || 0)}
              placeholder="0"
              placeholderTextColor="#959D90"
            />
          </View>

          {points > 0 && (
            <>
              <Text style={styles.rangeText}>
                {fmt(range.low)}–{fmt(range.high)}
              </Text>
              <Text style={styles.rangeSub}>
                {points} pts × {fmt(tier.ratePerPoint)}/pt ({tier.label},{" "}
                {complexity === "complex" ? "complex" : "standard"}) → mid {fmt(midpoint)}
                {stayOffset > 0 ? ` (stay offsets ${fmt(stayOffset)})` : ""}
              </Text>
              <ThreeZoneScale
                hardFloor={hardFloor}
                warnThreshold={warnThreshold}
                range={range}
                cashAmount={cashAmount}
                midpoint={midpoint}
              />
              {zone && zone !== "green" && (
                <Text style={styles.zoneNote}>{ZONE_COPY[zone]}</Text>
              )}
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = {
  heading: { fontSize: 20, fontWeight: "700", color: "#192524", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#3C5759", marginBottom: 18, lineHeight: 18 },

  segmented: {
    flexDirection: "row",
    backgroundColor: "rgba(25,37,36,0.06)",
    borderRadius: 9999,
    padding: 4,
    marginBottom: 20,
    alignSelf: "flex-start",
  },
  segment: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999 },
  segmentActive: { backgroundColor: "#192524" },
  segmentText: { fontSize: 12.5, fontWeight: "600", color: "#3C5759" },
  segmentTextActive: { color: "#EFECE9" },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#959D90",
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 8,
  },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: "#959D90",
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  pillActive: { backgroundColor: "#192524", borderColor: "#192524" },
  pillText: { fontSize: 12.5, fontWeight: "600", color: "#3C5759" },
  pillTextActive: { color: "#EFECE9" },

  fieldLabel: { fontSize: 12, color: "#3C5759", marginBottom: 4 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "rgba(25,37,36,0.15)",
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  inputPrefix: { fontSize: 14, color: "#959D90", marginRight: 2 },
  input: { flex: 1, paddingVertical: 10, fontSize: 14, fontWeight: "600", color: "#192524" },
  helperNote: { fontSize: 12, color: "#959D90", marginTop: 6 },

  presetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  presetCard: {
    width: "48%",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(25,37,36,0.1)",
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  presetCardActive: { borderColor: "#192524", backgroundColor: "rgba(209,235,219,0.45)" },
  presetName: { fontSize: 13, fontWeight: "700", color: "#192524" },
  presetMid: { fontSize: 11, color: "#959D90", marginTop: 2 },

  buildYourOwnCard: {
    backgroundColor: "rgba(209,235,219,0.35)",
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    gap: 8,
  },
  buildYourOwnHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  loadTierText: { fontSize: 12, fontWeight: "600", color: "#3C5759" },

  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  stepperLabel: { fontSize: 13, fontWeight: "600", color: "#192524" },
  stepperPts: { fontSize: 11, color: "#959D90" },
  stepperQty: { fontSize: 14, fontWeight: "700", color: "#192524", minWidth: 16, textAlign: "center" },
  stepBtnMinus: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: "#959D90",
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnMinusText: { fontSize: 14, color: "#3C5759", lineHeight: 16 },
  stepBtnPlus: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#192524",
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnPlusText: { fontSize: 14, color: "#EFECE9", lineHeight: 16 },

  rangeText: { fontSize: 26, fontWeight: "800", color: "#192524", marginTop: 12 },
  rangeSub: { fontSize: 12, color: "#3C5759", marginTop: 2, lineHeight: 17 },

  scaleTrack: { height: 10, borderRadius: 9999, overflow: "visible" },
  scaleMarker: {
    position: "absolute",
    top: -3,
    width: 3,
    height: 16,
    backgroundColor: "#EFECE9",
    borderRadius: 2,
    borderWidth: 1,
    borderColor: "#192524",
  },
  medianLabel: { fontSize: 10, fontWeight: "700", color: "#192524" },
  scaleLabelsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  scaleLabelText: { fontSize: 9.5, color: "#959D90", flexShrink: 1 },
  zoneNote: { fontSize: 11.5, color: "#8a4a30", marginTop: 10, lineHeight: 16 },
};
