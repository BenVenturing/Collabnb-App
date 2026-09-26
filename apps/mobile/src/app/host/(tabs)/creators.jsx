import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import {
  Star,
  X,
  Send,
  Bookmark,
  Users,
  FileText,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
} from "lucide-react-native";
import MessagingStore from "@/utils/MessagingStore";
import SavedCreatorsStore from "@/utils/SavedCreatorsStore";
import ListingDraftStore from "@/utils/ListingDraftStore";
import { addInvitedProposal } from "@/utils/ProposalsStore";
import {
  mockCreators,
  mockReviews,
  mockPastCollaborations,
} from "@/data/mockCreators";
import AtmosphericBackground from "@/components/AtmosphericBackground";
import Glass from "@/components/Glass";
import { colors, fonts, tracking, track } from "@/config/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

export default function HostCreatorsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [savedCreatorIds, setSavedCreatorIds] = useState([]);
  const [showPastCollabsSheet, setShowPastCollabsSheet] = useState(false);
  const [selectedCreatorForCollabs, setSelectedCreatorForCollabs] =
    useState(null);
  const [showSavedCreators, setShowSavedCreators] = useState(false);
  const [selectedCreatorsForBulk, setSelectedCreatorsForBulk] = useState([]);
  const [showListingPicker, setShowListingPicker] = useState(false);
  const [availableListings, setAvailableListings] = useState([]);
  const [currentCreatorIndex, setCurrentCreatorIndex] = useState(0);

  useEffect(() => {
    const init = async () => {
      await SavedCreatorsStore.init();
      await MessagingStore.init();
      setSavedCreatorIds(SavedCreatorsStore.getSavedCreatorIds());

      const allListings = await ListingDraftStore.getPublishedListings();
      setAvailableListings(allListings.filter((l) => l.status === "published"));
    };
    init();

    const unsubSaved = SavedCreatorsStore.subscribe(() => {
      setSavedCreatorIds(SavedCreatorsStore.getSavedCreatorIds());
    });

    return () => {
      unsubSaved();
    };
  }, []);

  const handleSwipeRight = async (creator) => {
    await SavedCreatorsStore.addCreator(creator.id);
  };

  const handleSwipeLeft = (creator) => {
    console.log("Skipped creator:", creator.name);
  };

  const handleSwipeUp = async (creator) => {
    const listing = availableListings[0];
    const thread = await MessagingStore.createOrGetCreatorThread({
      creatorId: creator.id,
      creatorName: creator.name,
      creatorAvatarUrl: creator.avatarUri,
    });

    if (listing) {
      await MessagingStore.addListingCardMessage({
        threadId: thread.id,
        listing,
        prefilledText: `Hi ${creator.name} — I'd love to collaborate. Here's a proposal for you:`,
      });
      await addInvitedProposal({ creator, listing });
    } else {
      await MessagingStore.sendMessage(
        thread.id,
        `Hi ${creator.name} — I'd love to collaborate with you. Let me know if you're interested!`,
      );
    }

    router.push(`/messages/${thread.id}`);
  };

  const handleReviewTap = (review) => {
    setSelectedCreatorForCollabs(review.creatorId);
    setShowPastCollabsSheet(true);
  };

  const handleBulkMessage = async (listingId) => {
    const listing = availableListings.find((l) => l.id === listingId);
    if (!listing) return;

    const selectedCreators = mockCreators.filter((c) =>
      selectedCreatorsForBulk.includes(c.id),
    );

    for (const creator of selectedCreators) {
      const thread = await MessagingStore.createOrGetCreatorThread({
        creatorId: creator.id,
        creatorName: creator.name,
        creatorAvatarUrl: creator.avatarUri,
      });

      await MessagingStore.addListingCardMessage({
        threadId: thread.id,
        listing,
        prefilledText: `Hi ${creator.name} — I'd love to collaborate. Here's a proposal for you:`,
      });
      await addInvitedProposal({ creator, listing });
    }

    setShowListingPicker(false);
    setShowSavedCreators(false);
    setSelectedCreatorsForBulk([]);
    alert(
      `Sent listing proposal to ${selectedCreators.length} creator${selectedCreators.length > 1 ? "s" : ""}!`,
    );
  };

  return (
    <AtmosphericBackground>
      <StatusBar style="dark" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 80,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <View>
            <Text
              style={{
                fontFamily: fonts.display,
                fontSize: 32,
                color: colors.ink,
                letterSpacing: track(32, tracking.display),
                marginBottom: 4,
              }}
            >
              Discover Creators
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 15, color: colors.slate }}>
              Find your perfect collaboration match
            </Text>
          </View>
          {savedCreatorIds.length > 0 && (
            <TouchableOpacity
              onPress={() => setShowSavedCreators(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: colors.mint,
              }}
            >
              <Bookmark color={colors.ink} size={18} fill={colors.ink} />
              <Text
                style={{
                  fontFamily: fonts.bodySemibold,
                  fontSize: 14,
                  color: colors.ink,
                }}
              >
                Saved ({savedCreatorIds.length})
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Recent Reviews Carousel */}
        <View style={{ marginBottom: 28 }}>
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 18,
              color: colors.ink,
              letterSpacing: track(18, tracking.display),
              marginBottom: 14,
            }}
          >
            Recent Reviews
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingRight: 20 }}
          >
            {mockReviews.map((review) => (
              <TouchableOpacity
                key={review.id}
                onPress={() => handleReviewTap(review)}
                activeOpacity={0.8}
                style={{ width: 290 }}
              >
                <Glass variant="card" contentStyle={{ padding: 18 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 14,
                    }}
                  >
                    <View
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 25,
                        overflow: "hidden",
                        borderWidth: 2,
                        borderColor: colors.surface,
                        zIndex: 2,
                      }}
                    >
                      <Image
                        source={{ uri: review.creatorAvatarUri }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                      />
                    </View>
                    <View
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 25,
                        overflow: "hidden",
                        borderWidth: 2,
                        borderColor: colors.surface,
                        marginLeft: -18,
                        zIndex: 1,
                      }}
                    >
                      <Image
                        source={{ uri: review.listingAvatarUri }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                      />
                    </View>
                    <View style={{ marginLeft: 14, flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 3,
                          marginBottom: 3,
                        }}
                      >
                        {Array.from({ length: review.rating }).map((_, i) => (
                          <Star
                            key={i}
                            size={13}
                            color="#F5D547" // no brand token — star-rating gold, flagged for design review
                            fill="#F5D547"
                          />
                        ))}
                      </View>
                      <Text
                        style={{
                          fontFamily: fonts.bodySemibold,
                          fontSize: 14,
                          color: colors.ink,
                        }}
                        numberOfLines={1}
                      >
                        {review.creatorName}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 14,
                      color: colors.slate,
                      lineHeight: 20,
                      marginBottom: 10,
                    }}
                    numberOfLines={2}
                  >
                    {review.snippet}
                  </Text>

                  <Text
                    style={{
                      fontFamily: fonts.bodyMedium,
                      fontSize: 12,
                      color: colors.sage,
                    }}
                  >
                    {review.listingName}
                  </Text>
                </Glass>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Swipe Deck */}
        <Text
          style={{
            fontFamily: fonts.display,
            fontSize: 18,
            color: colors.ink,
            letterSpacing: track(18, tracking.display),
            marginBottom: 14,
          }}
        >
          Swipe to Match
        </Text>
        <SwipeDeck
          creators={mockCreators}
          currentIndex={currentCreatorIndex}
          onIndexChange={setCurrentCreatorIndex}
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
          onSwipeUp={handleSwipeUp}
        />
      </ScrollView>

      {/* Past Collaborations Bottom Sheet */}
      <PastCollaborationsSheet
        visible={showPastCollabsSheet}
        creatorId={selectedCreatorForCollabs}
        onClose={() => setShowPastCollabsSheet(false)}
        insets={insets}
      />

      {/* Saved Creators Modal */}
      <SavedCreatorsModal
        visible={showSavedCreators}
        savedCreatorIds={savedCreatorIds}
        selectedForBulk={selectedCreatorsForBulk}
        onToggleSelect={(creatorId) => {
          if (selectedCreatorsForBulk.includes(creatorId)) {
            setSelectedCreatorsForBulk(
              selectedCreatorsForBulk.filter((id) => id !== creatorId),
            );
          } else {
            setSelectedCreatorsForBulk([...selectedCreatorsForBulk, creatorId]);
          }
        }}
        onSendBulk={() => setShowListingPicker(true)}
        onClose={() => setShowSavedCreators(false)}
        insets={insets}
      />

      {/* Listing Picker Modal */}
      <ListingPickerModal
        visible={showListingPicker}
        availableListings={availableListings}
        onSelectListing={handleBulkMessage}
        onClose={() => setShowListingPicker(false)}
      />
    </AtmosphericBackground>
  );
}

