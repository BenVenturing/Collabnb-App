import { View, Text, Pressable, ScrollView, TextInput, Modal } from "react-native";
import { useMemo, useState } from "react";
import Svg, { Rect } from "react-native-svg";
import { Check, Search, SlidersHorizontal, X } from "lucide-react-native";
import Glass from "@/components/Glass";
import { colors, fonts, radii } from "@/config/theme";

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const DOT_COLOR = { deadline: "#B4403A", pending_action: "#5b4db8", stay_date: "#2d7d5e" };

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

// The mobile counterpart to the web app's ProposalsOverview — the CRM header
// both the creator and host collab screens sit under: tappable stats, a
// twelve-month chart, a week strip + upcoming list, search and filters.
//
// Stat values, chart series and to-dos are computed by the caller, since the
// creator and host sides count different records. A to-do with a `date`
// (Date) gets a dot on the week strip.
export default function CollabCrmOverview({
  stats = [],
  chart,
  todoItems,
  search,
  onSearchChange,
  filters = [],
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [chartMode, setChartMode] = useState("money");
  const [selectedDay, setSelectedDay] = useState(null);

  const series = chart?.[chartMode] ?? [];
  const peak = Math.max(1, ...series);
  const chartHasData = chart && [...(chart.money ?? []), ...(chart.volume ?? [])].some((v) => v > 0);
  const activeFilterCount = filters.filter((f) => f.value !== "all").length;

  const week = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });
  }, []);

  const dotsByDay = useMemo(() => {
    const map = {};
    (todoItems || []).forEach((item) => {
      if (!item.date) return;
      const k = dayKey(item.date);
      (map[k] = map[k] || new Set()).add(item.type);
    });
    return map;
  }, [todoItems]);

  const visibleTodos = (todoItems || []).filter(
    (item) => !selectedDay || (item.date && dayKey(item.date) === selectedDay),
  );

  return (
    <View style={{ gap: 14 }}>
      <Glass variant="small" contentStyle={{ flexDirection: "row", paddingVertical: 14 }}>
        {stats.map((stat, i) => (
          <Pressable
            key={stat.key}
            onPress={stat.onPress}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: "center",
              paddingHorizontal: 4,
              opacity: pressed ? 0.6 : 1,
              borderLeftWidth: i === 0 ? 0 : 1,
              borderLeftColor: colors.hairline,
            })}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{ fontFamily: fonts.display, fontSize: 22, color: colors.ink }}
            >
              {stat.value}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                fontFamily: fonts.bodyMedium,
                fontSize: 10,
                color: stat.active ? colors.ink : colors.sage,
                textTransform: "uppercase",
                letterSpacing: 0.6,
                marginTop: 4,
              }}
            >
              {stat.label}
            </Text>
            {stat.hint ? (
              <Text numberOfLines={1} style={{ fontFamily: fonts.bodySemibold, fontSize: 10, color: "#2d7d5e", marginTop: 3 }}>
                {stat.hint}
              </Text>
            ) : null}
            <View
              style={{
                marginTop: 6,
                width: 16,
                height: 2,
                borderRadius: 1,
                backgroundColor: stat.active ? colors.ink : "transparent",
              }}
            />
          </Pressable>
        ))}
      </Glass>

      {chartHasData ? (
        <Glass variant="small" contentStyle={{ padding: 16 }}>
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
                  backgroundColor: chartMode === tab.key ? colors.ink : colors.hairline,
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

          <Svg width="100%" height={90} viewBox="0 0 240 90">
            {series.map((value, i) => {
              const height = Math.max(2, (value / peak) * 70);
              return (
                <Rect
                  key={i}
                  x={i * 20 + 3}
                  y={76 - height}
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
        </Glass>
      ) : null}

      {todoItems ? (
        <Glass variant="small" contentStyle={{ paddingVertical: 14 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 10, gap: 4 }}
          >
            {week.map((d) => {
              const k = dayKey(d);
              const selected = selectedDay === k;
              const dots = Array.from(dotsByDay[k] || []);
              return (
                <Pressable
                  key={k}
                  onPress={() => setSelectedDay(selected ? null : k)}
                  style={{
                    width: 40,
                    alignItems: "center",
                    paddingVertical: 8,
                    borderRadius: radii.sm,
                    backgroundColor: selected ? colors.ink : "transparent",
                  }}
                >
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 10, color: selected ? colors.surface : colors.sage }}>
                    {WEEKDAYS[d.getDay()]}
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.bodySemibold,
                      fontSize: 15,
                      marginTop: 4,
                      color: selected ? colors.surface : colors.ink,
                    }}
                  >
                    {d.getDate()}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 2, height: 5, marginTop: 5 }}>
                    {dots.map((type) => (
                      <View
                        key={type}
                        style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: DOT_COLOR[type] ?? colors.slate }}
                      />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={{ height: 1, backgroundColor: colors.hairline, marginVertical: 12, marginHorizontal: 16 }} />

          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.ink }}>
              {selectedDay ? "On this day" : "Up next"}
            </Text>
            {visibleTodos.length === 0 ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.sage }}>
                {selectedDay ? "Nothing scheduled" : "You're all caught up"}
              </Text>
            ) : (
              visibleTodos.slice(0, 5).map((item, i) => (
                <Pressable
                  key={i}
                  onPress={item.onPress}
                  disabled={!item.onPress}
                  style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      marginTop: 6,
                      backgroundColor: DOT_COLOR[item.type] ?? colors.slate,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.ink }}>{item.title}</Text>
                    {item.label ? (
                      <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.sage }}>{item.label}</Text>
                    ) : null}
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </Glass>
      ) : null}

      {onSearchChange ? (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Glass
            variant="small"
            style={{ flex: 1, borderRadius: radii.pill }}
            contentStyle={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14 }}
          >
            <Search size={16} color={colors.sage} />
            <TextInput
              value={search}
              onChangeText={onSearchChange}
              placeholder="Search listings, incl. archived"
              placeholderTextColor={colors.sage}
              style={{ flex: 1, paddingVertical: 11, fontFamily: fonts.body, fontSize: 14, color: colors.ink }}
            />
            {search ? (
              <Pressable onPress={() => onSearchChange("")} hitSlop={8}>
                <X size={15} color={colors.sage} />
              </Pressable>
            ) : null}
          </Glass>

          {filters.length > 0 ? (
            <Pressable onPress={() => setSheetOpen(true)} accessibilityLabel="Filters">
              <Glass
                variant="small"
                style={{ borderRadius: radii.pill }}
                contentStyle={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
              >
                <SlidersHorizontal size={17} color={colors.ink} />
              </Glass>
              {activeFilterCount > 0 ? (
                <View
                  style={{
                    position: "absolute",
                    top: -3,
                    right: -3,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: colors.ink,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 10, color: colors.surface }}>
                    {activeFilterCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setSheetOpen(false)} />
        <Glass
          variant="regular"
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
          contentStyle={{ padding: 20, paddingBottom: 40, gap: 18 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ flex: 1, fontFamily: fonts.display, fontSize: 20, color: colors.ink }}>Filters</Text>
            {activeFilterCount > 0 ? (
              <Pressable onPress={() => filters.forEach((f) => f.onChange("all"))} hitSlop={8}>
                <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.slate }}>Reset</Text>
              </Pressable>
            ) : null}
          </View>
          {filters.map((filter) => (
            <View key={filter.key} style={{ gap: 8 }}>
              <Text
                style={{
                  fontFamily: fonts.bodyMedium,
                  fontSize: 11,
                  color: colors.sage,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                {filter.title ?? filter.key}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {filter.options.map((option) => {
                  const isCurrent = filter.value === option.value;
                  return (
                    <Pressable
                      key={String(option.value)}
                      onPress={() => filter.onChange(option.value)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 5,
                        paddingVertical: 8,
                        paddingHorizontal: 13,
                        borderRadius: radii.pill,
                        backgroundColor: isCurrent ? colors.ink : colors.hairline,
                      }}
                    >
                      {isCurrent ? <Check size={13} color={colors.surface} /> : null}
                      <Text
                        style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: isCurrent ? colors.surface : colors.slate }}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          <Pressable
            onPress={() => setSheetOpen(false)}
            style={{ marginTop: 4, paddingVertical: 14, borderRadius: radii.pill, backgroundColor: colors.ink, alignItems: "center" }}
          >
            <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.surface }}>Done</Text>
          </Pressable>
        </Glass>
      </Modal>
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
