import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRight } from "lucide-react-native";
import PricingTool from "@/components/PricingTool";
import { colors, fonts } from "@/config/theme";

export default function PricingToolButton({ initialValue, style }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setOpen(true)}
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            padding: 14,
            borderRadius: 16,
            backgroundColor: "rgba(255,255,255,0.62)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.78)",
          },
          style,
        ]}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "rgba(60,87,89,0.1)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontFamily: fonts.displayExtrabold, fontSize: 16, color: colors.slate }}>$</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.ink }}>
            Pricing calculator
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.sage, marginTop: 2 }}>
            See a fair compensation range for your deliverables
          </Text>
        </View>
        <ChevronRight color={colors.sage} size={18} />
      </TouchableOpacity>

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.bone }}>
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: insets.top || 16,
              paddingBottom: 12,
              alignItems: "flex-end",
              borderBottomWidth: 1,
              borderBottomColor: colors.hairline,
            }}
          >
            <TouchableOpacity onPress={() => setOpen(false)}>
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.slate }}>Done</Text>
            </TouchableOpacity>
          </View>
          <PricingTool initialValue={initialValue} />
        </View>
      </Modal>
    </>
  );
}
