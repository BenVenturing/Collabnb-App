import { View } from "react-native";
import { Chip, SectionHeading, Glass } from "@/components/ui";

export default function SpecialtiesSection({ specialties }) {
  return (
    <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
      <SectionHeading size={18} title="Specialties" />
      <Glass variant="card" contentStyle={{ padding: 16 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {specialties.map((tag) => (
            <Chip key={tag} label={tag} />
          ))}
        </View>
      </Glass>
    </View>
  );
}
