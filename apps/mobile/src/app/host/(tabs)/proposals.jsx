// ============================================================
// COLLABNB — Proposals CRM (Rebuilt)
// 6-stage pipeline: Invited → Applied → Negotiating →
//                   Confirmed → Live → Completed
// File: /host/(tabs)/proposals.jsx
// ============================================================

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import AtmosphericBackground from "@/components/AtmosphericBackground";
import Glass from "@/components/Glass";
import { colors, fonts, radii, shadows, tracking, track } from "@/config/theme";

const STORAGE_KEY = "@collabnb_proposals_v1";

// ─── Contract negotiation ──────────────────────────────────────
const CONTRACT_FIELDS = [
  { key: "nights", label: "Nights", placeholder: "e.g. 3 nights" },
  {
    key: "compensation",
    label: "Compensation",
    placeholder: "e.g. $500 + 2 nights free",
  },
  {
    key: "deliverables",
    label: "Deliverables",
    placeholder: "e.g. 2 Reels, 4 Stories",
  },
  {
    key: "turnaround",
    label: "Turnaround",
    placeholder: "e.g. 14 days after checkout",
  },
  { key: "affiliate", label: "Affiliate %", placeholder: "e.g. 10%" },
  {
    key: "extra_terms",
    label: "Extra Terms",
    placeholder: "Any additional terms...",
  },
];

function getLatestContractFields(proposal) {
  const history = proposal?.contractHistory;
  if (history?.length) return { ...history[history.length - 1].fields };
  const empty = {};
  CONTRACT_FIELDS.forEach((f) => {
    empty[f.key] = f.key === "deliverables" ? proposal?.deliverables || "" : "";
  });
  return empty;
}

