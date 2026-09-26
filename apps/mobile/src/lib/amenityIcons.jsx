import { Text } from "react-native";
import {
  Waves, Flame, Wifi, Utensils, Mountain, Snowflake,
  PawPrint, Car, Anchor, Leaf, ChefHat, Compass,
  Wine, Star, Droplets, Sun, Eye, MapPin,
  Tv, Wind, Thermometer, Dumbbell, Bath, Coffee, Bike, Music,
  BookOpen, Umbrella, Laptop, Trees, Tent, Sailboat, Bed,
  Camera, Key, Flower2, Sunrise, Moon, Plane, Dog, Baby,
  Gift, Heart, Sparkles, Bell, Briefcase,
} from "lucide-react-native";

// Mirrors app/src/lib/amenityIcons.jsx on the website — same keys/labels so a
// host's amenity picks render identically on both platforms.
const ICON_PALETTE = [
  { key: "pool", Icon: Waves },
  { key: "hot_tub", Icon: Waves },
  { key: "fire", Icon: Flame },
  { key: "grill", Icon: Flame },
  { key: "wifi", Icon: Wifi },
  { key: "kitchen", Icon: Utensils },
  { key: "chef", Icon: ChefHat },
  { key: "mountain", Icon: Mountain },
  { key: "views", Icon: Eye },
  { key: "ski", Icon: Snowflake },
  { key: "pet", Icon: PawPrint },
  { key: "parking", Icon: Car },
  { key: "dock", Icon: Anchor },
  { key: "garden", Icon: Leaf },
  { key: "yoga", Icon: Leaf },
  { key: "hiking", Icon: Compass },
  { key: "wine", Icon: Wine },
  { key: "stargazing", Icon: Star },
  { key: "shower", Icon: Droplets },
  { key: "solar", Icon: Sun },
  { key: "landmark", Icon: MapPin },
  { key: "tv", Icon: Tv },
  { key: "ac", Icon: Wind },
  { key: "heating", Icon: Thermometer },
  { key: "gym", Icon: Dumbbell },
  { key: "bath", Icon: Bath },
  { key: "coffee", Icon: Coffee },
  { key: "bikes", Icon: Bike },
  { key: "sound", Icon: Music },
  { key: "books", Icon: BookOpen },
  { key: "beach", Icon: Umbrella },
  { key: "workspace", Icon: Laptop },
  { key: "trees", Icon: Trees },
  { key: "tent", Icon: Tent },
  { key: "boat", Icon: Sailboat },
  { key: "bed", Icon: Bed },
  { key: "camera", Icon: Camera },
  { key: "key", Icon: Key },
  { key: "flower", Icon: Flower2 },
  { key: "sunrise", Icon: Sunrise },
  { key: "moon", Icon: Moon },
  { key: "plane", Icon: Plane },
  { key: "dog", Icon: Dog },
  { key: "baby", Icon: Baby },
  { key: "gift", Icon: Gift },
  { key: "heart", Icon: Heart },
  { key: "sparkles", Icon: Sparkles },
  { key: "bell", Icon: Bell },
  { key: "work", Icon: Briefcase },
];

const ICON_MAP = Object.fromEntries(ICON_PALETTE.map(({ key, Icon }) => [key, Icon]));

// Legacy emoji → key for any old data that still stores emoji strings.
const EMOJI_MAP = {
  "♨️": "hot_tub", "🏊": "pool", "🌊": "views", "🔥": "fire",
  "⛷️": "ski", "🏔️": "mountain", "🍳": "kitchen", "👨‍🍳": "chef",
  "🐕": "pet", "📶": "wifi", "🅿️": "parking", "🚗": "parking",
  "🛶": "dock", "🚣": "dock", "🍽️": "grill", "🌿": "garden",
  "🌲": "garden", "🫒": "garden", "🧘": "yoga", "🥾": "hiking",
  "🛤️": "hiking", "🍷": "wine", "🧀": "wine", "🛋️": "wine",
  "🌌": "stargazing", "🚿": "shower", "🍜": "kitchen", "☀️": "solar",
  "⚡": "solar", "🌄": "views", "🏛️": "landmark", "📵": "landmark",
};

export function AmenityIcon({ icon, size = 18, color = "#3C5759" }) {
  const key = ICON_MAP[icon] ? icon : EMOJI_MAP[icon];
  const IconComponent = key ? ICON_MAP[key] : null;
  if (!IconComponent) {
    return <Text style={{ fontSize: size * 0.85 }}>{icon}</Text>;
  }
  return <IconComponent size={size} strokeWidth={1.75} color={color} />;
}