// Swipe Deck Component
function SwipeDeck({
  creators,
  currentIndex,
  onIndexChange,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const currentCreator = creators[currentIndex];

  const handleSwipeAction = (direction) => {
    if (direction === "left") {
      onSwipeLeft(currentCreator);
    } else if (direction === "right") {
      onSwipeRight(currentCreator);
    } else if (direction === "up") {
      onSwipeUp(currentCreator);
    }

    if (currentIndex < creators.length - 1) {
      onIndexChange(currentIndex + 1);
    }
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (
        translateY.value < -SWIPE_THRESHOLD &&
        Math.abs(event.velocityY) > 200
      ) {
        translateY.value = withSpring(-1000, {}, () => {
          translateX.value = 0;
          translateY.value = 0;
          runOnJS(handleSwipeAction)("up");
        });
      } else if (translateX.value > SWIPE_THRESHOLD || event.velocityX > 500) {
        translateX.value = withSpring(1000, {}, () => {
          translateX.value = 0;
          translateY.value = 0;
          runOnJS(handleSwipeAction)("right");
        });
      } else if (
        translateX.value < -SWIPE_THRESHOLD ||
        event.velocityX < -500
      ) {
        translateX.value = withSpring(-1000, {}, () => {
          translateX.value = 0;
          translateY.value = 0;
          runOnJS(handleSwipeAction)("left");
        });
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-15, 0, 15],
      Extrapolate.CLAMP,
    );

    const opacity = interpolate(
      Math.abs(translateX.value) + Math.abs(translateY.value),
      [0, SWIPE_THRESHOLD],
      [1, 0.7],
      Extrapolate.CLAMP,
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotateZ: `${rotate}deg` },
      ],
      opacity,
    };
  });

  const leftLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolate.CLAMP,
    ),
  }));

  const rightLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolate.CLAMP,
    ),
  }));

  const upLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolate.CLAMP,
    ),
  }));

  if (!currentCreator) {
    return (
      <View
        style={{
          height: 480,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.bone,
          borderRadius: 24,
          padding: 40,
        }}
      >
        <Users color={colors.sage} size={48} />
        <Text
          style={{
            fontFamily: fonts.bodySemibold,
            fontSize: 18,
            color: colors.ink,
            marginTop: 16,
            textAlign: "center",
          }}
        >
          No more creators
        </Text>
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: 14,
            color: colors.slate,
            marginTop: 8,
            textAlign: "center",
          }}
        >
          Check back later for new matches
        </Text>
      </View>
    );
  }

  return (
    <View style={{ height: 480, position: "relative" }}>
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            { width: "100%", height: "100%", position: "absolute" },
            cardAnimatedStyle,
          ]}
        >
          {/* radius here (24) is a touch looser than glass.card's 20 (radii.lg) —
              closest available token, kept for the deck's "hero" card. */}
          <Glass variant="card" style={{ flex: 1, borderRadius: 24 }}>
            <View
              style={{
                height: 280,
                width: "100%",
                backgroundColor: colors.bone,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                overflow: "hidden",
              }}
            >
              <Image
                source={{ uri: currentCreator.avatarUri }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={200}
              />
            </View>

            <View style={{ padding: 20 }}>
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: 24,
                  color: colors.ink,
                  letterSpacing: track(24, tracking.display),
                  marginBottom: 6,
                }}
              >
                {currentCreator.name}
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 12,
                    backgroundColor: colors.mint,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.bodySemibold,
                      fontSize: 12,
                      color: colors.ink,
                    }}
                  >
                    {currentCreator.tier}
                  </Text>
                </View>
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 12,
                    backgroundColor: colors.bone,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.bodySemibold,
                      fontSize: 12,
                      color: colors.ink,
                    }}
                  >
                    {currentCreator.followers} followers
                  </Text>
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 6,
                  marginBottom: 12,
                }}
              >
                {currentCreator.tags.map((tag, idx) => (
                  <View
                    key={idx}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 10,
                      backgroundColor: colors.bone,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.bodySemibold,
                        fontSize: 11,
                        color: colors.slate,
                      }}
                    >
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>

              <Text
                style={{ fontFamily: fonts.body, fontSize: 13, color: colors.slate, lineHeight: 18 }}
                numberOfLines={3}
              >
                {currentCreator.bio}
              </Text>
            </View>
          </Glass>

          {/* Swipe Labels */}
          <Animated.View
            style={[
              {
                position: "absolute",
                top: 40,
                left: 40,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 20,
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                borderWidth: 2,
                borderColor: colors.slate,
              },
              leftLabelStyle,
            ]}
          >
            <ArrowLeft color={colors.slate} size={20} />
            <Text style={{ fontFamily: fonts.display, fontSize: 15, color: colors.slate }}>
              Skip
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              {
                position: "absolute",
                top: 40,
                right: 40,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 20,
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                borderWidth: 2,
                borderColor: colors.mint,
              },
              rightLabelStyle,
            ]}
          >
            <Text style={{ fontFamily: fonts.display, fontSize: 15, color: colors.ink }}>
              Save
            </Text>
            <ArrowRight color={colors.ink} size={20} />
          </Animated.View>

          <Animated.View
            style={[
              {
                position: "absolute",
                top: 120,
                alignSelf: "center",
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 20,
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                borderWidth: 2,
                borderColor: colors.slate,
              },
              upLabelStyle,
            ]}
          >
            <ArrowUp color={colors.slate} size={20} />
            <Text style={{ fontFamily: fonts.display, fontSize: 15, color: colors.slate }}>
              Message Now
            </Text>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// Past Collaborations Sheet
