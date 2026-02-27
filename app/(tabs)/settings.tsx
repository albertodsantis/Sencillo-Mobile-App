import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Pressable,
  TextInput,
  Platform,
  Alert,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import AmbientGlow from "@/components/AmbientGlow";
import { useApp } from "@/lib/context/AppContext";
import { type Segment, type PnlStructure, SEGMENT_CONFIG } from "@/lib/domain/types";

const SETTINGS_GUIDE_DISMISSED_KEY = "guide_dismissed_settings";

const SEGMENTS: Segment[] = [
  "ingresos",
  "gastos_fijos",
  "gastos_variables",
  "ahorro",
];

function SegmentIcon({ segment, color }: { segment: Segment; color: string }) {
  if (segment === "gastos_fijos") {
    return <MaterialCommunityIcons name="credit-card" size={18} color={color} />;
  }

  if (segment === "ahorro") {
    return <MaterialCommunityIcons name="piggy-bank" size={18} color={color} />;
  }

  if (segment === "gastos_variables") {
    return <Ionicons name="trending-down" size={18} color={color} />;
  }

  return <Ionicons name="trending-up" size={18} color={color} />;
}

function CategoryRow({
  cat,
  segment,
  segColor,
  pnlStructure,
  updatePnlStructure,
  deleteCategoryAndRelatedData,
}: {
  cat: string;
  segment: Segment;
  segColor: string;
  pnlStructure: PnlStructure;
  updatePnlStructure: (s: PnlStructure) => Promise<void>;
  deleteCategoryAndRelatedData: (segment: Segment, category: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(cat);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (editing) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [editing]);

  const handleSaveEdit = async () => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === cat) {
      setEditing(false);
      setEditText(cat);
      return;
    }
    if (pnlStructure[segment].includes(trimmed)) {
      if (Platform.OS === "web") {
        alert("Esta categoria ya existe");
      } else {
        Alert.alert("Error", "Esta categoria ya existe");
      }
      setEditText(cat);
      setEditing(false);
      return;
    }
    const updated = {
      ...pnlStructure,
      [segment]: pnlStructure[segment].map((c) => (c === cat ? trimmed : c)),
    };
    await updatePnlStructure(updated);
    setEditing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDelete = async () => {
    const doDelete = async () => {
      await deleteCategoryAndRelatedData(segment, cat);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    };
    if (Platform.OS === "web") {
      if (confirm(`Eliminar la categoria "${cat}"?`)) doDelete();
    } else {
      Alert.alert("Eliminar", `Eliminar la categoria "${cat}"?`, [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  if (editing) {
    return (
      <View style={[styles.categoryRow, { borderColor: segColor }]}>
        <TextInput
          ref={inputRef}
          style={styles.editInput}
          value={editText}
          onChangeText={setEditText}
          onSubmitEditing={handleSaveEdit}
          onBlur={handleSaveEdit}
          returnKeyType="done"
          selectTextOnFocus
        />
        <Pressable onPress={handleSaveEdit}>
          <Ionicons name="checkmark" size={18} color={segColor} />
        </Pressable>
        <Pressable onPress={() => { setEditing(false); setEditText(cat); }}>
          <Ionicons name="close" size={18} color={Colors.text.muted} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.categoryRow}>
      <Pressable
        style={styles.categoryNameArea}
        onPress={() => setEditing(true)}
      >
        <Text style={styles.categoryName}>{cat}</Text>
      </Pressable>
      <View style={styles.categoryActions}>
        <Pressable onPress={() => setEditing(true)} hitSlop={8}>
          <Ionicons name="pencil-outline" size={18} color={Colors.text.disabled} />
        </Pressable>
        <Pressable onPress={handleDelete} hitSlop={8}>
          <Ionicons name="trash-outline" size={18} color={Colors.text.disabled} />
        </Pressable>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { pnlStructure, updatePnlStructure, deleteCategoryAndRelatedData } = useApp();
  const [expandedSegment, setExpandedSegment] = useState<Segment | null>(null);
  const [newCategoryText, setNewCategoryText] = useState("");
  const [addingToSegment, setAddingToSegment] = useState<Segment | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [dontShowGuideAgain, setDontShowGuideAgain] = useState(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const topPadding = insets.top + webTopInset + 16;
  const keyboardBehavior = Platform.OS === "ios" ? "padding" : "height";
  const keyboardVerticalOffset = Platform.OS === "ios" ? 90 : 24;

  useEffect(() => {
    let mounted = true;
    const loadGuidePreference = async () => {
      const dismissed = await AsyncStorage.getItem(SETTINGS_GUIDE_DISMISSED_KEY);
      if (!mounted) return;
      const isDismissed = dismissed === "true";
      setDontShowGuideAgain(isDismissed);
      setShowGuide(!isDismissed);
    };

    loadGuidePreference();

    return () => {
      mounted = false;
    };
  }, []);

  const closeGuide = useCallback(async () => {
    if (dontShowGuideAgain) {
      await AsyncStorage.setItem(SETTINGS_GUIDE_DISMISSED_KEY, "true");
    } else {
      await AsyncStorage.removeItem(SETTINGS_GUIDE_DISMISSED_KEY);
    }
    setShowGuide(false);
  }, [dontShowGuideAgain]);

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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={keyboardBehavior}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <AmbientGlow />
      <ScrollView
        style={{ flex: 1, paddingHorizontal: 24 }}
        contentContainerStyle={{
          paddingTop: topPadding,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Personalizacion</Text>
          <Text style={styles.subtitle}>Gestionar categorias por segmento</Text>
        </View>
        <Pressable onPress={() => setShowGuide(true)} hitSlop={8}>
          <Ionicons name="help-circle-outline" size={28} color={Colors.text.muted} />
        </Pressable>
      </View>

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
                    styles.segmentIconCircle,
                    { backgroundColor: `${config.color}20` },
                  ]}
                >
                  <SegmentIcon segment={seg} color={config.color} />
                </View>
                <Text style={styles.segmentName}>{config.label}</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{cats.length}</Text>
                </View>
              </View>
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color={Colors.text.muted}
              />
            </Pressable>

            {isExpanded && (
              <View style={styles.categoryList}>
                {cats.map((cat) => (
                  <CategoryRow
                    key={cat}
                    cat={cat}
                    segment={seg}
                    segColor={config.color}
                    pnlStructure={pnlStructure}
                    updatePnlStructure={updatePnlStructure}
                    deleteCategoryAndRelatedData={deleteCategoryAndRelatedData}
                  />
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
                      onSubmitEditing={() => handleAddCategory(seg)}
                      returnKeyType="done"
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
                      size={20}
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
      <Modal
        visible={showGuide}
        transparent
        animationType="fade"
        onRequestClose={closeGuide}
      >
        <Pressable style={guideStyles.overlay} onPress={closeGuide}>
          <Pressable style={guideStyles.card} onPress={(e) => e.stopPropagation()}>
            <Text style={guideStyles.sectionTitle}>Segmentos</Text>
            <View style={guideStyles.segmentInfoList}>
              <View style={guideStyles.segmentInfoRow}>
                <View style={guideStyles.segmentInfoIconWrap}>
                  <SegmentIcon segment="ingresos" color={SEGMENT_CONFIG.ingresos.color} />
                </View>
                <Text style={guideStyles.segmentInfoText}>
                  <Text style={guideStyles.bold}>Ingresos:</Text> El motor de tus finanzas. Todo el capital que generas y que alimenta tu presupuesto mensual.
                </Text>
              </View>

              <View style={guideStyles.segmentInfoRow}>
                <View style={guideStyles.segmentInfoIconWrap}>
                  <SegmentIcon segment="ahorro" color={SEGMENT_CONFIG.ahorro.color} />
                </View>
                <Text style={guideStyles.segmentInfoText}>
                  <Text style={guideStyles.bold}>Ahorros:</Text> La parte de tus ingresos que decides pagarte a ti mismo primero. Financieramente, este monto se resta de tu balance general para que no cuentes con el para tus gastos.
                </Text>
              </View>

              <View style={guideStyles.segmentInfoRow}>
                <View style={guideStyles.segmentInfoIconWrap}>
                  <SegmentIcon segment="gastos_fijos" color={SEGMENT_CONFIG.gastos_fijos.color} />
                </View>
                <Text style={guideStyles.segmentInfoText}>
                  <Text style={guideStyles.bold}>Gastos Fijos:</Text> Los compromisos recurrentes e inevitables (como el alquiler o los servicios). Cuestan casi lo mismo cada mes y tienes poco margen para cambiarlos.
                </Text>
              </View>

              <View style={guideStyles.segmentInfoRow}>
                <View style={guideStyles.segmentInfoIconWrap}>
                  <SegmentIcon segment="gastos_variables" color={SEGMENT_CONFIG.gastos_variables.color} />
                </View>
                <Text style={guideStyles.segmentInfoText}>
                  <Text style={guideStyles.bold}>Gastos Variables:</Text> Los gastos diarios que poco a poco se van acumulando (ocio, antojos). Como tu decides cuando y en que gastarlos, esta es tu area de oportunidad: presupuestar y controlar es la clave para dominar tu dinero.
                </Text>
              </View>
            </View>

            <Text style={guideStyles.sectionTitle}>Categorias</Text>
            <Text style={guideStyles.sectionDesc}>
              Cada segmento tiene sus propias categorias. Puedes <Text style={guideStyles.bold}>agregar</Text>, <Text style={guideStyles.bold}>editar</Text> o <Text style={guideStyles.bold}>eliminar</Text> categorias segun tus necesidades.
            </Text>

            <Pressable
              onPress={closeGuide}
              style={guideStyles.dismissBtn}
            >
              <Text style={guideStyles.dismissText}>Entendido</Text>
            </Pressable>

            <Pressable
              onPress={() => setDontShowGuideAgain((prev) => !prev)}
              style={guideStyles.checkboxRow}
            >
              <Ionicons
                name={dontShowGuideAgain ? "checkbox" : "square-outline"}
                size={20}
                color={Colors.text.secondary}
              />
              <Text style={guideStyles.checkboxText}>No volver a mostrar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const guideStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: 28,
  },
  card: {
    backgroundColor: Colors.dark.card,
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  iconRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    marginBottom: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(167,139,250,0.15)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  cardTitle: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 18,
    color: Colors.text.primary,
    flex: 1,
  },
  sectionTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: Colors.text.primary,
    marginBottom: 6,
  },
  sectionDesc: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 19,
    marginBottom: 16,
  },
  segmentInfoList: {
    gap: 12,
    marginBottom: 16,
  },
  segmentInfoRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 10,
  },
  segmentInfoIconWrap: {
    width: 26,
    paddingTop: 2,
    alignItems: "center" as const,
  },
  segmentInfoText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 19,
    flex: 1,
  },
  bold: {
    fontFamily: "Outfit_700Bold",
    color: Colors.text.primary,
  },
  dismissBtn: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  dismissText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 15,
    color: Colors.text.primary,
  },
  checkboxRow: {
    marginTop: 14,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    alignSelf: "center" as const,
  },
  checkboxText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.text.muted,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.base,
  },
  headerRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
    marginBottom: 20,
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 14,
    overflow: "hidden" as const,
  },
  segmentHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    padding: 20,
  },
  segmentHeaderLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  segmentIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  segmentName: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: Colors.text.primary,
  },
  countBadge: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 13,
    color: Colors.text.muted,
  },
  categoryList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 8,
  },
  categoryRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.dark.borderSubtle,
    gap: 10,
  },
  categoryNameArea: {
    flex: 1,
  },
  categoryName: {
    fontFamily: "Outfit_500Medium",
    fontSize: 16,
    color: Colors.text.primary,
  },
  categoryActions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
  },
  editInput: {
    flex: 1,
    fontFamily: "Outfit_500Medium",
    fontSize: 16,
    color: Colors.text.primary,
    paddingVertical: 0,
  },
  addRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    marginTop: 6,
  },
  addInput: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: "Outfit_500Medium",
    fontSize: 16,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.brand.DEFAULT,
  },
  addConfirmBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.brand.DEFAULT,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  addBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginTop: 6,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  addBtnText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
  },
});
