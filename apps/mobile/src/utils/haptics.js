// One place for haptic feedback so call sites stay one-liners and never throw
// (web, simulators and some Android devices have no haptic engine).
//
//   select()   a value or tab changed          (UIKit "selection changed")
//   tap()      a light physical confirmation   (toggle, pin, press-and-hold begins)
//   press()    a firmer press                  (long-press selects a row)
//   settle()   something lands                 (lens released on a tab)
//   success()  a task completed                (applied, signed, contract locked)
//   warning()  a refused/undone action

import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

const run = (fn) => {
  if (Platform.OS === "web") return;
  try {
    Promise.resolve(fn()).catch(() => {});
  } catch {
    /* no haptic engine */
  }
};

export const select = () => run(() => Haptics.selectionAsync());
export const tap = () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
export const press = () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
export const settle = () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft));
export const success = () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
export const warning = () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
