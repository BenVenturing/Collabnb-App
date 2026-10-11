import { useState } from "react";
import { View, Pressable, Modal, Share, Linking, Platform } from "react-native";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";
import { Link2, QrCode, MessageCircle, MessageSquare, Share2, Check } from "lucide-react-native";
import { colors, radii, shadows } from "@/config/theme";
import { Body, BottomSheet } from "@/components/ui";

// collabnb.com/profile/:username is public (see the web app's PublicProfile
// route) — the one app URL a signed-out stranger can open, which is what makes
// it safe to put behind a QR code or send to someone who has no account.
export function profileShareUrl(username) {
  return `https://collabnb.com/profile/${username}`;
}

export default function ShareProfileSheet({ visible, onClose, profile }) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const username = profile?.username;
  const url = username ? profileShareUrl(username) : null;
  const name = profile?.full_name || "this creator";
  const blurb = `${name} on Collabnb`;

  const close = () => {
    setShowQR(false);
    setCopied(false);
    onClose?.();
  };

  const copyLink = async () => {
    if (!url) return;
    await Clipboard.setStringAsync(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // Both deep links fall back to the OS sheet rather than failing silently when
  // the app isn't installed — canOpenURL is false for whatsapp:// on a device
  // without WhatsApp, and sms: doesn't exist on a simulator.
  const openDeepLink = async (scheme) => {
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(scheme);
      if (supported) {
        await Linking.openURL(scheme);
        close();
        return;
      }
    } catch {}
    await openSystemSheet();
  };

  const openSystemSheet = async () => {
    if (!url) return;
    // iOS shows `message` and `url` as two separate items; sending only `url`
    // keeps the preview card intact.
    await Share.share(
      Platform.OS === "ios" ? { url, message: blurb } : { message: `${blurb}\n${url}` },
    ).catch(() => {});
    close();
  };

  const message = encodeURIComponent(`${blurb} — ${url}`);

  const actions = [
    {
      key: "copy",
      icon: copied ? Check : Link2,
      label: copied ? "Link copied" : "Copy link",
      onPress: copyLink,
    },
    { key: "qr", icon: QrCode, label: "QR code", onPress: () => setShowQR((v) => !v) },
    {
      key: "whatsapp",
      icon: MessageCircle,
      label: "WhatsApp",
      onPress: () => openDeepLink(`whatsapp://send?text=${message}`),
    },
    {
      key: "imessage",
      icon: MessageSquare,
      label: Platform.OS === "ios" ? "Messages" : "SMS",
      onPress: () => openDeepLink(`sms:&body=${message}`),
    },
    { key: "more", icon: Share2, label: "More options", onPress: openSystemSheet },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable
        style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(25,37,36,0.45)" }}
        onPress={close}
      >
        <Pressable onPress={() => {}}>
          <BottomSheet title="Share profile" horizontal={false}>
            {url ? (
              <Body size={13} color={colors.sage} numberOfLines={1}>
                collabnb.com/profile/{username}
              </Body>
            ) : (
              <Body size={13} color={colors.sage}>
                Pick a username in your profile before sharing.
              </Body>
            )}

            {showQR && url ? (
              <View
                style={{
                  alignSelf: "center",
                  padding: 16,
                  backgroundColor: colors.surface,
                  borderRadius: radii.md,
                  ...shadows.sm,
                }}
              >
                <QRCode value={url} size={200} color={colors.ink} backgroundColor={colors.surface} />
              </View>
            ) : null}

            {actions.map(({ key, icon: Icon, label, onPress }) => (
              <Pressable
                key={key}
                onPress={onPress}
                disabled={!url}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  borderRadius: radii.md,
                  opacity: url ? 1 : 0.4,
                  backgroundColor: pressed ? colors.bone : "transparent",
                })}
              >
                <Icon color={colors.ink} size={20} />
                <Body size={15} weight="medium">
                  {label}
                </Body>
              </Pressable>
            ))}
          </BottomSheet>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
