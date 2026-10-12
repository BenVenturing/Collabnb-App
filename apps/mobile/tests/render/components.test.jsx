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
