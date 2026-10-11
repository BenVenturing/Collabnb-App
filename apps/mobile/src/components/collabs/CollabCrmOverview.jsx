import { View, Text, Pressable, ScrollView, TextInput } from "react-native";
import { useMemo, useState } from "react";
import Svg, { Rect } from "react-native-svg";
import { ChevronDown, Check, Search } from "lucide-react-native";
import { colors, fonts, radii, shadows } from "@/config/theme";

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

// The mobile counterpart to the web app's ProposalsOverview — the CRM header
// both the creator and host collab screens sit under: tappable stats, a
// twelve-month chart, a to-do list, search and dropdown filters.
//
// Stat values, chart series and to-dos are computed by the caller, since the
// creator and host sides count different records.
export default function CollabCrmOverview({
  stats = [],
  chart,
  todoItems = [],
  search,
  onSearchChange,
  filters = [],
  archiveToggle,
}) {
  const [openFilter, setOpenFilter] = useState(null);
  const [chartMode, setChartMode] = useState("money");

  const series = chart?.[chartMode] ?? [];
  const peak = Math.max(1, ...series);

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {stats.map((stat) => (
          <Pressable
            key={stat.key}
            onPress={stat.onPress}
            style={({ pressed }) => ({
              flexGrow: 1,
              flexBasis: "47%",
              padding: 14,
              borderRadius: radii.md,
              backgroundColor: colors.surface,
              opacity: pressed ? 0.85 : 1,
              ...shadows.sm,
            })}
          >
            <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.ink }}>
              {stat.value}
            </Text>
            <Text
              style={{
                fontFamily: fonts.bodyMedium,
                fontSize: 11,
                color: colors.sage,
                textTransform: "uppercase",
                letterSpacing: 0.6,
                marginTop: 4,
              }}
            >
              {stat.label}
            </Text>
            {stat.sub ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.slate, marginTop: 3 }}>
                {stat.sub}
              </Text>
            ) : null}
          </Pressable>
        ))}
      </View>

      {chart ? (
        <View style={{ padding: 16, borderRadius: radii.md, backgroundColor: colors.surface, ...shadows.sm }}>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
            {[
              { key: "money", label: "Earnings" },
              { key: "volume", label: "Applications" },
            ].map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => setChartMode(tab.key)}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderRadius: radii.pill,
                  backgroundColor: chartMode === tab.key ? colors.ink : colors.bone,
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.bodySemibold,
                    fontSize: 12,
                    color: chartMode === tab.key ? colors.surface : colors.slate,
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Svg width="100%" height={110} viewBox="0 0 240 110">
            {series.map((value, i) => {
              const height = Math.max(2, (value / peak) * 86);
              return (
                <Rect
                  key={i}
                  x={i * 20 + 3}
                  y={92 - height}
                  width={13}
                  height={height}
                  rx={3}
                  fill={value > 0 ? colors.ink : colors.stone}
                />
              );
            })}
          </Svg>
          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 2 }}>
            {MONTHS.map((m, i) => (
              <Text key={i} style={{ fontFamily: fonts.body, fontSize: 9, color: colors.sage }}>
                {m}
              </Text>
            ))}
          </View>
        </View>
      ) : null}

      {todoItems.length > 0 ? (
        <View style={{ padding: 16, borderRadius: radii.md, backgroundColor: colors.surface, gap: 10, ...shadows.sm }}>
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.ink }}>
            Needs your attention
          </Text>
          {todoItems.slice(0, 5).map((item, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  marginTop: 6,
                  backgroundColor: item.type === "deadline" ? "#B4403A" : colors.slate,
                }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.ink }}>
                  {item.title}
                </Text>
                {item.date ? (
                  <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.sage }}>
                    {item.date}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {onSearchChange ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 14,
            borderRadius: radii.pill,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.stone,
          }}
        >
          <Search size={16} color={colors.sage} />
          <TextInput
            value={search}
            onChangeText={onSearchChange}
            placeholder="Search by listing"
            placeholderTextColor={colors.sage}
            style={{
              flex: 1,
              paddingVertical: 11,
              fontFamily: fonts.body,
              fontSize: 14,
              color: colors.ink,
            }}
          />
        </View>
      ) : null}

      {filters.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: 8 }}
        >
          {filters.map((filter) => {
            const selected = filter.options.find((o) => o.value === filter.value);
            return (
              <Pressable
                key={filter.key}
                onPress={() => setOpenFilter(openFilter === filter.key ? null : filter.key)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingVertical: 8,
                  paddingHorizontal: 13,
                  borderRadius: radii.pill,
                  backgroundColor: filter.value === "all" ? colors.surface : colors.ink,
                  borderWidth: 1,
                  borderColor: filter.value === "all" ? colors.stone : colors.ink,
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.bodyMedium,
                    fontSize: 12,
                    color: filter.value === "all" ? colors.slate : colors.surface,
                  }}
                >
                  {selected?.label ?? filter.key}
                </Text>
                <ChevronDown size={13} color={filter.value === "all" ? colors.slate : colors.surface} />
              </Pressable>
            );
          })}

          {archiveToggle ? (
            <Pressable
              onPress={() => archiveToggle.onChange(!archiveToggle.value)}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 13,
                borderRadius: radii.pill,
                backgroundColor: archiveToggle.value ? colors.ink : colors.surface,
                borderWidth: 1,
                borderColor: archiveToggle.value ? colors.ink : colors.stone,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bodyMedium,
                  fontSize: 12,
                  color: archiveToggle.value ? colors.surface : colors.slate,
                }}
              >
                Archived
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      ) : null}

      {openFilter ? (
        <View style={{ padding: 8, borderRadius: radii.md, backgroundColor: colors.surface, ...shadows.sm }}>
          {filters
            .find((f) => f.key === openFilter)
            ?.options.map((option) => {
              const filter = filters.find((f) => f.key === openFilter);
              const isCurrent = filter.value === option.value;
              return (
                <Pressable
                  key={String(option.value)}
                  onPress={() => {
                    filter.onChange(option.value);
                    setOpenFilter(null);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 11,
                    paddingHorizontal: 10,
                    borderRadius: radii.sm,
                  }}
                >
                  <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.ink }}>
                    {option.label}
                  </Text>
                  {isCurrent ? <Check size={16} color={colors.ink} /> : null}
                </Pressable>
              );
            })}
        </View>
      ) : null}
    </View>
  );
}

// Twelve buckets for the current calendar year, so the chart's x-axis is always
// Jan–Dec regardless of how much history there is.
export function bucketByMonth(records, getDate, getValue) {
  const year = new Date().getFullYear();
  const buckets = Array(12).fill(0);
  (records || []).forEach((record) => {
    const date = getDate(record);
    if (!date || Number.isNaN(date.getTime()) || date.getFullYear() !== year) return;
    buckets[date.getMonth()] += getValue(record);
  });
  return buckets;
}

export function useCrmChart(pitches, contracts) {
  return useMemo(
    () => ({
      volume: bucketByMonth(pitches, (p) => new Date(p.created_at ?? p._creationTime), () => 1),
      money: bucketByMonth(
        (contracts || []).filter((c) => c.paid),
        (c) => new Date(c.created_at),
        (c) => c.payment_amount ?? c.cash_value ?? 0,
      ),
    }),
    [pitches, contracts],
  );
}