function generateContractHtml(proposal) {
  const fields = getLatestContractFields(proposal);
  const signatures = proposal.signatures || {};
  const rows = CONTRACT_FIELDS.filter((f) => fields[f.key])
    .map(
      (f) =>
        `<tr><td style="font-weight:700;width:140px;padding:10px 14px;border-bottom:1px solid #eee;">${f.label}</td><td style="padding:10px 14px;border-bottom:1px solid #eee;">${fields[f.key]}</td></tr>`,
    )
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Collabnb Contract</title>
<style>body{font-family:Georgia,serif;max-width:680px;margin:48px auto;color:#192524;line-height:1.6}h1{font-size:22px;margin:0 0 4px}p.meta{color:#666;font-size:13px;margin:0 0 32px}table{width:100%;border-collapse:collapse;margin:24px 0}h2{font-size:14px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#666;margin:28px 0 8px}.sig-row{display:flex;gap:40px;margin-top:40px}.sig-box{flex:1;border-top:1px solid #ccc;padding-top:12px}.sig-name{font-size:20px;font-style:italic;margin-bottom:4px}.sig-label{font-size:11px;color:#666}</style></head>
<body>
<h1>Collaboration Agreement</h1>
<p class="meta">${proposal.listing} · ${proposal.creatorName} (${proposal.handle}) · ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
<h2>Terms</h2><table>${rows}</table>
${proposal.contractHistory?.length ? `<p style="font-size:12px;color:#666;margin-top:8px;">Negotiated over ${proposal.contractHistory.length} round${proposal.contractHistory.length > 1 ? "s" : ""}.</p>` : ""}
<h2>Signatures</h2>
<div class="sig-row">
  <div class="sig-box"><div class="sig-name">${signatures.hostSignature || "___________________________"}</div><div class="sig-label">Host · ${signatures.hostSignedAt ? new Date(signatures.hostSignedAt).toLocaleDateString() : "Not yet signed"}</div></div>
  <div class="sig-box"><div class="sig-name">${signatures.creatorSignature || "___________________________"}</div><div class="sig-label">${proposal.creatorName} (Creator) · ${signatures.creatorSignedAt ? new Date(signatures.creatorSignedAt).toLocaleDateString() : "Not yet signed"}</div></div>
</div>
</body></html>`;
}

async function exportContractPdf(proposal) {
  const html = generateContractHtml(proposal);
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Collabnb Contract",
    });
  }
}

// Stage-pipeline colors need 5 visually distinct hues (grey/teal/gold/green/
// purple); only #3C5759 and #959D90 have brand equivalents. The rest have no
// token in the 9-color palette — left as literals per "don't add a new
// color, ask" in STYLE-GUIDE.md. Flagged for design review.
const STAGES = [
  {
    id: "invited",
    label: "Invited",
    emoji: "📨",
    color: colors.sage,
    bg: "rgba(100,107,98,0.15)",
  },
  {
    id: "applied",
    label: "Applied",
    emoji: "✦",
    color: colors.slate,
    bg: "rgba(60,87,89,0.12)",
  },
  {
    id: "negotiating",
    label: "Negotiating",
    emoji: "💬",
    color: "#D4A843", // no brand token — semantic stage gold
    bg: "rgba(212,168,67,0.15)",
  },
  {
    id: "confirmed",
    label: "Confirmed",
    emoji: "✓",
    color: "#4A9B7F", // no brand token — semantic stage green
    bg: "rgba(74,155,127,0.15)",
  },
  {
    id: "live",
    label: "Live",
    emoji: "🎬",
    color: "#7B68C8", // no brand token — semantic stage purple
    bg: "rgba(123,104,200,0.15)",
  },
  {
    id: "completed",
    label: "Completed",
    emoji: "⭐",
    color: "#D4A843", // no brand token — semantic stage gold
    bg: "rgba(212,168,67,0.12)",
  },
];

const ACTIVE_STAGES = STAGES.filter((s) => s.id !== "completed");

const TIER_CONFIG = {
  "UGC Beginner": { color: colors.sage, bg: "rgba(100,107,98,0.12)" },
  "UGC Pro": { color: colors.slate, bg: "rgba(60,87,89,0.12)" },
  "Micro Influencer": { color: "#7B68C8", bg: "rgba(123,104,200,0.12)" }, // no brand token — semantic tier purple
  Influencer: { color: "#C86868", bg: "rgba(200,104,104,0.12)" }, // no brand token — semantic tier red
};

const SAMPLE_PROPOSALS = [
  {
    id: "p1",
    creatorName: "Maya Chen",
    handle: "@mayaexplores",
    tier: "Micro Influencer",
    followers: "28.4k",
    listing: "Treehouse Suite — Summer Escape",
    listingId: "l1",
    stage: "confirmed",
    note: "Loves botanical stays. Confirmed June 14–16.",
    stayDates: "June 14–16",
    deliverables: "2 Reels, 4 Stories, 1 TikTok",
    lastUpdate: "2d ago",
  },
  {
    id: "p2",
    creatorName: "Jordan Ellis",
    handle: "@jordantravels",
    tier: "UGC Pro",
    followers: "12.1k",
    listing: "Cliffside Villa — Weekend Collab",
    listingId: "l2",
    stage: "negotiating",
    note: "Wants to bring a partner. 2 nights vs 3.",
    stayDates: "",
    deliverables: "3 Reels, 6 Stories",
    lastUpdate: "5h ago",
  },
  {
    id: "p3",
    creatorName: "Priya Nair",
    handle: "@priyaframes",
    tier: "Influencer",
    followers: "91k",
    listing: "Treehouse Suite — Summer Escape",
    listingId: "l1",
    stage: "applied",
    note: "",
    stayDates: "",
    deliverables: "",
    lastUpdate: "1d ago",
  },
  {
    id: "p4",
    creatorName: "Sam Kowalski",
    handle: "@samwanders",
    tier: "UGC Beginner",
    followers: "3.2k",
    listing: "Desert Dome — Content Weekend",
    listingId: "l3",
    stage: "invited",
    note: "",
    stayDates: "",
    deliverables: "",
    lastUpdate: "3d ago",
  },
  {
    id: "p5",
    creatorName: "Lena Park",
    handle: "@lenavisuals",
    tier: "UGC Pro",
    followers: "8.7k",
    listing: "Desert Dome — Content Weekend",
    listingId: "l3",
    stage: "live",
    note: "Currently on property. Content due in 5 days.",
    stayDates: "June 8–10",
    deliverables: "2 TikToks, 3 Reels",
    lastUpdate: "12h ago",
  },
  {
    id: "p6",
    creatorName: "Alex Rivers",
    handle: "@alexroams",
    tier: "Micro Influencer",
    followers: "19.2k",
    listing: "Desert Dome — Content Weekend",
    listingId: "l3",
    stage: "completed",
    note: "Great collab. Very professional.",
    stayDates: "May 20–22",
    deliverables: "1 YouTube, 2 Reels, 5 Stories",
    lastUpdate: "3w ago",
    rating: 5,
    contentUrl: "https://instagram.com/alexroams",
  },
];

// ─── SUB-COMPONENTS ──────────────────────────────────────────
function Avatar({ name, size = 38 }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.35 }]}>
        {initials}
      </Text>
    </View>
  );
}

function TierBadge({ tier }) {
  const c = TIER_CONFIG[tier] || TIER_CONFIG["UGC Beginner"];
  return (
    <View style={[styles.tierBadge, { backgroundColor: c.bg }]}>
      <Text style={[styles.tierText, { color: c.color }]}>{tier}</Text>
    </View>
  );
}

function ProposalCard({ proposal, onPress }) {
  return (
    <TouchableOpacity
      style={styles.proposalCardShadow}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Glass variant="small" contentStyle={styles.proposalCardContent}>
        <View style={styles.cardTop}>
          <Avatar name={proposal.creatorName} />
          <View style={{ flex: 1, marginLeft: 9 }}>
            <Text style={styles.cardName} numberOfLines={1}>
              {proposal.creatorName}
            </Text>
            <Text style={styles.cardHandle}>{proposal.handle}</Text>
          </View>
          <Text style={styles.cardTime}>{proposal.lastUpdate}</Text>
        </View>
        <Text style={styles.cardListing} numberOfLines={2}>
          {proposal.listing}
        </Text>
        <View style={styles.cardFooter}>
          <TierBadge tier={proposal.tier} />
          {proposal.isCounter && (
            <View style={styles.counterBadge}>
              <Text style={styles.counterBadgeText}>🔄 Counter</Text>
            </View>
          )}
          <Text style={styles.cardFollowers}>👥 {proposal.followers}</Text>
        </View>
        {!!proposal.note && (
          <View style={styles.notePreview}>
            <Text style={styles.notePreviewText} numberOfLines={2}>
              📝 {proposal.note}
            </Text>
          </View>
        )}
        {!!proposal.stayDates && (
          <Text style={styles.datesText}>📅 {proposal.stayDates}</Text>
        )}
      </Glass>
    </TouchableOpacity>
  );
}

function ArchiveCard({ proposal, onPress }) {
  return (
    <TouchableOpacity
      style={styles.archiveCardShadow}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Glass variant="small" contentStyle={styles.archiveCardContent}>
        <View style={styles.cardTop}>
          <Avatar name={proposal.creatorName} size={34} />
          <View style={{ flex: 1, marginLeft: 9 }}>
            <Text style={styles.cardName}>{proposal.creatorName}</Text>
            <Text style={styles.cardHandle}>{proposal.handle}</Text>
          </View>
          {proposal.rating && (
            <Text style={styles.rating}>{"★".repeat(proposal.rating)}</Text>
          )}
        </View>
        <Text style={styles.cardListing} numberOfLines={1}>
          {proposal.listing}
        </Text>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 6,
          }}
        >
          <Text style={styles.archiveSub}>📅 {proposal.stayDates}</Text>
          {!!proposal.contentUrl && (
            <Text style={styles.archiveLink}>View Content ↗</Text>
          )}
        </View>
      </Glass>
    </TouchableOpacity>
  );
}

// ─── CONTRACT HISTORY ────────────────────────────────────────
function ContractHistoryTimeline({ history }) {
  if (!history?.length) return null;
  const last = history[history.length - 1];
  return (
    <View style={styles.historyWrap}>
      <Text style={styles.modalLabel}>NEGOTIATION HISTORY</Text>
      <View style={styles.historyRow}>
        <View style={styles.historyPill}>
          <Text style={styles.historyPillText}>Creator pitch</Text>
        </View>
        {history.map((entry, i) => (
          <React.Fragment key={i}>
            <Text style={styles.historyArrow}>→</Text>
            <View
              style={[
                styles.historyPill,
                entry.modifiedBy === "host"
                  ? styles.historyPillHost
                  : styles.historyPillCreator,
              ]}
            >
              <Text
                style={[
                  styles.historyPillText,
                  entry.modifiedBy === "host"
                    ? styles.historyPillTextHost
                    : styles.historyPillTextCreator,
                ]}
              >
                {entry.modifiedBy === "host" ? "Host" : "Creator"} v
                {entry.version}
                {i === history.length - 1 ? " · latest" : ""}
              </Text>
            </View>
          </React.Fragment>
        ))}
      </View>
      {!!last?.note && <Text style={styles.historyNote}>"{last.note}"</Text>}
    </View>
  );
}

// ─── COUNTER OFFER MODAL ─────────────────────────────────────
function CounterOfferModal({ proposal, visible, onSend, onClose }) {
  const [fields, setFields] = useState({});
  const [note, setNote] = useState("");

  useEffect(() => {
    if (proposal) {
      setFields(getLatestContractFields(proposal));
      setNote("");
    }
  }, [proposal]);

  if (!proposal) return null;
  const version = (proposal.contractHistory?.length ?? 0) + 1;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.sheetOverlay}>
        <View style={styles.sheetCard}>
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>Negotiate terms</Text>
              <Text style={styles.sheetSub}>
                {proposal.creatorName} · {proposal.listing} · round {version}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.sheetClose}>
              <Text style={styles.sheetCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={{ maxHeight: 420 }}
            showsVerticalScrollIndicator={false}
          >
            {CONTRACT_FIELDS.map((f) => (
              <View key={f.key} style={{ marginBottom: 12 }}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={fields[f.key] || ""}
                  onChangeText={(v) =>
                    setFields((prev) => ({ ...prev, [f.key]: v }))
                  }
                  placeholder={f.placeholder}
                  placeholderTextColor={colors.sage}
                />
              </View>
            ))}
            <Text style={styles.fieldLabel}>Note</Text>
            <TextInput
              style={[styles.fieldInput, { minHeight: 60 }]}
              value={note}
              onChangeText={setNote}
              placeholder="Explain what changed and why..."
              placeholderTextColor={colors.sage}
              multiline
              textAlignVertical="top"
            />
          </ScrollView>
          <View style={styles.sheetActions}>
            <TouchableOpacity style={styles.sheetCancelBtn} onPress={onClose}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetSendBtn}
              onPress={() => onSend(proposal.id, fields, note)}
            >
              <Text style={styles.sheetSendText}>Send counter-offer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── SIGN CONTRACT MODAL ──────────────────────────────────────
function SignContractModal({ proposal, visible, onSign, onClose }) {
  const [name, setName] = useState("");
  if (!proposal) return null;
  const fields = getLatestContractFields(proposal);
  const roundCount = proposal.contractHistory?.length ?? 0;
  const ready = name.trim().length >= 2;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.sheetOverlay}>
        <View style={styles.sheetCard}>
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>Sign contract</Text>
              <Text style={styles.sheetSub}>Signing as Host</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.sheetClose}>
              <Text style={styles.sheetCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.signTermsCardShadow}>
            <Glass variant="small" contentStyle={styles.signTermsCardContent}>
              <Text style={styles.modalLabel}>CONTRACT TERMS</Text>
              {CONTRACT_FIELDS.filter((f) => fields[f.key]).map((f) => (
                <View key={f.key} style={styles.signTermRow}>
                  <Text style={styles.signTermLabel}>{f.label}</Text>
                  <Text style={styles.signTermValue}>{fields[f.key]}</Text>
                </View>
              ))}
              {roundCount > 0 && (
                <Text style={styles.signRoundsNote}>
                  Terms finalized after {roundCount} negotiation round
                  {roundCount > 1 ? "s" : ""}.
                </Text>
              )}
            </Glass>
          </View>
          <Text style={styles.signAgreementText}>
            By typing your name below, you agree to the terms above as a
            binding e-signature.
          </Text>
          <Text style={styles.fieldLabel}>Your name</Text>
          <TextInput
            style={styles.signNameInput}
            value={name}
            onChangeText={setName}
            placeholder="Type your full name"
            placeholderTextColor={colors.sage}
          />
          <View style={styles.sheetActions}>
            <TouchableOpacity style={styles.sheetCancelBtn} onPress={onClose}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sheetSignBtn, !ready && { opacity: 0.5 }]}
              disabled={!ready}
              onPress={() => onSign(proposal.id, name.trim())}
            >
              <Text style={styles.sheetSendText}>✎ Sign</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── DETAIL MODAL ────────────────────────────────────────────
function DetailModal({
  proposal,
  visible,
  onClose,
  onStageChange,
  onSave,
  onOpenCounter,
  onOpenSign,
  onExportPdf,
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [stayDates, setStayDates] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (proposal) {
      setNote(proposal.note || "");
      setStayDates(proposal.stayDates || "");
      setDeliverables(proposal.deliverables || "");
    }
  }, [proposal]);

  if (!proposal) return null;

  const currentStage = STAGES.find((s) => s.id === proposal.stage);

  const handleSave = async () => {
    setSaving(true);
    await onSave(proposal.id, { note, stayDates, deliverables });
    setSaving(false);
  };

  const handleMessage = () => {
    // Inbox and message threads are Convex-backed (see useConversations /
    // messages/[threadId].jsx); MessagingStore is a separate local mock that
    // never reaches them, and threads.create isn't idempotent, so we can't
    // safely open/create a specific thread from here yet. Land on the inbox
    // list instead of a broken or duplicate thread.
    router.push("/host/(tabs)/inbox");
  };

  const handleDecline = async () => {
    await onStageChange(proposal.id, "declined");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalSafe}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalDone}>Done</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Proposal Detail</Text>
          <View style={{ width: 48 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.modalContent}
        >
          {/* Creator card */}
          <View style={styles.modalCreatorCardShadow}>
            <Glass variant="small" contentStyle={styles.modalCreatorCardContent}>
              <Avatar name={proposal.creatorName} size={54} />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.modalCreatorName}>
                  {proposal.creatorName}
                </Text>
                <Text style={styles.modalHandle}>{proposal.handle}</Text>
                <View style={styles.modalBadges}>
                  <TierBadge tier={proposal.tier} />
                  <View style={styles.followerBadge}>
                    <Text style={styles.followerText}>
                      👥 {proposal.followers}
                    </Text>
                  </View>
                </View>
              </View>
            </Glass>
          </View>

          {/* Listing */}
          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>LISTING</Text>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/listing-detail",
                  params: { id: proposal.listingId, isHost: "true" },
                })
              }
              activeOpacity={0.8}
              style={styles.infoCardShadow}
            >
              <Glass variant="small" contentStyle={styles.infoCardContent}>
                <Text style={{ fontSize: 18 }}>🏡</Text>
                <Text style={styles.infoCardText}>{proposal.listing}</Text>
              </Glass>
            </TouchableOpacity>
          </View>

          {/* Current stage */}
          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>CURRENT STAGE</Text>
            <View
              style={[
                styles.currentStagePill,
                { backgroundColor: currentStage?.bg },
              ]}
            >
              <Text style={{ fontSize: 16 }}>{currentStage?.emoji}</Text>
              <Text
                style={[
                  styles.currentStageText,
                  { color: currentStage?.color },
                ]}
              >
                {currentStage?.label}
              </Text>
            </View>
          </View>

          {/* Move stage */}
          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>MOVE TO STAGE</Text>
            <View style={styles.stageGrid}>
              {STAGES.filter((s) => s.id !== proposal.stage).map((stage) => (
                <TouchableOpacity
                  key={stage.id}
                  style={[styles.stageBtn, { borderColor: stage.color }]}
                  onPress={() => onStageChange(proposal.id, stage.id)}
                >
                  <Text>{stage.emoji}</Text>
                  <Text style={[styles.stageBtnText, { color: stage.color }]}>
                    {stage.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Contract */}
          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>CONTRACT</Text>
            <ContractHistoryTimeline history={proposal.contractHistory} />
            <View style={styles.contractActionsRow}>
              <TouchableOpacity
                style={styles.contractActionBtnShadow}
                onPress={() => onOpenCounter(proposal)}
              >
                <Glass variant="small" contentStyle={styles.contractActionBtnContent}>
                  <Text style={styles.contractActionText}>🔄 Negotiate</Text>
                </Glass>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.contractActionBtnShadow}
                onPress={() => onOpenSign(proposal)}
              >
                <Glass variant="small" contentStyle={styles.contractActionBtnContent}>
                  <Text style={styles.contractActionText}>
                    {proposal.signatures?.hostSignedAt ? "✓ Signed" : "✎ Sign"}
                  </Text>
                </Glass>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.contractActionBtnShadow}
                onPress={() => onExportPdf(proposal)}
              >
                <Glass variant="small" contentStyle={styles.contractActionBtnContent}>
                  <Text style={styles.contractActionText}>⬇ PDF</Text>
                </Glass>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stay dates */}
          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>STAY DATES</Text>
            <View style={styles.inputCardShadow}>
              <Glass variant="small" contentStyle={styles.inputCardContent}>
                <TextInput
                  style={styles.inputField}
                  value={stayDates}
                  onChangeText={setStayDates}
                  placeholder="e.g. June 14–16"
                  placeholderTextColor={colors.sage}
                />
              </Glass>
            </View>
          </View>

          {/* Deliverables */}
          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>DELIVERABLES AGREED</Text>
            <View style={styles.inputCardShadow}>
              <Glass variant="small" contentStyle={styles.inputCardContent}>
                <TextInput
                  style={styles.inputField}
                  value={deliverables}
                  onChangeText={setDeliverables}
                  placeholder="e.g. 2 Reels, 4 Stories, 1 TikTok"
                  placeholderTextColor={colors.sage}
                />
              </Glass>
            </View>
          </View>

          {/* Notes */}
          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>NEGOTIATION NOTES</Text>
            <View style={styles.noteCardShadow}>
              <Glass variant="small" contentStyle={styles.noteCardContent}>
                <TextInput
                  style={styles.noteInput}
                  value={note}
                  onChangeText={setNote}
                  multiline
                  placeholder="Add notes, follow-ups, negotiation history..."
                  placeholderTextColor={colors.sage}
                  textAlignVertical="top"
                />
              </Glass>
            </View>
          </View>

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>
              {saving ? "Saving…" : "Save Changes"}
            </Text>
          </TouchableOpacity>

          {/* Actions */}
          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>QUICK ACTIONS</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionPrimary}
                onPress={handleMessage}
              >
                <Text style={styles.actionPrimaryText}>💬 Message</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionDanger}
                onPress={handleDecline}
              >
                <Text style={styles.actionDangerText}>✕ Decline</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────
export default function ProposalsScreen() {
  const router = useRouter();
  const [proposals, setProposals] = useState(SAMPLE_PROPOSALS);
  const [selected, setSelected] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [view, setView] = useState("pipeline");
  const [tierFilter, setTierFilter] = useState("all");
  const [declinedOpen, setDeclinedOpen] = useState(false);
  const [counterTarget, setCounterTarget] = useState(null);
  const [signTarget, setSignTarget] = useState(null);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(STORAGE_KEY)
        .then((s) => {
          if (s) setProposals(JSON.parse(s));
        })
        .catch(() => {});
    }, []),
  );

  const persist = async (updated) => {
    setProposals(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
  };

  const handleStageChange = async (id, newStage) => {
    const updated = proposals.map((p) =>
      p.id === id ? { ...p, stage: newStage, lastUpdate: "just now" } : p,
    );
    await persist(updated);
    setSelected((prev) => (prev ? { ...prev, stage: newStage } : prev));
  };

  const handleSave = async (id, fields) => {
    const updated = proposals.map((p) =>
      p.id === id ? { ...p, ...fields } : p,
    );
    await persist(updated);
    setSelected((prev) => (prev ? { ...prev, ...fields } : prev));
  };

  const STAGE_ORDER = ["invited", "applied", "negotiating", "confirmed", "live"];

  const handleCounterSend = async (id, fields, note) => {
    const updated = proposals.map((p) => {
      if (p.id !== id) return p;
      const history = p.contractHistory || [];
      const nextHistory = [
        ...history,
        { version: history.length + 1, modifiedBy: "host", fields, note },
      ];
      const curIdx = STAGE_ORDER.indexOf(p.stage);
      const negotiatingIdx = STAGE_ORDER.indexOf("negotiating");
      const nextStage =
        curIdx >= 0 && curIdx < negotiatingIdx ? "negotiating" : p.stage;
      return {
        ...p,
        contractHistory: nextHistory,
        stage: nextStage,
        lastUpdate: "just now",
      };
    });
    await persist(updated);
    setSelected((prev) =>
      prev ? updated.find((p) => p.id === prev.id) : prev,
    );
    setCounterTarget(null);
  };

  const handleSign = async (id, name) => {
    const updated = proposals.map((p) => {
      if (p.id !== id) return p;
      const signatures = {
        ...(p.signatures || {}),
        hostSignature: name,
        hostSignedAt: new Date().toISOString(),
      };
      const locked = !!(signatures.hostSignature && signatures.creatorSignature);
      return { ...p, signatures, locked, lastUpdate: "just now" };
    });
    await persist(updated);
    setSelected((prev) =>
      prev ? updated.find((p) => p.id === prev.id) : prev,
    );
    setSignTarget(null);
  };

  const handleExportPdf = async (proposal) => {
    try {
      await exportContractPdf(proposal);
    } catch (error) {
      console.error("Failed to export contract PDF:", error);
    }
  };

  const filtered =
    tierFilter === "all"
      ? proposals
      : proposals.filter((p) => p.tier === tierFilter);
  const active = filtered.filter(
    (p) => p.stage !== "completed" && p.stage !== "declined",
  );
  const archived = filtered.filter((p) => p.stage === "completed");
  const declined = filtered.filter((p) => p.stage === "declined");
  const byStage = (id) => active.filter((p) => p.stage === id);

  const TIERS = [
    "all",
    "UGC Beginner",
    "UGC Pro",
    "Micro Influencer",
    "Influencer",
  ];

  return (
    <AtmosphericBackground>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Proposals</Text>
            <Text style={styles.headerSub}>
              {active.length} active · {byStage("confirmed").length} confirmed ·{" "}
              {byStage("live").length} live
            </Text>
          </View>
          <TouchableOpacity
            style={styles.inviteBtn}
            onPress={() => router.push("/host/(tabs)/creators")}
          >
            <Text style={styles.inviteBtnText}>+ Invite</Text>
          </TouchableOpacity>
        </View>

        {/* Toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              view === "pipeline" && styles.toggleBtnActive,
            ]}
            onPress={() => setView("pipeline")}
          >
            <Text
              style={[
                styles.toggleBtnText,
                view === "pipeline" && styles.toggleBtnTextActive,
              ]}
            >
              Pipeline
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              view === "archive" && styles.toggleBtnActive,
            ]}
            onPress={() => setView("archive")}
          >
            <Text
              style={[
                styles.toggleBtnText,
                view === "archive" && styles.toggleBtnTextActive,
              ]}
            >
              Completed ({archived.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tier Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterContent}
        >
          {TIERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip,
                tierFilter === f && styles.filterChipActive,
              ]}
              onPress={() => setTierFilter(f)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  tierFilter === f && styles.filterChipTextActive,
                ]}
              >
                {f === "all" ? "All Tiers" : f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Pipeline */}
        {view === "pipeline" && (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.board}
            >
              {ACTIVE_STAGES.map((stage) => {
                const cards = byStage(stage.id);
                return (
                  <View key={stage.id} style={styles.pipelineCol}>
                    <View
                      style={[styles.colHeader, { backgroundColor: stage.bg }]}
                    >
                      <Text>{stage.emoji}</Text>
                      <Text style={[styles.colLabel, { color: stage.color }]}>
                        {stage.label}
                      </Text>
                      <View
                        style={[
                          styles.colCount,
                          { backgroundColor: stage.color },
                        ]}
                      >
                        <Text style={styles.colCountText}>{cards.length}</Text>
                      </View>
                    </View>
                    {cards.length === 0 ? (
                      <Text style={styles.emptyColText}>None here</Text>
                    ) : (
                      cards.map((p) => (
                        <ProposalCard
                          key={p.id}
                          proposal={p}
                          onPress={() => {
                            setSelected(p);
                            setModalVisible(true);
                          }}
                        />
                      ))
                    )}
                  </View>
                );
              })}
            </ScrollView>

            {/* Declined — kept out of the pipeline columns, tucked below */}
            {declined.length > 0 && (
              <View style={styles.declinedSection}>
                <TouchableOpacity
                  style={styles.declinedHeader}
                  onPress={() => setDeclinedOpen((v) => !v)}
                >
                  <Text style={styles.declinedHeaderText}>
                    {declinedOpen ? "▾" : "▸"} Declined ({declined.length})
                  </Text>
                </TouchableOpacity>
                {declinedOpen &&
                  declined.map((p) => (
                    <ProposalCard
                      key={p.id}
                      proposal={p}
                      onPress={() => {
                        setSelected(p);
                        setModalVisible(true);
                      }}
                    />
                  ))}
              </View>
            )}
          </>
        )}

        {/* Archive */}
        {view === "archive" && (
          <ScrollView contentContainerStyle={styles.archiveList}>
            {archived.length === 0 ? (
              <View style={styles.emptyArchive}>
                <Text style={styles.emptyArchiveIcon}>⭐</Text>
                <Text style={styles.emptyArchiveText}>
                  No completed collabs yet
                </Text>
              </View>
            ) : (
              archived.map((p) => (
                <ArchiveCard
                  key={p.id}
                  proposal={p}
                  onPress={() => {
                    setSelected(p);
                    setModalVisible(true);
                  }}
                />
              ))
            )}
          </ScrollView>
        )}

        <DetailModal
          proposal={selected}
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onStageChange={handleStageChange}
          onSave={handleSave}
          onOpenCounter={setCounterTarget}
          onOpenSign={setSignTarget}
          onExportPdf={handleExportPdf}
        />

        <CounterOfferModal
          proposal={counterTarget}
          visible={!!counterTarget}
          onSend={handleCounterSend}
          onClose={() => setCounterTarget(null)}
        />

        <SignContractModal
          proposal={signTarget}
          visible={!!signTarget}
          onSign={handleSign}
          onClose={() => setSignTarget(null)}
        />
      </SafeAreaView>
    </AtmosphericBackground>
  );
}

// ─── STYLES ──────────────────────────────────────────────────
// All GLASS-style surfaces in this file share one radius (16 = radii.md),
// which is exactly glass.small's radius — every ...GLASS site below is
// wrapped in <Glass variant="small"> with the shadow moved to an outer node
// (Glass's own View sets overflow:"hidden", which would clip an RN shadow
// drawn on the same layer).
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontFamily: fonts.displayExtrabold,
    fontSize: 28,
    color: colors.ink,
    letterSpacing: track(28, tracking.display),
  },
  headerSub: { fontFamily: fonts.body, fontSize: 12, color: colors.sage, marginTop: 3 },
  inviteBtn: {
    backgroundColor: colors.slate,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 4,
  },
  inviteBtnText: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.bone },

  viewToggle: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.45)",
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.75)",
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 11,
    alignItems: "center",
  },
  toggleBtnActive: { backgroundColor: colors.slate },
  toggleBtnText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.sage },
  toggleBtnTextActive: { fontFamily: fonts.bodySemibold, color: colors.bone },

  filterRow: { maxHeight: 40, marginBottom: 6 },
  filterContent: { paddingHorizontal: 20, gap: 8, alignItems: "center" },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderWidth: 1,
    borderColor: "rgba(60,87,89,0.15)",
  },
  filterChipActive: { backgroundColor: colors.slate, borderColor: colors.slate },
  filterChipText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.slate },
  filterChipTextActive: { color: colors.bone },

  board: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
    alignItems: "flex-start",
  },
  pipelineCol: { width: 210 },
  colHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 10,
  },
  colLabel: { fontFamily: fonts.bodySemibold, fontSize: 12, flex: 1 },
  colCount: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  colCountText: { fontFamily: fonts.bodySemibold, fontSize: 10, color: colors.surface },
  emptyColText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.stone,
    textAlign: "center",
    paddingVertical: 20,
  },

  proposalCardShadow: { ...shadows.sm, borderRadius: radii.md, marginBottom: 10 },
  proposalCardContent: { padding: 13 },
  cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  cardName: { fontFamily: fonts.bodySemibold, fontSize: 13, color: colors.ink },
  cardHandle: { fontFamily: fonts.body, fontSize: 11, color: colors.sage },
  cardTime: { fontFamily: fonts.body, fontSize: 10, color: colors.stone },
  cardListing: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.slate,
    marginBottom: 8,
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardFollowers: { fontFamily: fonts.body, fontSize: 11, color: colors.sage },
  notePreview: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(60,87,89,0.07)",
  },
  notePreviewText: { fontFamily: fonts.body, fontSize: 11, color: colors.sage, lineHeight: 16 },
  datesText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: "#4A9B7F", // no brand token — matches "confirmed" stage green
    marginTop: 6,
  },

  avatar: {
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.7)",
  },
  avatarText: { fontFamily: fonts.bodySemibold, color: colors.slate },
  tierBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7 },
  tierText: { fontFamily: fonts.bodySemibold, fontSize: 10 },

  declinedSection: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16 },
  declinedHeader: { paddingVertical: 10 },
  declinedHeaderText: { fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.sage },

  archiveList: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  archiveCardShadow: { ...shadows.sm, borderRadius: radii.md, marginBottom: 10 },
  archiveCardContent: { padding: 14 },
  archiveSub: { fontFamily: fonts.body, fontSize: 11, color: colors.sage },
  archiveLink: { fontFamily: fonts.bodyMedium, fontSize: 11, color: "#7B68C8" }, // no brand token — matches "live" stage / micro-influencer tier purple
  rating: { fontSize: 13, color: "#D4A843" }, // no brand token — matches "completed" stage gold
  emptyArchive: { alignItems: "center", paddingTop: 60 },
  emptyArchiveIcon: { fontSize: 36, marginBottom: 10 },
  emptyArchiveText: { fontFamily: fonts.body, fontSize: 14, color: colors.sage },

  modalSafe: { flex: 1, backgroundColor: colors.bone },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(60,87,89,0.08)",
  },
  modalDone: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.slate },
  modalTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.ink,
    letterSpacing: track(16, tracking.display),
  },
  modalContent: { paddingHorizontal: 20 },
  modalCreatorCardShadow: { ...shadows.sm, borderRadius: radii.md, marginTop: 16 },
  modalCreatorCardContent: { flexDirection: "row", alignItems: "flex-start", padding: 16 },
  modalCreatorName: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.ink,
    letterSpacing: track(18, tracking.display),
  },
  modalHandle: { fontFamily: fonts.body, fontSize: 13, color: colors.sage, marginTop: 2 },
  modalBadges: { flexDirection: "row", gap: 7, marginTop: 8, flexWrap: "wrap" },
  followerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "rgba(25,37,36,0.07)",
  },
  followerText: { fontFamily: fonts.body, fontSize: 11, color: colors.slate },
  modalSection: { marginTop: 22 },
  modalLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 10,
    color: colors.sage,
    letterSpacing: track(10, tracking.eyebrow),
    marginBottom: 10,
  },
  infoCardShadow: { ...shadows.sm, borderRadius: radii.md },
  infoCardContent: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  infoCardText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink, flex: 1 },
  currentStagePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  currentStageText: { fontFamily: fonts.bodySemibold, fontSize: 15 },
  stageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  stageBtnText: { fontFamily: fonts.bodyMedium, fontSize: 12 },

  // Contract history
  historyWrap: { marginBottom: 10 },
  historyRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
  historyArrow: { color: colors.stone, fontSize: 11, marginHorizontal: 3 },
  historyPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: "rgba(25,37,36,0.06)",
    marginVertical: 2,
  },
  historyPillHost: { backgroundColor: "rgba(123,104,200,0.1)" },
  historyPillCreator: { backgroundColor: "rgba(74,155,127,0.1)" },
  historyPillText: { fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.sage },
  historyPillTextHost: { color: "#5b4db8" }, // no brand token — darker text-on-tint variant of the "live" stage purple
  historyPillTextCreator: { color: "#2d7d5e" }, // no brand token — darker text-on-tint variant of the "confirmed" stage green
  historyNote: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.slate,
    fontStyle: "italic",
    marginTop: 7,
  },

  // Contract quick actions (within detail modal)
  contractActionsRow: { flexDirection: "row", gap: 8 },
  contractActionBtnShadow: { flex: 1, ...shadows.sm, borderRadius: radii.md },
  contractActionBtnContent: { paddingVertical: 10, alignItems: "center" },
  contractActionText: { fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.ink },

  // Bottom-sheet modals shared by Negotiate/Sign
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(25,37,36,0.5)",
    justifyContent: "flex-end",
  },
  sheetCard: {
    backgroundColor: colors.bone,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    maxHeight: "88%",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.ink,
    letterSpacing: track(17, tracking.display),
  },
  sheetSub: { fontFamily: fonts.body, fontSize: 12, color: colors.sage, marginTop: 3 },
  sheetClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(25,37,36,0.07)",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCloseText: { fontSize: 13, color: colors.slate },
  fieldLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 10,
    color: colors.sage,
    letterSpacing: track(10, tracking.label),
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: "rgba(25,37,36,0.12)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
  },
  sheetActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  sheetCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: "rgba(25,37,36,0.15)",
    alignItems: "center",
  },
  sheetCancelText: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.slate },
  sheetSendBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 9999,
    backgroundColor: colors.ink,
    alignItems: "center",
  },
  sheetSignBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 9999,
    backgroundColor: "#4A9B7F", // no brand token — matches "confirmed" stage green
    alignItems: "center",
  },
  sheetSendText: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.surface },

  // Sign modal contract summary
  signTermsCardShadow: { ...shadows.sm, borderRadius: radii.md, marginBottom: 14 },
  signTermsCardContent: { padding: 14 },
  signTermRow: { flexDirection: "row", gap: 8, marginBottom: 5 },
  signTermLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.sage, minWidth: 100 },
  signTermValue: { fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.ink, flex: 1 },
  signRoundsNote: { fontFamily: fonts.body, fontSize: 11, color: colors.sage, marginTop: 8 },
  signAgreementText: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.slate,
    lineHeight: 18,
    marginBottom: 14,
  },
  signNameInput: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: "rgba(25,37,36,0.12)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontStyle: "italic",
    color: colors.ink,
  },

  inputCardShadow: { ...shadows.sm, borderRadius: radii.md },
  inputCardContent: { padding: 14 },
  inputField: { fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  noteCardShadow: { ...shadows.sm, borderRadius: radii.md },
  noteCardContent: { padding: 14 },
  noteInput: { fontFamily: fonts.body, fontSize: 14, color: colors.ink, minHeight: 80, lineHeight: 21 },
  saveBtn: {
    backgroundColor: colors.slate,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 20,
  },
  saveBtnText: { fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.bone },
  actionRow: { flexDirection: "row", gap: 10 },
  actionPrimary: {
    flex: 1,
    backgroundColor: colors.slate,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
  },
  actionPrimaryText: { fontFamily: fonts.bodySemibold, fontSize: 14, color: colors.bone },
  actionDanger: {
    flex: 1,
    backgroundColor: "rgba(200,104,104,0.1)",
    borderWidth: 1,
    borderColor: "rgba(200,104,104,0.25)",
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
  },
  actionDangerText: { fontFamily: fonts.bodySemibold, fontSize: 14, color: "#C86868" }, // no brand token — semantic danger red
});
