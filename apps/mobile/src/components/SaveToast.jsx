import { useEffect, useRef, useState } from "react";
import { View, Pressable, Animated, Modal, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Heart, Plus, Check } from "lucide-react-native";
import { colors, radii, shadows } from "@/config/theme";
import { Body, BottomSheet } from "@/components/ui";
import useSaveToastStore from "@/utils/SaveToastStore";
import useSavedCollections from "@/hooks/useSavedCollections";

const TOAST_MS = 4000;

// Mounted once at the root. Every heart in the app writes through
// useSavedCollections, which pushes to SaveToastStore, so this is the single
// place the confirmation and the list picker live.
export default function SaveToast() {
  const insets = useSafeAreaInsets();
  const toast = useSaveToastStore((st) => st.toast);
  const hideToast = useSaveToastStore((st) => st.hideToast);
  const openPicker = useSaveToastStore((st) => st.openPicker);
  const pickerListingId = useSaveToastStore((st) => st.pickerListingId);
  const closePicker = useSaveToastStore((st) => st.closePicker);
  const loadLastList = useSaveToastStore((st) => st.loadLastList);

  const slide = useRef(new Animated.Value(120)).current;

  useEffect(() => {
    loadLastList();
  }, [loadLastList]);

  useEffect(() => {
    if (!toast) return;

    Animated.spring(slide, {
      toValue: 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(slide, {
        toValue: 120,
        duration: 180,
        useNativeDriver: true,
      }).start(() => hideToast());
    }, TOAST_MS);

    return () => clearTimeout(timer);
  }, [toast, slide, hideToast]);

  return (
    <>
      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            // Clears the tab bar, which the toast would otherwise sit under.
            bottom: insets.bottom + 72,
            transform: [{ translateY: slide }],
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              backgroundColor: colors.ink,
              borderRadius: radii.lg,
              paddingVertical: 14,
              paddingHorizontal: 16,
              ...shadows.lg,
            }}
          >
            <Heart
              color={colors.surface}
              fill={toast.saved ? colors.surface : "transparent"}
              size={18}
            />
            <Body size={14} color={colors.surface} style={{ flex: 1 }}>
              {toast.saved ? `Saved to ${toast.listName}` : `Removed from ${toast.listName}`}
            </Body>
            {toast.saved ? (
              <Pressable onPress={() => openPicker(toast.listingId)} hitSlop={8}>
                <Body
                  size={14}
                  weight="semibold"
                  color={colors.surface}
                  style={{ textDecorationLine: "underline" }}
                >
                  Change
                </Body>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      ) : null}

      <Modal
        visible={!!pickerListingId}
        animationType="slide"
        transparent
        onRequestClose={closePicker}
      >
        <Pressable
          style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(25,37,36,0.45)" }}
          onPress={closePicker}
        >
          <Pressable onPress={() => {}}>
            <ListPicker listingId={pickerListingId} onDone={closePicker} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function ListPicker({ listingId, onDone }) {
  const { collections, createList, moveToListing } = useSavedCollections();
  const rememberList = useSaveToastStore((st) => st.rememberList);
  const showToast = useSaveToastStore((st) => st.showToast);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const currentId = collections.find((c) => c.listing_ids.includes(String(listingId)))?._id;

  const moveTo = async (collection) => {
    if (busy || String(collection._id) === String(currentId)) {
      onDone();
      return;
    }
    setBusy(true);
    try {
      await moveToListing(listingId, String(collection._id));
      await rememberList(String(collection._id));
      showToast({
        listingId: String(listingId),
        listId: String(collection._id),
        listName: collection.name,
        saved: true,
      });
    } finally {
      setBusy(false);
      onDone();
    }
  };

  const createAndMove = async () => {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const newId = await createList(trimmed);
      // moveToListing clears the listing from this user's other lists, so it
      // can't end up in two at once the way two separate toggles allow.
      await moveToListing(listingId, String(newId));
      await rememberList(String(newId));
      showToast({
        listingId: String(listingId),
        listId: String(newId),
        listName: trimmed,
        saved: true,
      });
    } finally {
      setBusy(false);
      setCreating(false);
      setName("");
      onDone();
    }
  };

  return (
    <BottomSheet title="Save to list" horizontal={false}>
      {collections.map((collection) => {
        const selected = String(collection._id) === String(currentId);
        return (
          <Pressable
            key={String(collection._id)}
            onPress={() => moveTo(collection)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: radii.md,
              backgroundColor: selected ? colors.stone : colors.surface,
            }}
          >
            <Body size={15} style={{ flex: 1 }}>
              {collection.name}
            </Body>
            <Body size={13} color={colors.sage}>
              {collection.listing_ids.length}
            </Body>
            {selected ? <Check color={colors.ink} size={18} /> : null}
          </Pressable>
        );
      })}

      {creating ? (
        <View style={{ gap: 10 }}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="List name"
            placeholderTextColor={colors.sage}
            autoFocus
            onSubmitEditing={createAndMove}
            returnKeyType="done"
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.md,
              paddingVertical: 12,
              paddingHorizontal: 14,
              fontSize: 15,
              color: colors.ink,
            }}
          />
          <Pressable
            onPress={createAndMove}
            style={{
              backgroundColor: colors.ink,
              borderRadius: radii.pill,
              paddingVertical: 13,
              alignItems: "center",
            }}
          >
            <Body size={14} weight="semibold" color={colors.surface}>
              Create and save
            </Body>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => setCreating(true)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingVertical: 12,
            paddingHorizontal: 14,
          }}
        >
          <Plus color={colors.ink} size={18} />
          <Body size={15} weight="semibold">
            Create new list
          </Body>
        </Pressable>
      )}
    </BottomSheet>
  );
}
