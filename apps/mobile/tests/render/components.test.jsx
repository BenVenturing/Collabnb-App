import React from "react";
import renderer, { act } from "react-test-renderer";
import { Text } from "react-native";
import DeliverablesSection from "@/components/collab/DeliverablesSection";
import ContractSection from "@/components/collab/ContractSection";
import CollabStepper from "@/components/collab/CollabStepper";
import GlassTabBar from "@/components/GlassTabBar";
import { buildTimeline } from "@/utils/collabTimeline";
import { addRound, emptyContract } from "@/utils/contract";
import { emptySubmissions, parseDeliverables, progress, submit } from "@/utils/deliverables";

const texts = (tree) => tree.root.findAllByType(Text).map((t) => [].concat(t.props.children).join(""));
const has = (tree, s) => texts(tree).some((t) => t.includes(s));
const render = (el) => { let t; act(() => { t = renderer.create(el); }); return t; };

test("CollabStepper renders all stages", () => {
  const t = render(<CollabStepper steps={buildTimeline({ currentStage: "accepted" })} />);
  expect(has(t, "Application sent")).toBe(true);
  expect(has(t, "Completed")).toBe(true);
});

test("DeliverablesSection: host sees Approve on submitted items; creator sees Submit on todo", () => {
  let s = emptySubmissions(parseDeliverables("2 Reels"));
  s = submit(s, "reel-1", "https://x.co/a");
  const api = { submissions: s, progress: progress(s), submit: jest.fn(), approve: jest.fn(), requestChanges: jest.fn() };
  const host = render(<DeliverablesSection role="host" api={api} enabled />);
  expect(has(host, "Approve")).toBe(true);
  expect(has(host, "0 of 2 approved")).toBe(true);
  const creator = render(<DeliverablesSection role="creator" api={api} enabled />);
  expect(has(creator, "Submit link")).toBe(true); // reel-2 still todo
  const locked = render(<DeliverablesSection role="creator" api={api} enabled={false} />);
  expect(has(locked, "signed by both")).toBe(true);
});

test("ContractSection: shows terms and creator actions on the creator's turn", () => {
  const c = addRound(emptyContract(), { modifiedBy: "host", fields: { nights: "3 nights", compensation: "$500" }, note: "hi" });
  const t = render(<ContractSection contract={c} seed={{}} onCounter={jest.fn()} onSign={jest.fn()} />);
  expect(has(t, "3 nights")).toBe(true);
  expect(has(t, "Accept & sign")).toBe(true);
  expect(has(t, "Counter")).toBe(true);
  const empty = render(<ContractSection contract={emptyContract()} seed={{}} onCounter={jest.fn()} onSign={jest.fn()} />);
  expect(has(empty, "Waiting for the host to send terms")).toBe(true);
});

test("GlassTabBar renders visible tabs only and navigates on press", () => {
  const routes = [{ key: "a", name: "a" }, { key: "b", name: "b" }, { key: "hidden", name: "h" }];
  const descriptors = {
    a: { options: { title: "Alpha", tabBarIcon: () => null } },
    b: { options: { title: "Beta", tabBarIcon: () => null } },
    hidden: { options: { href: null, title: "Hidden" } },
  };
  const navigate = jest.fn();
  const navigation = { emit: () => ({ defaultPrevented: false }), navigate };
  const t = render(<GlassTabBar state={{ index: 0, routes }} descriptors={descriptors} navigation={navigation} />);
  expect(has(t, "Alpha")).toBe(true);
  expect(has(t, "Beta")).toBe(true);
  expect(has(t, "Hidden")).toBe(false);
  const beta = t.root.findAll((n) => n.props.accessibilityLabel === "Beta" && typeof n.props.onPress === "function")[0];
  act(() => beta.props.onPress());
  expect(navigate).toHaveBeenCalledWith("b", undefined);
});

test("ContractSection offers the signed PDF only once locked", () => {
  const { sign } = require("@/utils/contract");
  let c = addRound(emptyContract(), { modifiedBy: "host", fields: { nights: "3 nights" }, note: "" });
  const open = render(<ContractSection contract={c} seed={{}} onCounter={jest.fn()} onSign={jest.fn()} onExport={jest.fn()} />);
  expect(has(open, "Export signed PDF")).toBe(false);
  c = sign(sign(c, "host", "Ann Host"), "creator", "Cleo Creator");
  const locked = render(<ContractSection contract={c} seed={{}} onCounter={jest.fn()} onSign={jest.fn()} onExport={jest.fn()} />);
  expect(has(locked, "Export signed PDF")).toBe(true);
  expect(has(locked, "Contract locked")).toBe(true);
});

