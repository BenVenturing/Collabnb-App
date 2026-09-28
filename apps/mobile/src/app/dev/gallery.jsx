// Dev-only component gallery — every shared component on one screen with
// static props and zero Convex queries.
//
// This exists because Collabs/Saved/Inbox/Profile don't reliably load, so they
// can't be used to check styling. This screen renders instantly and is immune
// to socket drops. Verify a component here first, then on a real screen.
//
// Route: /dev/gallery

import { ScrollView, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowRight, Map as MapIcon, Star } from "lucide-react-native";
import { colors } from "@/config/theme";
import {
  AtmosphericBackground,
  Body,
  BottomSheet,
  Chip,
  CompactListRow,
  Display,
  EyebrowLabel,
  FormField,
  Glass,
  ListingCard,
  MessageBubble,
  PillButton,
  ProfileHeader,
  SearchBar,
  SectionHeading,
  SegmentedToggle,
  StatGrid,
  StickyActionBar,
} from "@/components/ui";

const CABIN = require("../../../assets/images/bg-clouds-hazy.png");
const LOGO = require("../../../assets/images/collabnb-logo.png");

function Section({ name, children }) {
  return (
    <View style={{ marginBottom: 34 }}>
      <EyebrowLabel style={{ marginBottom: 12 }}>{name}</EyebrowLabel>
      {children}
    </View>
  );
}

export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  const [toggle, setToggle] = useState("earnings");
  const [saved, setSaved] = useState(false);
  const [field, setField] = useState("");

  return (
    <AtmosphericBackground style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingHorizontal: 20,
          paddingBottom: 60,
        }}
      >
        <Display size={30} style={{ marginBottom: 6 }}>
          Component gallery
        </Display>
        <Body size={14} color={colors.sage} style={{ marginBottom: 30 }}>
          Every shared component, no data. Compare against COMPONENT-SPEC.md.
        </Body>

        <Section name="Typography">
          <Display size={30}>Display 30</Display>
          <Display size={22}>Display 22</Display>
          <Body size={15} style={{ marginTop: 6 }}>
            Body 15 — Satoshi regular, 1.6 line height, the default for prose.
          </Body>
          <Body size={13} color={colors.sage}>
            Body 13 sage — captions, locations, sub-lines.
          </Body>
          <EyebrowLabel style={{ marginTop: 10 }}>Eyebrow label</EyebrowLabel>
        </Section>

        <Section name="Section heading">
          <SectionHeading
            title="Trending Now"
            actionLabel="see all"
            subtitle="Top picks this week"
          />
        </Section>

        <Section name="Chips">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Chip label="Treehouse" />
            <Chip label="Glamping" />
            <Chip label="Lodge" active />
            <Chip label="UGC Video" />
            <Chip label="12 Creators" eyebrow />
            <Chip label="Founding member" eyebrow icon={<Star size={12} color={colors.ink} />} />
          </View>
        </Section>

        <Section name="Buttons">
          <View style={{ gap: 12 }}>
            <PillButton label="Apply Now" iconRight={<ArrowRight size={17} color={colors.surface} />} />
            <PillButton label="Map" variant="dark" iconRight={<MapIcon size={17} color={colors.surface} />} />
            <PillButton label="Share Profile" variant="glass" />
            <PillButton label="Loading state" loading />
            <PillButton label="Disabled" disabled />
          </View>
        </Section>

        <Section name="Glass variants">
          <View style={{ gap: 12 }}>
            <Glass variant="regular" contentStyle={{ padding: 18 }}>
              <Body>glass · regular — blur 24, saturate 1.4</Body>
            </Glass>
            <Glass variant="small" contentStyle={{ padding: 18 }}>
              <Body>glass · small — blur 16, saturate 1.3</Body>
            </Glass>
            <Glass variant="card" contentStyle={{ padding: 18 }}>
              <Body>glass · card — near-opaque, the workhorse</Body>
            </Glass>
          </View>
        </Section>

        <Section name="Stat grid">
          <StatGrid
            items={[
              { label: "Collabs", value: "0" },
              { label: "Followers", value: "5.0K" },
              { label: "Profile ER", value: null },
              { label: "Content ER", value: null },
            ]}
            footer="↻ Updated just now"
          />
        </Section>

        <Section name="Stat grid · eyebrow variant">
          <StatGrid
            eyebrowLabels
            columns={2}
            items={[
              { label: "Location", value: null },
              { label: "Dates", value: null },
              { label: "Property", value: null },
              { label: "Deliverables", value: null },
            ]}
          />
        </Section>

        <Section name="Search bar">
          <SearchBar
            segments={[
              { label: "Where", placeholder: "Search destin…" },
              { label: "What", placeholder: "Instagram R" },
              { label: "When", value: "Any time" },
            ]}
          />
        </Section>

        <Section name="Segmented toggle">
          <SegmentedToggle
            value={toggle}
            onChange={setToggle}
            options={[
              { label: "Earnings", value: "earnings" },
              { label: "Applications", value: "applications" },
            ]}
          />
        </Section>

        <Section name="Form field">
          <FormField label="Property name" value={field} onChangeText={setField} placeholder="Property Name" />
        </Section>

        <Section name="Listing card">
          <ListingCard
            image={CABIN}
            title="Glacier Prime Cabin"
            location="Lake Tahoe, CA"
            price="$1,200 + 3-night stay"
            deliverables="6 UGC Reels, 15 Photos, 3 Story Frames"
            dates="Feb—Apr 2026"
            tag="UGC Video"
            authorName="Ben Venturing"
            authorAvatar={LOGO}
            featured
            saved={saved}
            onToggleSave={() => setSaved((s) => !s)}
          />
        </Section>

        <Section name="Compact list row">
          <CompactListRow image={LOGO} title="Glacier Prime Cabin" location="Lake Tahoe, CA" price="$1.2k" />
        </Section>

        <Section name="Message bubble">
          <View style={{ gap: 10 }}>
            <MessageBubble timestamp="06:30 AM">
              Hi! I'm Benjamin, a UGC Pro with 5K followers. I'd love to collaborate.
            </MessageBubble>
            <MessageBubble own={false} timestamp="06:32 AM">
              Sounds great — when are you available?
            </MessageBubble>
          </View>
        </Section>

        <Section name="Profile header">
          <View style={{ marginHorizontal: -20 }}>
            <ProfileHeader
              hero={CABIN}
              avatar={LOGO}
              name="Benjamin Graeff"
              badgeLabel="Founding member"
              handle="@ben.venturing"
              location="Batam Riau Islands Indonesia"
              action={<PillButton label="Share Profile" variant="glass" />}
            />
          </View>
        </Section>

        <Section name="Bottom sheet">
          <View style={{ marginHorizontal: -20 }}>
            <BottomSheet title="1 collab available">
              <CompactListRow image={LOGO} title="Glacier Prime Cabin" location="Lake Tahoe, CA" price="$1.2k" width={280} />
              <CompactListRow image={LOGO} title="Desert Dome Glamping" location="Paphos, Cyprus" price="$850" width={280} />
            </BottomSheet>
          </View>
        </Section>

        <Section name="Sticky action bar">
          <View style={{ marginHorizontal: -20 }}>
            <StickyActionBar
              price="$1,200 + Stay"
              caption="24 deliverables"
              actionLabel="Apply Now"
            />
          </View>
        </Section>
      </ScrollView>
    </AtmosphericBackground>
  );
}
