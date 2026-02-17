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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp } from "@/lib/context/AppContext";

const PHONE_PREFIXES = [
  "+58",
  "+1",
  "+34",
  "+57",
  "+52",
  "+56",
  "+51",
  "+55",
  "+44",
  "+33",
];

function ProfileField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
  editable,
  rightElement,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "phone-pad" | "numeric";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  secureTextEntry?: boolean;
  editable?: boolean;
  rightElement?: React.ReactNode;
}) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldInputRow}>
        <TextInput
          style={[
            styles.fieldInput,
            editable === false && styles.fieldInputDisabled,
            rightElement ? { flex: 1 } : undefined,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.text.disabled}
          keyboardType={keyboardType || "default"}
          autoCapitalize={autoCapitalize || "sentences"}
          secureTextEntry={secureTextEntry}
          editable={editable !== false}
        />
        {rightElement}
      </View>
    </View>
  );
}

function ActionRow({
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
        styles.actionRow,
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.actionRowLeft}>
        {icon}
        <View>
          <Text
            style={[
              styles.actionLabel,
              danger && { color: "#ef4444" },
            ]}
          >
            {label}
          </Text>
          {sublabel && (
            <Text style={styles.actionSublabel}>{sublabel}</Text>
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

  const initials =
    (firstName?.[0] || "").toUpperCase() +
    (lastName?.[0] || "").toUpperCase() || "?";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
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

        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.avatarName}>
            {firstName || lastName
              ? `${firstName} ${lastName}`.trim()
              : "Tu Nombre"}
          </Text>
          {email ? (
            <Text style={styles.avatarEmail}>{email}</Text>
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>INFORMACION PERSONAL</Text>

        <View style={styles.section}>
          <ProfileField
            label="Nombre"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Tu nombre"
            autoCapitalize="words"
          />
          <ProfileField
            label="Apellido"
            value={lastName}
            onChangeText={setLastName}
            placeholder="Tu apellido"
            autoCapitalize="words"
          />
        </View>

        <Text style={styles.sectionLabel}>CONTACTO</Text>

        <View style={styles.section}>
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Telefono Movil</Text>
            <View style={styles.phoneRow}>
              <Pressable
                onPress={() => setShowPrefixPicker(!showPrefixPicker)}
                style={styles.prefixBtn}
              >
                <Text style={styles.prefixText}>{phonePrefix}</Text>
                <Ionicons
                  name="chevron-down"
                  size={14}
                  color={Colors.text.muted}
                />
              </Pressable>
              <TextInput
                style={styles.phoneInput}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Numero"
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
          </View>
          <ProfileField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="tu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

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

        <Text style={styles.sectionLabel}>SEGURIDAD</Text>

        <View style={styles.section}>
          {!showPasswordChange ? (
            <ActionRow
              icon={<Ionicons name="lock-closed" size={20} color="#eab308" />}
              label="Cambiar Contrasena"
              sublabel={
                profile.password
                  ? "Contrasena configurada"
                  : "Sin contrasena"
              }
              onPress={() => setShowPasswordChange(true)}
            />
          ) : (
            <View style={styles.passwordSection}>
              {profile.password ? (
                <ProfileField
                  label="Contrasena Actual"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Ingresa tu contrasena actual"
                  secureTextEntry
                  autoCapitalize="none"
                />
              ) : null}
              <ProfileField
                label="Nueva Contrasena"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Minimo 4 caracteres"
                secureTextEntry
                autoCapitalize="none"
              />
              <ProfileField
                label="Confirmar Contrasena"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repetir contrasena"
                secureTextEntry
                autoCapitalize="none"
              />
              <View style={styles.passwordActions}>
                <Pressable
                  onPress={handleChangePassword}
                  style={styles.passwordSaveBtn}
                >
                  <Text style={styles.passwordSaveBtnText}>Guardar</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setShowPasswordChange(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  style={styles.passwordCancelBtn}
                >
                  <Text style={styles.passwordCancelBtnText}>Cancelar</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        <Text style={styles.sectionLabel}>CUENTA</Text>

        <View style={styles.section}>
          <ActionRow
            icon={
              <MaterialCommunityIcons
                name="logout"
                size={20}
                color={Colors.text.secondary}
              />
            }
            label="Cerrar Sesion"
            onPress={handleLogout}
          />
          <ActionRow
            icon={<Feather name="refresh-cw" size={18} color="#fb923c" />}
            label="Resetear Movimientos"
            sublabel="Eliminar todas las transacciones"
            onPress={handleResetTransactions}
            danger
          />
          <ActionRow
            icon={<Ionicons name="trash" size={20} color="#ef4444" />}
            label="Eliminar Cuenta"
            sublabel="Borrar toda la informacion permanentemente"
            onPress={handleDeleteAccount}
            danger
          />
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
    marginBottom: 24,
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
  avatarSection: {
    alignItems: "center" as const,
    marginBottom: 28,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.brand.dark,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 3,
    borderColor: Colors.brand.DEFAULT,
    marginBottom: 12,
  },
  avatarText: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 28,
    color: Colors.brand.light,
  },
  avatarName: {
    fontFamily: "Outfit_700Bold",
    fontSize: 20,
    color: Colors.text.primary,
    letterSpacing: -0.3,
  },
  avatarEmail: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.text.muted,
    marginTop: 2,
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
  fieldContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.borderSubtle,
  },
  fieldLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 11,
    color: Colors.text.muted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  fieldInputRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  fieldInput: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Outfit_500Medium",
    fontSize: 15,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  fieldInputDisabled: {
    opacity: 0.5,
  },
  phoneRow: {
    flexDirection: "row" as const,
    gap: 8,
  },
  prefixBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    minWidth: 80,
  },
  prefixText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 15,
    color: Colors.text.primary,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Outfit_500Medium",
    fontSize: 15,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  prefixPicker: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 6,
    marginTop: 10,
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
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center" as const,
    marginBottom: 24,
    shadowColor: Colors.brand.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  saveButtonText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: "#fff",
  },
  actionRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.borderSubtle,
  },
  actionRowLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
  },
  actionLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 15,
    color: Colors.text.primary,
  },
  actionSublabel: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 1,
  },
  passwordSection: {
    padding: 0,
  },
  passwordActions: {
    flexDirection: "row" as const,
    gap: 10,
    padding: 16,
    paddingTop: 8,
  },
  passwordSaveBtn: {
    flex: 1,
    backgroundColor: Colors.brand.DEFAULT,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center" as const,
  },
  passwordSaveBtnText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: "#fff",
  },
  passwordCancelBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  passwordCancelBtnText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.text.secondary,
  },
});