//
// A true bottom sheet: top-only rounded corners, flush with the screen's
// bottom edge. <Glass> always rounds all four corners (its `radius` isn't
// overridable per-corner without editing the locked Glass.jsx), so it can't
// reproduce this shape — left as a raw BlurView per STYLE-GUIDE.md's "when
// web and mobile genuinely can't match" guidance. Colors are still tokenized.
function PastCollaborationsSheet({ visible, creatorId, onClose, insets }) {
  if (!visible || !creatorId) return null;

  const collabs = mockPastCollaborations[creatorId] || [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(25, 37, 36, 0.7)",
          justifyContent: "flex-end",
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <BlurView
          intensity={80}
          tint="light"
          style={{
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: "hidden",
            maxHeight: "75%",
          }}
        >
          <View
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.98)",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: insets.bottom,
            }}
          >
            <View
              style={{
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: colors.stone,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: 20,
                  color: colors.ink,
                  letterSpacing: track(20, tracking.display),
                }}
              >
                Past Collaborations
              </Text>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.bone,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X color={colors.slate} size={18} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 500 }}
              contentContainerStyle={{ padding: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {collabs.length === 0 ? (
                <View style={{ padding: 40, alignItems: "center" }}>
                  <Users color={colors.sage} size={48} />
                  <Text
                    style={{
                      fontFamily: fonts.bodySemibold,
                      fontSize: 16,
                      color: colors.ink,
                      marginTop: 16,
                      textAlign: "center",
                    }}
                  >
                    No past collaborations
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 14,
                      color: colors.slate,
                      marginTop: 8,
                      textAlign: "center",
                    }}
                  >
                    This would be a first collaboration
                  </Text>
                </View>
              ) : (
                collabs.map((collab) => (
                  <View
                    key={collab.collaborationId}
                    style={{
                      marginBottom: 16,
                      padding: 16,
                      backgroundColor: colors.bone,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: colors.stone,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 12,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontFamily: fonts.display,
                            fontSize: 16,
                            color: colors.ink,
                            letterSpacing: track(16, tracking.display),
                            marginBottom: 4,
                          }}
                        >
                          {collab.listingName}
                        </Text>
                        <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.slate }}>
                          {collab.date}
                        </Text>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {Array.from({ length: collab.rating }).map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            color="#F5D547" // no brand token — star-rating gold, flagged for design review
                            fill="#F5D547"
                          />
                        ))}
                      </View>
                    </View>

                    <Text
                      style={{
                        fontFamily: fonts.body,
                        fontSize: 14,
                        color: colors.ink,
                        lineHeight: 20,
                        marginBottom: 12,
                      }}
                    >
                      {collab.longReview}
                    </Text>

                    <View
                      style={{
                        padding: 12,
                        backgroundColor: colors.surface,
                        borderRadius: 12,
                        marginBottom: 12,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fonts.bodySemibold,
                          fontSize: 13,
                          color: colors.ink,
                          marginBottom: 6,
                        }}
                      >
                        Deliverables
                      </Text>
                      <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.slate }}>
                        {collab.deliverableSummary}
                      </Text>
                    </View>

                    <View
                      style={{
                        padding: 12,
                        backgroundColor: "rgba(209, 235, 219, 0.5)",
                        borderRadius: 12,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fonts.bodySemibold,
                          fontSize: 13,
                          color: colors.ink,
                          marginBottom: 6,
                        }}
                      >
                        Analytics (Coming soon)
                      </Text>
                      <Text
                        style={{
                          fontFamily: fonts.body,
                          fontSize: 12,
                          color: colors.slate,
                          fontStyle: "italic",
                        }}
                      >
                        Track impressions, engagement, and conversions
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