// ── Inbox ────────────────────────────────────────────────────────────────
// Skia (the atmospheric canvas) can't load under Jest; the background is cosmetic here.
jest.mock("@/components/AtmosphericBackground", () => { const { View } = require("react-native"); return { __esModule: true, default: ({ children, style }) => <View style={style}>{children}</View> }; });
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));
jest.mock("expo-image", () => { const { View } = require("react-native"); return { Image: View }; });
jest.mock("react-native-gesture-handler/ReanimatedSwipeable", () => {
  const React = require("react"); const { View } = require("react-native");
  return { __esModule: true, default: React.forwardRef(({ children }, ref) => React.createElement(View, { ref }, children)) };
});
jest.mock("@/hooks/useConversations", () => ({
  useConversations: () => ({
    isLoading: false,
    threads: [
      { id: "t1", thread_key: "thread_l1_c1", listing_title: "Cedar Cabin", host_name: "Ann Host", last_message: "See you Friday", tag: "Collab", unread: 2, timestamp: "9:41" },
      { id: "t2", thread_key: "thread_l2_c1", listing_title: "Lake Villa", host_name: "Leo", last_message: "Thanks!", tag: "Application", unread: 0, timestamp: "Mon" },
    ],
  }),
}));

test("InboxScreen renders threads, unread badge, filters and search", () => {
  const InboxScreen = require("@/components/inbox/InboxScreen").default;
  const t = render(<InboxScreen viewAs="creator" />);
  expect(has(t, "Cedar Cabin")).toBe(true);
  expect(has(t, "Lake Villa")).toBe(true);
  expect(has(t, "Ann Host: See you Friday")).toBe(true); // WhatsApp-style sender prefix
  expect(has(t, "2")).toBe(true); // unread badge
  ["All", "Unread", "Applications", "Collabs", "Pitches"].forEach((f) => expect(has(t, f)).toBe(true));
  // Unread filter hides the read thread
  const unreadChip = t.root.findAll((n) => typeof n.props.onPress === "function" && n.findAllByType(Text).some((x) => [].concat(x.props.children).join("") === "Unread"))[0];
  act(() => unreadChip.props.onPress());
  expect(has(t, "Cedar Cabin")).toBe(true);
  expect(has(t, "Lake Villa")).toBe(false);
  // Search narrows too
  const { TextInput } = require("react-native");
  act(() => t.root.findByType(TextInput).props.onChangeText("zzz"));
  expect(has(t, "No matches found")).toBe(true);
});

// ── Polish: skeletons, reveal, tab badge ─────────────────────────────────
test("skeleton presets and Reveal render without data", () => {
  const { ListingCardSkeleton, CollabCardSkeleton, ThreadRowSkeleton } = require("@/components/ui/Skeleton");
  const { Reveal } = require("@/components/ui/Reveal");
  [ListingCardSkeleton, CollabCardSkeleton, ThreadRowSkeleton].forEach((S) => expect(() => render(<S />)).not.toThrow());
  const t = render(<><Reveal index={0}><Text>first</Text></Reveal><Reveal index={20}><Text>late</Text></Reveal></>);
  expect(has(t, "first")).toBe(true);
  expect(has(t, "late")).toBe(true); // items past the stagger cap still render
});

test("GlassTabBar shows an unread badge (capped at 9+) and labels it for screen readers", () => {
  const routes = [{ key: "a", name: "a" }, { key: "inbox", name: "inbox" }];
  const mk = (badge) => ({
    a: { options: { title: "Alpha", tabBarIcon: () => null } },
    inbox: { options: { title: "Inbox", tabBarIcon: () => null, tabBarBadge: badge } },
  });
  const nav = { emit: () => ({ defaultPrevented: false }), navigate: jest.fn() };
  const bar = (badge) => render(<GlassTabBar state={{ index: 0, routes }} descriptors={mk(badge)} navigation={nav} />);
  expect(has(bar(3), "3")).toBe(true);
  expect(has(bar(42), "9+")).toBe(true);
  const none = bar(0);
  expect(none.root.findAll((n) => n.props.accessibilityLabel === "Inbox, 0 unread").length).toBe(0);
  const withBadge = bar(3);
  expect(withBadge.root.findAll((n) => n.props.accessibilityLabel === "Inbox, 3 unread").length).toBeGreaterThan(0);
});
