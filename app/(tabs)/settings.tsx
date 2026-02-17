import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp } from "@/lib/context/AppContext";
import { type Segment, SEGMENT_CONFIG } from "@/lib/domain/types";

const SEGMENTS: Segment[] = [
  "ingresos",
  "gastos_fijos",
  "gastos_variables",
  "ahorro",
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { pnlStructure, updatePnlStructure } = useApp();
  const [expandedSegment, setExpandedSegment] = useState<Segment | null>(null);
  const [newCategoryText, setNewCategoryText] = useState("");
  const [addingToSegment, setAddingToSegment] = useState<Segment | null>(null);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const topPadding = insets.top + webTopInset + 16;

  const handleAddCategory = useCallback(
    async (segment: Segment) => {
      const trimmed = newCategoryText.trim();
      if (!trimmed) return;
      if (pnlStructure[segment].includes(trimmed)) {
        if (Platform.OS === "web") {
          alert("Esta categoria ya existe");
        } else {
          Alert.alert("Error", "Esta categoria ya existe");
        }
        return;
      }
      const updated = {
        ...pnlStructure,
        [segment]: [...pnlStructure[segment], trimmed],
      };
      await updatePnlStructure(updated);
      setNewCategoryText("");
      setAddingToSegment(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [newCategoryText, pnlStructure, updatePnlStructure]
  );

  const handleDeleteCategory = useCallback(
    async (segment: Segment, category: string) => {
      const doDelete = async () => {
        const updated = {
          ...pnlStructure,
          [segment]: pnlStructure[segment].filter((c) => c !== category),
        };
        await updatePnlStructure(updated);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      };

      if (Platform.OS === "web") {
        if (confirm(`Eliminar la categoria "${category}"?`)) doDelete();
      } else {
        Alert.alert("Eliminar", `Eliminar la categoria "${category}"?`, [
          { text: "Cancelar", style: "cancel" },
          { text: "Eliminar", style: "destructive", onPress: doDelete },
        ]);
      }
    },
    [pnlStructure, updatePnlStructure]
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingTop: topPadding,
        paddingBottom: 120,
      }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Personalizacion</Text>
      <Text style={styles.subtitle}>Gestionar categorias por segmento</Text>

      {SEGMENTS.map((seg) => {
        const config = SEGMENT_CONFIG[seg];
        const cats = pnlStructure[seg];
        const isExpanded = expandedSegment === seg;

        return (
          <View key={seg} style={styles.segmentCard}>
            <Pressable
              onPress={() =>
                setExpandedSegment(isExpanded ? null : seg)
              }
              style={styles.segmentHeader}
            >
              <View style={styles.segmentHeaderLeft}>
                <View
                  style={[
                    styles.segmentDot,
                    { backgroundColor: config.color },
                  ]}
                />
                <Text style={styles.segmentName}>{config.label}</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{cats.length}</Text>
                </View>
              </View>
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={18}
                color={Colors.text.muted}
              />
            </Pressable>

            {isExpanded && (
              <View style={styles.categoryList}>
                {cats.map((cat) => (
                  <View key={cat} style={styles.categoryRow}>
                    <Text style={styles.categoryName}>{cat}</Text>
                    <Pressable
                      onPress={() => handleDeleteCategory(seg, cat)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color={Colors.text.disabled}
                      />
                    </Pressable>
                  </View>
                ))}

                {addingToSegment === seg ? (
                  <View style={styles.addRow}>
                    <TextInput
                      style={styles.addInput}
                      value={newCategoryText}
                      onChangeText={setNewCategoryText}
                      placeholder="Nombre de la categoria"
                      placeholderTextColor={Colors.text.disabled}
                      autoFocus
                    />
                    <Pressable
                      onPress={() => handleAddCategory(seg)}
                      style={styles.addConfirmBtn}
                    >
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color="#fff"
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setAddingToSegment(null);
                        setNewCategoryText("");
                      }}
                    >
                      <Ionicons
                        name="close"
                        size={18}
                        color={Colors.text.muted}
                      />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setAddingToSegment(seg)}
                    style={styles.addBtn}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={16}
                      color={config.color}
                    />
                    <Text style={[styles.addBtnText, { color: config.color }]}>
                      Agregar categoria
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.base,
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: "Outfit_900Black",
    fontSize: 24,
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: Colors.text.muted,
    marginBottom: 20,
    marginTop: 4,
  },
  segmentCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 12,
    overflow: "hidden" as const,
  },
  segmentHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    padding: 16,
  },
  segmentHeaderLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  segmentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  segmentName: {
    fontFamily: "Outfit_700Bold",
    fontSize: 15,
    color: Colors.text.primary,
  },
  countBadge: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 11,
    color: Colors.text.muted,
  },
  categoryList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 6,
  },
  categoryRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.dark.borderSubtle,
  },
  categoryName: {
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    color: Colors.text.primary,
  },
  addRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginTop: 4,
  },
  addInput: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.brand.DEFAULT,
  },
  addConfirmBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.brand.DEFAULT,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  addBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginTop: 4,
    padding: 8,
  },
  addBtnText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 12,
  },
});