// Saved Creators Modal
//
// Another true bottom sheet (top-only radius) — see the note above
// PastCollaborationsSheet for why this stays a raw BlurView.
function SavedCreatorsModal({
  visible,
  savedCreatorIds,
  selectedForBulk,
  onToggleSelect,
  onSendBulk,
  onClose,
  insets,
}) {
  if (!visible) return null;

  const savedCreators = mockCreators.filter((c) =>
    savedCreatorIds.includes(c.id),
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(25, 37, 36, 0.7)",
          justifyContent: "flex-end",
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <BlurView
          intensity={80}
          tint="light"
          style={{
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: "hidden",
            maxHeight: "80%",
          }}
        >
          <View
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.98)",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: insets.bottom,
            }}
          >
            <View
              style={{
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: colors.stone,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: 20,
                  color: colors.ink,
                  letterSpacing: track(20, tracking.display),
                }}
              >
                Saved Creators ({savedCreatorIds.length})
              </Text>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.bone,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X color={colors.slate} size={18} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 500 }}
              contentContainerStyle={{ padding: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {savedCreators.map((creator) => {
                const isSelected = selectedForBulk.includes(creator.id);
                return (
                  <TouchableOpacity
                    key={creator.id}
                    onPress={() => onToggleSelect(creator.id)}
                    style={{
                      marginBottom: 12,
                      padding: 16,
                      backgroundColor: isSelected ? colors.mint : colors.bone,
                      borderRadius: 16,
                      borderWidth: 2,
                      borderColor: isSelected ? colors.slate : "transparent",
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        overflow: "hidden",
                        marginRight: 12,
                      }}
                    >
                      <Image
                        source={{ uri: creator.avatarUri }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: fonts.bodySemibold,
                          fontSize: 16,
                          color: colors.ink,
                          marginBottom: 4,
                        }}
                      >
                        {creator.name}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 8,
                            backgroundColor: colors.surface,
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: fonts.bodySemibold,
                              fontSize: 11,
                              color: colors.ink,
                            }}
                          >
                            {creator.tier}
                          </Text>
                        </View>
                        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.slate }}>
                          {creator.followers}
                        </Text>
                      </View>
                    </View>
                    {isSelected && <CheckCircle2 color={colors.slate} size={24} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {selectedForBulk.length > 0 && (
              <View
                style={{
                  padding: 20,
                  borderTopWidth: 1,
                  borderTopColor: colors.stone,
                }}
              >
                <TouchableOpacity
                  onPress={onSendBulk}
                  style={{
                    paddingVertical: 16,
                    borderRadius: 12,
                    backgroundColor: colors.slate,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <Send color={colors.surface} size={20} />
                  <Text
                    style={{ fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.surface }}
                  >
                    Send to {selectedForBulk.length} creator
                    {selectedForBulk.length > 1 ? "s" : ""}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

// Listing Picker Modal — a centered dialog (not a bottom sheet), so its
// uniform corner radius can use <Glass> like any other card.
function ListingPickerModal({
  visible,
  availableListings,
  onSelectListing,
  onClose,
}) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(25, 37, 36, 0.8)",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <Glass variant="card" style={{ borderRadius: 24, maxHeight: "70%" }}>
          <View
            style={{
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: colors.stone,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.display,
                fontSize: 20,
                color: colors.ink,
                letterSpacing: track(20, tracking.display),
                marginBottom: 8,
              }}
            >
              Choose a listing
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.slate }}>
              Select which listing to propose to selected creators
            </Text>
          </View>

          <ScrollView
            style={{ maxHeight: 400 }}
            contentContainerStyle={{ padding: 20 }}
          >
            {availableListings.length === 0 ? (
              <View style={{ padding: 40, alignItems: "center" }}>
                <FileText color={colors.sage} size={48} />
                <Text
                  style={{
                    fontFamily: fonts.bodySemibold,
                    fontSize: 16,
                    color: colors.ink,
                    marginTop: 16,
                    textAlign: "center",
                  }}
                >
                  No listings available
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 14,
                    color: colors.slate,
                    marginTop: 8,
                    textAlign: "center",
                  }}
                >
                  Create a listing first
                </Text>
              </View>
            ) : (
              availableListings.map((listing) => (
                <TouchableOpacity
                  key={listing.id}
                  onPress={() => onSelectListing(listing.id)}
                  style={{
                    marginBottom: 12,
                    padding: 16,
                    backgroundColor: colors.bone,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: colors.stone,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.bodySemibold,
                      fontSize: 16,
                      color: colors.ink,
                      marginBottom: 4,
                    }}
                  >
                    {listing.title}
                  </Text>
                  <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.slate }}>
                    {listing.location_city}, {listing.location_country}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          <View
            style={{
              padding: 20,
              borderTopWidth: 1,
              borderTopColor: colors.stone,
            }}
          >
            <TouchableOpacity
              onPress={onClose}
              style={{
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: colors.bone,
                alignItems: "center",
              }}
            >
              <Text
                style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.ink }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </Glass>
      </View>
    </Modal>
  );
}
