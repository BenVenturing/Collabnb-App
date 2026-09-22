import { ConvexReactClient } from "convex/react";
import { convexUrl } from "./backend";

export const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

export default convexClient;
