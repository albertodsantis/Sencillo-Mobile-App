import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Colors from "@/constants/colors";
import { useApp } from "@/lib/context/AppContext";

function SettingsRow({
  icon,
  label,
  sublabel,
  onPress,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingsRow,
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.settingsRowLeft}>
        {icon}
        <View>
          <Text
            style={[
              styles.settingsLabel,
              danger && { color: "#ef4444" },
            ]}
          >
            {label}
          </Text>
          {sublabel && (
            <Text style={styles.settingsSublabel}>{sublabel}</Text>
          )}
        </View>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={Colors.text.disabled}
      />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { deleteAllTx, refreshRates } = useApp();

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const topPadding = insets.top + webTopInset + 16;

  const handleDeleteAll = () => {
    if (Platform.OS === "web") {
      if (confirm("Esto eliminara TODAS tus transacciones. Esta seguro?")) {
        deleteAllTx();
      }
    } else {
      Alert.alert(
        "Eliminar datos",
        "Esto eliminara TODAS tus transacciones. Esta seguro?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            style: "destructive",
            onPress: () => deleteAllTx(),
          },
        ]
      );
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: topPadding, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Ajustes</Text>

      <Text style={styles.sectionLabel}>PERFIL</Text>

      <View style={styles.section}>
        <SettingsRow
          icon={
            <Ionicons
              name="person-circle"
              size={22}
              color={Colors.brand.DEFAULT}
            />
          }
          label="Mi Perfil"
          sublabel="Nombre, contacto, contrasena"
          onPress={() => router.push("/profile")}
        />
      </View>

      <Text style={styles.sectionLabel}>CONFIGURACION</Text>

      <View style={styles.section}>
        <SettingsRow
          icon={
            <MaterialCommunityIcons
              name="format-list-bulleted"
              size={20}
              color={Colors.brand.DEFAULT}
            />
          }
          label="Categorias"
          sublabel="Gestionar categorias por segmento"
          onPress={() => router.push("/categories")}
        />
        <SettingsRow
          icon={
            <Ionicons
              name="document-text"
              size={20}
              color="#60a5fa"
            />
          }
          label="Reporte P&L"
          sublabel="Ver reporte financiero detallado"
          onPress={() => router.push("/report")}
        />
        <SettingsRow
          icon={
            <Feather
              name="refresh-cw"
              size={18}
              color={Colors.brand.light}
            />
          }
          label="Actualizar tasas"
          sublabel="Obtener tasas de cambio actualizadas"
          onPress={refreshRates}
        />
      </View>

      <Text style={styles.sectionLabel}>DATOS</Text>

      <View style={styles.section}>
        <SettingsRow
          icon={
            <Ionicons name="trash" size={20} color="#ef4444" />
          }
          label="Eliminar todas las transacciones"
          sublabel="Esta accion no se puede deshacer"
          onPress={handleDeleteAll}
          danger
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Sencillo v1.0</Text>
        <Text style={styles.footerSubtext}>
          Finanzas personales para Venezuela
        </Text>
      </View>
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
    marginBottom: 24,
  },
  sectionLabel: {
    fontFamily: "Outfit_700Bold",
    fontSize: 11,
    color: Colors.text.muted,
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  section: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 24,
    overflow: "hidden" as const,
  },
  settingsRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.borderSubtle,
  },
  settingsRowLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
  },
  settingsLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 15,
    color: Colors.text.primary,
  },
  settingsSublabel: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 1,
  },
  footer: {
    alignItems: "center" as const,
    paddingVertical: 24,
    gap: 4,
  },
  footerText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: Colors.text.muted,
  },
  footerSubtext: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.text.disabled,
  },
});
