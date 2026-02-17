import React, { useState, useCallback, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  Alert,
  KeyboardAvoidingView,
  Switch,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp } from "@/lib/context/AppContext";
import {
  scheduleDailyReminder,
  cancelDailyReminder,
  isReminderEnabled,
} from "@/lib/notifications";

const PHONE_PREFIXES = [
  "+58", "+1", "+34", "+57", "+52", "+56", "+51", "+55", "+44", "+33",
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, updateProfile, deleteAllTx, clearAccount } = useApp();

  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [phonePrefix, setPhonePrefix] = useState(profile.phonePrefix);
  const [phoneNumber, setPhoneNumber] = useState(profile.phoneNumber);
  const [email, setEmail] = useState(profile.email);

  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPrefixPicker, setShowPrefixPicker] = useState(false);

  const [hasChanges, setHasChanges] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(true);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const topPadding = insets.top + webTopInset + 16;

  useEffect(() => {
    const changed =
      firstName !== profile.firstName ||
      lastName !== profile.lastName ||
      phonePrefix !== profile.phonePrefix ||
      phoneNumber !== profile.phoneNumber ||
      email !== profile.email;
    setHasChanges(changed);
  }, [firstName, lastName, phonePrefix, phoneNumber, email, profile]);

  useEffect(() => {
    isReminderEnabled().then((val) => {
      setReminderEnabled(val);
      setReminderLoading(false);
    });
  }, []);

  const handleToggleReminder = useCallback(async (value: boolean) => {
    setReminderLoading(true);
    try {
      if (value) {
        const success = await scheduleDailyReminder();
        if (!success) {
          const msg = "No se pudieron activar las notificaciones. Verifica los permisos en Ajustes.";
          if (Platform.OS === "web") alert(msg);
          else Alert.alert("Permiso denegado", msg);
          setReminderLoading(false);
          return;
        }
        setReminderEnabled(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await cancelDailyReminder();
        setReminderEnabled(false);
        Haptics.selectionAsync();
      }
    } catch {
      const msg = "Ocurrio un error con las notificaciones";
      if (Platform.OS === "web") alert(msg);
      else Alert.alert("Error", msg);
    } finally {
      setReminderLoading(false);
    }
  }, []);

  const handleSaveProfile = useCallback(async () => {
    await updateProfile({
      ...profile,
      firstName,
      lastName,
      phonePrefix,
      phoneNumber,
      email,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setHasChanges(false);
  }, [firstName, lastName, phonePrefix, phoneNumber, email, profile, updateProfile]);

  const handleChangePassword = useCallback(async () => {
    if (profile.password && currentPassword !== profile.password) {
      const msg = "La contrasena actual no es correcta";
      if (Platform.OS === "web") alert(msg);
      else Alert.alert("Error", msg);
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      const msg = "La nueva contrasena debe tener al menos 4 caracteres";
      if (Platform.OS === "web") alert(msg);
      else Alert.alert("Error", msg);
      return;
    }
    if (newPassword !== confirmPassword) {
      const msg = "Las contrasenas no coinciden";
      if (Platform.OS === "web") alert(msg);
      else Alert.alert("Error", msg);
      return;
    }
    await updateProfile({ ...profile, password: newPassword });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowPasswordChange(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    const successMsg = "Contrasena actualizada correctamente";
    if (Platform.OS === "web") alert(successMsg);
    else Alert.alert("Listo", successMsg);
  }, [currentPassword, newPassword, confirmPassword, profile, updateProfile]);

  const handleLogout = useCallback(() => {
    const doLogout = () => {
      router.replace("/");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    };
    if (Platform.OS === "web") {
      if (confirm("Cerrar sesion? Tus datos se mantendran guardados.")) doLogout();
    } else {
      Alert.alert("Cerrar Sesion", "Tus datos se mantendran guardados.", [
        { text: "Cancelar", style: "cancel" },
        { text: "Cerrar Sesion", onPress: doLogout },
      ]);
    }
  }, [router]);

  const handleResetTransactions = useCallback(() => {
    const doReset = async () => {
      await deleteAllTx();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      const msg = "Todos los movimientos han sido eliminados";
      if (Platform.OS === "web") alert(msg);
      else Alert.alert("Listo", msg);
    };
    if (Platform.OS === "web") {
      if (confirm("Esto eliminara TODOS tus movimientos. Esta accion no se puede deshacer.")) doReset();
    } else {
      Alert.alert(
        "Resetear Movimientos",
        "Esto eliminara TODOS tus movimientos. Esta accion no se puede deshacer.",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Eliminar Todo", style: "destructive", onPress: doReset },
        ]
      );
    }
  }, [deleteAllTx]);

  const handleDeleteAccount = useCallback(() => {
    const doDelete = async () => {
      await clearAccount();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      router.replace("/");
    };
    if (Platform.OS === "web") {
      if (
        confirm(
          "ATENCION: Esto eliminara TODA tu informacion incluyendo perfil, movimientos, categorias y presupuestos. Esta accion NO se puede deshacer."
        )
      )
        doDelete();
    } else {
      Alert.alert(
        "Eliminar Cuenta",
        "ATENCION: Esto eliminara TODA tu informacion incluyendo perfil, movimientos, categorias y presupuestos. Esta accion NO se puede deshacer.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar Todo",
            style: "destructive",
            onPress: doDelete,
          },
        ]
      );
    }
  }, [clearAccount, router]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.dark.base }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingTop: topPadding,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.text.secondary} />
          </Pressable>
          <Text style={styles.title}>Mi Perfil</Text>
          {hasChanges ? (
            <Pressable onPress={handleSaveProfile} style={styles.saveHeaderBtn}>
              <Ionicons name="checkmark" size={22} color="#fff" />
            </Pressable>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        <TextInput
          style={styles.fieldInput}
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Tu nombre"
          placeholderTextColor={Colors.text.disabled}
          autoCapitalize="words"
        />
        <TextInput
          style={styles.fieldInput}
          value={lastName}
          onChangeText={setLastName}
          placeholder="Tu apellido"
          placeholderTextColor={Colors.text.disabled}
          autoCapitalize="words"
        />

        <View style={styles.phoneRow}>
          <Pressable
            onPress={() => setShowPrefixPicker(!showPrefixPicker)}
            style={styles.prefixBtn}
          >
            <Text style={styles.prefixText}>{phonePrefix}</Text>
            <Ionicons name="chevron-down" size={14} color={Colors.text.muted} />
          </Pressable>
          <TextInput
            style={[styles.fieldInput, { flex: 1 }]}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Tu numero de telefono"
            placeholderTextColor={Colors.text.disabled}
            keyboardType="phone-pad"
          />
        </View>
        {showPrefixPicker && (
          <View style={styles.prefixPicker}>
            {PHONE_PREFIXES.map((p) => (
              <Pressable
                key={p}
                onPress={() => {
                  setPhonePrefix(p);
                  setShowPrefixPicker(false);
                  Haptics.selectionAsync();
                }}
                style={[
                  styles.prefixOption,
                  phonePrefix === p && styles.prefixOptionActive,
                ]}
              >
                <Text
                  style={[
                    styles.prefixOptionText,
                    phonePrefix === p && styles.prefixOptionTextActive,
                  ]}
                >
                  {p}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <TextInput
          style={styles.fieldInput}
          value={email}
          onChangeText={setEmail}
          placeholder="Tu email"
          placeholderTextColor={Colors.text.disabled}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {hasChanges && (
          <Pressable
            onPress={handleSaveProfile}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={styles.saveButtonText}>Guardar Cambios</Text>
          </Pressable>
        )}

        <Text style={styles.sectionLabel}>CUENTA Y SEGURIDAD</Text>

        <View style={styles.card}>
          <View style={styles.rowItem}>
            <View style={styles.rowLeft}>
              <View style={[styles.rowIcon, { backgroundColor: "rgba(167,139,250,0.12)" }]}>
                <Ionicons name="notifications" size={18} color="#a78bfa" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Recordatorio diario</Text>
                <Text style={styles.rowSub}>
                  {reminderEnabled ? "Activo - 8:00 PM" : "Recibe un aviso cada dia"}
                </Text>
              </View>
            </View>
            {reminderLoading ? (
              <ActivityIndicator size="small" color={Colors.brand.DEFAULT} />
            ) : (
              <Switch
                value={reminderEnabled}
                onValueChange={handleToggleReminder}
                trackColor={{ false: "rgba(255,255,255,0.1)", true: "rgba(16,185,129,0.4)" }}
                thumbColor={reminderEnabled ? Colors.brand.DEFAULT : "#555"}
              />
            )}
          </View>

          <Pressable
            onPress={() => setShowPasswordChange(!showPasswordChange)}
            style={({ pressed }) => [styles.rowItem, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.rowIcon, { backgroundColor: "rgba(234,179,8,0.12)" }]}>
                <Ionicons name="lock-closed" size={18} color="#eab308" />
              </View>
              <View>
                <Text style={styles.rowLabel}>Cambiar Contrasena</Text>
                <Text style={styles.rowSub}>
                  {profile.password ? "Configurada" : "Sin contrasena"}
                </Text>
              </View>
            </View>
            <Ionicons
              name={showPasswordChange ? "chevron-up" : "chevron-forward"}
              size={18}
              color={Colors.text.disabled}
            />
          </Pressable>

          {showPasswordChange && (
            <View style={styles.passwordArea}>
              {profile.password ? (
                <TextInput
                  style={styles.pwInput}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Contrasena actual"
                  placeholderTextColor={Colors.text.disabled}
                  secureTextEntry
                  autoCapitalize="none"
                />
              ) : null}
              <TextInput
                style={styles.pwInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Nueva contrasena (min. 4)"
                placeholderTextColor={Colors.text.disabled}
                secureTextEntry
                autoCapitalize="none"
              />
              <TextInput
                style={styles.pwInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirmar contrasena"
                placeholderTextColor={Colors.text.disabled}
                secureTextEntry
                autoCapitalize="none"
              />
              <View style={styles.pwActions}>
                <Pressable onPress={handleChangePassword} style={styles.pwSaveBtn}>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                </Pressable>
                <Pressable
                  onPress={() => {
                    setShowPasswordChange(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  style={styles.pwCancelBtn}
                >
                  <Ionicons name="close" size={18} color={Colors.text.muted} />
                </Pressable>
              </View>
            </View>
          )}

          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [styles.rowItem, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.rowIcon, { backgroundColor: "rgba(255,255,255,0.06)" }]}>
                <MaterialCommunityIcons name="logout" size={18} color={Colors.text.secondary} />
              </View>
              <Text style={styles.rowLabel}>Cerrar Sesion</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.text.disabled} />
          </Pressable>

          <Pressable
            onPress={handleResetTransactions}
            style={({ pressed }) => [styles.rowItem, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.rowIcon, { backgroundColor: "rgba(251,146,60,0.12)" }]}>
                <Feather name="refresh-cw" size={16} color="#fb923c" />
              </View>
              <View>
                <Text style={[styles.rowLabel, { color: "#fb923c" }]}>Resetear Movimientos</Text>
                <Text style={styles.rowSub}>Eliminar todas las transacciones</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.text.disabled} />
          </Pressable>

          <Pressable
            onPress={handleDeleteAccount}
            style={({ pressed }) => [styles.rowItem, { borderBottomWidth: 0 }, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.rowIcon, { backgroundColor: "rgba(239,68,68,0.12)" }]}>
                <Ionicons name="trash" size={18} color="#ef4444" />
              </View>
              <View>
                <Text style={[styles.rowLabel, { color: "#ef4444" }]}>Eliminar Cuenta</Text>
                <Text style={styles.rowSub}>Borrar toda la informacion</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.text.disabled} />
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.base,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 28,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  title: {
    fontFamily: "Outfit_900Black",
    fontSize: 20,
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  saveHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.brand.DEFAULT,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  fieldInput: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: "Outfit_500Medium",
    fontSize: 15,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 10,
  },
  phoneRow: {
    flexDirection: "row" as const,
    gap: 8,
    marginBottom: 10,
  },
  prefixBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    minWidth: 80,
  },
  prefixText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 15,
    color: Colors.text.primary,
  },
  prefixPicker: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 6,
    marginBottom: 10,
  },
  prefixOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  prefixOptionActive: {
    backgroundColor: Colors.brand.DEFAULT,
    borderColor: Colors.brand.DEFAULT,
  },
  prefixOptionText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: Colors.text.secondary,
  },
  prefixOptionTextActive: {
    color: "#fff",
  },
  saveButton: {
    backgroundColor: Colors.brand.DEFAULT,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center" as const,
    marginTop: 4,
    marginBottom: 10,
  },
  saveButtonText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 15,
    color: "#fff",
  },
  sectionLabel: {
    fontFamily: "Outfit_700Bold",
    fontSize: 11,
    color: Colors.text.muted,
    letterSpacing: 1,
    marginTop: 18,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: "hidden" as const,
  },
  rowItem: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.borderSubtle,
  },
  rowLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    flex: 1,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  rowLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.text.primary,
  },
  rowSub: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: Colors.text.muted,
    marginTop: 1,
  },
  passwordArea: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.borderSubtle,
  },
  pwInput: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  pwActions: {
    flexDirection: "row" as const,
    gap: 8,
    marginTop: 2,
  },
  pwSaveBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.brand.DEFAULT,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  pwCancelBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
});
