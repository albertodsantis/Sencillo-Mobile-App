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
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/context/AuthContext";
import { useApp } from "@/lib/context/AppContext";
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  applyNotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from "@/lib/notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PHONE_PREFIXES = [
  "+58", "+1", "+34", "+57", "+52", "+56", "+51", "+55", "+44", "+33",
];
const FACE_ID_KEY = "@sencillo/face_id_enabled";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    profile,
    updateProfile,
    deleteAllTx,
    clearAccount,
    workspaces,
    activeWorkspaceId,
    setActiveWorkspace,
    createWorkspace,
    deleteWorkspace,
  } = useApp();

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
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');

  const [hasChanges, setHasChanges] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );
  const [notificationLoading, setNotificationLoading] = useState(true);
  const [faceIdEnabled, setFaceIdEnabled] = useState(false);
  const [faceIdLoading, setFaceIdLoading] = useState(true);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const topPadding = insets.top + webTopInset + 16;

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);


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
    const loadSettings = async () => {
      const prefs = await getNotificationPreferences();
      setNotificationPrefs(prefs);
      setNotificationLoading(false);

      const isFaceIdEnabled = (await AsyncStorage.getItem(FACE_ID_KEY)) === "true";
      setFaceIdEnabled(isFaceIdEnabled);
      setFaceIdLoading(false);
    };

    loadSettings();
  }, []);

  const handleToggleNotifications = useCallback(async (nextPrefs: NotificationPreferences) => {
    setNotificationLoading(true);
    try {
      const success = await applyNotificationPreferences(nextPrefs);
      if (!success) {
        const msg = "No se pudieron activar las notificaciones. Verifica los permisos en Ajustes.";
        if (Platform.OS === "web") alert(msg);
        else Alert.alert("Permiso denegado", msg);
        setNotificationLoading(false);
        return;
      }

      await saveNotificationPreferences(nextPrefs);
      setNotificationPrefs(nextPrefs);
      Haptics.selectionAsync();
    } catch {
      const msg = "Ocurrio un error con las notificaciones";
      if (Platform.OS === "web") alert(msg);
      else Alert.alert("Error", msg);
    } finally {
      setNotificationLoading(false);
    }
  }, []);

  const handleToggleFaceId = useCallback(async (value: boolean) => {
    setFaceIdLoading(true);
    await AsyncStorage.setItem(FACE_ID_KEY, value ? "true" : "false");
    setFaceIdEnabled(value);
    Haptics.selectionAsync();
    setFaceIdLoading(false);
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

  const handleCreateWorkspace = useCallback(async () => {
    const name = workspaceName.trim();
    if (!name) {
      const msg = 'Ingresa un nombre para el espacio';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Nombre requerido', msg);
      return;
    }

    try {
      await createWorkspace(name);
      setWorkspaceName('');
      setShowCreateWorkspaceModal(false);
      setShowWorkspaceMenu(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo crear el espacio';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
    }
  }, [workspaceName, createWorkspace]);



  const handleDeleteWorkspace = useCallback(async (workspaceId: string, workspaceName: string) => {
    const doDelete = async () => {
      try {
        await deleteWorkspace(workspaceId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'No se pudo eliminar el espacio';
        if (Platform.OS === 'web') alert(msg);
        else Alert.alert('Error', msg);
      }
    };

    const confirmMessage = `Se eliminará el espacio "${workspaceName}" y toda su información. Esta acción no se puede deshacer.`;

    if (Platform.OS === 'web') {
      if (confirm(confirmMessage)) await doDelete();
      return;
    }

    Alert.alert(
      'Eliminar espacio',
      confirmMessage,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => { void doDelete(); } },
      ],
    );
  }, [deleteWorkspace]);

  const closeWorkspaceMenu = useCallback(() => {
    setShowWorkspaceMenu(false);
    setShowCreateWorkspaceModal(false);
    setWorkspaceName('');
  }, []);

  const { signOut } = useAuth();

  const handleLogout = useCallback(() => {
    const doLogout = async () => {
      await signOut();
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
  }, [signOut]);

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
      await signOut();
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
  }, [clearAccount, router, signOut]);

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
          <Text style={styles.title}>Perfil</Text>
          {hasChanges ? (
            <Pressable onPress={handleSaveProfile} style={styles.saveHeaderBtn}>
              <Ionicons name="checkmark" size={22} color="#fff" />
            </Pressable>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        <View style={styles.workspaceSection}>
          <Text style={styles.workspaceLabel}>ESPACIO ACTIVO</Text>
          <Pressable style={styles.workspacePicker} onPress={() => setShowWorkspaceMenu(true)}>
            <View>
              <Text style={styles.workspaceName}>{activeWorkspace?.name ?? 'Personal'}</Text>
              <Text style={styles.workspaceHint}>Toca para cambiar o crear un espacio</Text>
            </View>
            <Ionicons name="chevron-down" size={18} color={Colors.text.muted} />
          </Pressable>
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
            onPress={() => setShowPrefixPicker(true)}
            style={styles.prefixBtn}
          >
            <Text style={styles.prefixText}>{phonePrefix}</Text>
            <Ionicons name="chevron-down" size={14} color={Colors.text.muted} />
          </Pressable>
          <TextInput
            style={[styles.fieldInput, { flex: 1, marginBottom: 0 }]}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Tu numero de telefono"
            placeholderTextColor={Colors.text.disabled}
            keyboardType="phone-pad"
          />
        </View>

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

        <Text style={styles.sectionLabel}>NOTIFICACIONES</Text>

        <View style={styles.card}>
          <View style={styles.rowItem}>
            <View style={styles.rowLeft}>
              <View style={[styles.rowIcon, { backgroundColor: "rgba(16,185,129,0.12)" }]}>
                <Ionicons name="notifications" size={18} color="#10b981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Activar todas</Text>
                <Text style={styles.rowSub}>Enciende o apaga todos los avisos de la app</Text>
              </View>
            </View>
            {notificationLoading ? (
              <ActivityIndicator size="small" color={Colors.brand.DEFAULT} />
            ) : (
              <Switch
                value={notificationPrefs.allEnabled}
                onValueChange={(value) =>
                  handleToggleNotifications({
                    allEnabled: value,
                    dailyReminder: value,
                    budgetAlerts: value,
                    weeklySummary: value,
                    fixedExpenseReminders: value,
                  })
                }
                trackColor={{ false: "rgba(255,255,255,0.1)", true: "rgba(16,185,129,0.4)" }}
                thumbColor={notificationPrefs.allEnabled ? Colors.brand.DEFAULT : "#555"}
              />
            )}
          </View>

          <View style={styles.rowItem}>
            <View style={styles.rowLeft}>
              <View style={[styles.rowIcon, { backgroundColor: "rgba(167,139,250,0.12)" }]}>
                <Ionicons name="time" size={18} color="#a78bfa" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Recordatorio diario</Text>
                <Text style={styles.rowSub}>Notificacion diaria a las 8:00 PM</Text>
              </View>
            </View>
            <Switch
              value={notificationPrefs.dailyReminder}
              disabled={notificationLoading || !notificationPrefs.allEnabled}
              onValueChange={(value) =>
                handleToggleNotifications({
                  ...notificationPrefs,
                  dailyReminder: value,
                })
              }
              trackColor={{ false: "rgba(255,255,255,0.1)", true: "rgba(16,185,129,0.4)" }}
              thumbColor={notificationPrefs.dailyReminder ? Colors.brand.DEFAULT : "#555"}
            />
          </View>

          <View style={styles.rowItem}>
            <View style={styles.rowLeft}>
              <View style={[styles.rowIcon, { backgroundColor: "rgba(251,146,60,0.12)" }]}>
                <Ionicons name="wallet" size={18} color="#fb923c" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Alertas de presupuesto</Text>
                <Text style={styles.rowSub}>Avisos cuando estes cerca de tus limites</Text>
              </View>
            </View>
            <Switch
              value={notificationPrefs.budgetAlerts}
              disabled={notificationLoading || !notificationPrefs.allEnabled}
              onValueChange={(value) =>
                handleToggleNotifications({
                  ...notificationPrefs,
                  budgetAlerts: value,
                })
              }
              trackColor={{ false: "rgba(255,255,255,0.1)", true: "rgba(16,185,129,0.4)" }}
              thumbColor={notificationPrefs.budgetAlerts ? Colors.brand.DEFAULT : "#555"}
            />
          </View>

          <View style={styles.rowItem}>
            <View style={styles.rowLeft}>
              <View style={[styles.rowIcon, { backgroundColor: "rgba(96,165,250,0.12)" }]}>
                <Ionicons name="calendar" size={18} color="#60a5fa" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Recordatorios de gastos fijos</Text>
                <Text style={styles.rowSub}>No olvides tus compromisos recurrentes</Text>
              </View>
            </View>
            <Switch
              value={notificationPrefs.fixedExpenseReminders}
              disabled={notificationLoading || !notificationPrefs.allEnabled}
              onValueChange={(value) =>
                handleToggleNotifications({
                  ...notificationPrefs,
                  fixedExpenseReminders: value,
                })
              }
              trackColor={{ false: "rgba(255,255,255,0.1)", true: "rgba(16,185,129,0.4)" }}
              thumbColor={notificationPrefs.fixedExpenseReminders ? Colors.brand.DEFAULT : "#555"}
            />
          </View>

          <View style={styles.rowItemNoBorder}>
            <View style={styles.rowLeft}>
              <View style={[styles.rowIcon, { backgroundColor: "rgba(244,114,182,0.12)" }]}>
                <Ionicons name="stats-chart" size={18} color="#f472b6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Resumen semanal</Text>
                <Text style={styles.rowSub}>Recibe un resumen del avance de tus finanzas</Text>
              </View>
            </View>
            <Switch
              value={notificationPrefs.weeklySummary}
              disabled={notificationLoading || !notificationPrefs.allEnabled}
              onValueChange={(value) =>
                handleToggleNotifications({
                  ...notificationPrefs,
                  weeklySummary: value,
                })
              }
              trackColor={{ false: "rgba(255,255,255,0.1)", true: "rgba(16,185,129,0.4)" }}
              thumbColor={notificationPrefs.weeklySummary ? Colors.brand.DEFAULT : "#555"}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>CUENTA Y SEGURIDAD</Text>

        <View style={styles.card}>

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

          <View style={styles.rowItem}>
            <View style={styles.rowLeft}>
              <View style={[styles.rowIcon, { backgroundColor: "rgba(45,212,191,0.14)" }]}>
                <MaterialCommunityIcons name="face-recognition" size={18} color="#2dd4bf" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Face ID</Text>
                <Text style={styles.rowSub}>
                  {faceIdEnabled ? "Proteccion biometrica activada" : "Activa desbloqueo rapido en este dispositivo"}
                </Text>
              </View>
            </View>
            {faceIdLoading ? (
              <ActivityIndicator size="small" color={Colors.brand.DEFAULT} />
            ) : (
              <Switch
                value={faceIdEnabled}
                onValueChange={handleToggleFaceId}
                trackColor={{ false: "rgba(255,255,255,0.1)", true: "rgba(16,185,129,0.4)" }}
                thumbColor={faceIdEnabled ? Colors.brand.DEFAULT : "#555"}
              />
            )}
          </View>

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

      <Modal
        visible={showPrefixPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPrefixPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowPrefixPicker(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Prefijo telefono</Text>
            {PHONE_PREFIXES.map((p) => (
              <Pressable
                key={p}
                onPress={() => {
                  setPhonePrefix(p);
                  setShowPrefixPicker(false);
                  Haptics.selectionAsync();
                }}
                style={[
                  styles.modalOption,
                  phonePrefix === p && styles.modalOptionActive,
                ]}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    phonePrefix === p && styles.modalOptionTextActive,
                  ]}
                >
                  {p}
                </Text>
                {phonePrefix === p && (
                  <Ionicons name="checkmark" size={18} color={Colors.brand.DEFAULT} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
      <Modal
        visible={showWorkspaceMenu}
        transparent
        animationType="fade"
        onRequestClose={closeWorkspaceMenu}
      >
        <KeyboardAvoidingView
          style={styles.workspaceMenuOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.workspaceMenuDismissLayer} onPress={closeWorkspaceMenu} />
          <View style={styles.workspaceMenuContainer}>
            <View style={styles.workspaceMenuCard}>
              {workspaces.map((workspace) => {
                const selected = workspace.id === activeWorkspaceId;
                const canDelete = !workspace.isDefault;

                return (
                  <View key={workspace.id} style={styles.workspaceMenuItem}>
                    <Pressable
                      style={styles.workspaceMenuMainAction}
                      onPress={async () => {
                        await setActiveWorkspace(workspace.id);
                        closeWorkspaceMenu();
                        Haptics.selectionAsync();
                      }}
                    >
                      <Text style={[styles.workspaceMenuName, selected && { color: Colors.brand.DEFAULT }]}>{workspace.name}</Text>
                      {selected ? <Ionicons name="checkmark" size={18} color={Colors.brand.DEFAULT} /> : null}
                    </Pressable>
                    {canDelete ? (
                      <Pressable
                        hitSlop={8}
                        style={styles.workspaceDeleteBtn}
                        onPress={() => handleDeleteWorkspace(workspace.id, workspace.name)}
                      >
                        <Feather name="trash-2" size={16} color={Colors.status.danger} />
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
              <Pressable
                style={styles.workspaceCreateBtn}
                onPress={() => setShowCreateWorkspaceModal((prev) => !prev)}
              >
                <Ionicons
                  name={showCreateWorkspaceModal ? 'remove' : 'add'}
                  size={18}
                  color={Colors.brand.DEFAULT}
                />
                <Text style={styles.workspaceCreateText}>Crear nuevo espacio</Text>
              </Pressable>
              {showCreateWorkspaceModal ? (
                <View style={styles.workspaceCreateInlineCard}>
                  <Text style={styles.workspaceCreateTitle}>Nuevo espacio</Text>
                  <TextInput
                    style={styles.workspaceCreateInput}
                    value={workspaceName}
                    onChangeText={setWorkspaceName}
                    placeholder="Ej. Casa o Negocio"
                    placeholderTextColor={Colors.text.disabled}
                    autoFocus
                  />
                  <View style={styles.workspaceCreateActions}>
                    <Pressable
                      style={styles.workspaceCancelBtn}
                      onPress={() => {
                        setShowCreateWorkspaceModal(false);
                        setWorkspaceName('');
                      }}
                    >
                      <Text style={styles.workspaceCancelText}>Cancelar</Text>
                    </Pressable>
                    <Pressable style={styles.workspaceSaveBtn} onPress={handleCreateWorkspace}>
                      <Text style={styles.workspaceSaveText}>Guardar</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  workspaceSection: {
    marginBottom: 14,
  },
  workspaceLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 12,
    color: Colors.text.disabled,
    marginBottom: 8,
    letterSpacing: 0.6,
  },
  workspacePicker: {
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 14,
    backgroundColor: Colors.dark.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  workspaceName: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: Colors.text.primary,
  },
  workspaceHint: {
    fontFamily: "Outfit_500Medium",
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 2,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end" as const,
  },
  modalSheet: {
    backgroundColor: Colors.dark.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  modalOption: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.borderSubtle,
  },
  modalOptionActive: {
    borderBottomColor: Colors.dark.borderSubtle,
  },
  modalOptionText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 16,
    color: Colors.text.secondary,
  },
  modalOptionTextActive: {
    fontFamily: "Outfit_700Bold",
    color: Colors.text.primary,
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
  rowItemNoBorder: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingVertical: 14,
    paddingHorizontal: 16,
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
  workspaceMenuCard: {
    backgroundColor: Colors.dark.card,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  workspaceMenuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  workspaceMenuDismissLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  workspaceMenuContainer: {
    paddingTop: 120,
    justifyContent: "flex-start" as const,
  },
  workspaceMenuItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.borderSubtle,
  },
  workspaceMenuMainAction: {
    flex: 1,
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  workspaceDeleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(239,68,68,0.12)",
  },
  workspaceMenuName: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 15,
    color: Colors.text.primary,
  },
  workspaceCreateBtn: {
    marginTop: 16,
    flexDirection: "row" as const,
    gap: 8,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.brand.DEFAULT,
  },
  workspaceCreateText: {
    fontFamily: "Outfit_600SemiBold",
    color: Colors.brand.DEFAULT,
  },
  workspaceCreateInlineCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginTop: 12,
    padding: 14,
  },
  workspaceCreateTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 18,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  workspaceCreateInput: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  workspaceCreateActions: {
    flexDirection: "row" as const,
    justifyContent: "flex-end" as const,
    gap: 10,
    marginTop: 10,
  },
  workspaceCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  workspaceCancelText: {
    fontFamily: "Outfit_600SemiBold",
    color: Colors.text.muted,
  },
  workspaceSaveBtn: {
    backgroundColor: Colors.brand.DEFAULT,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  workspaceSaveText: {
    fontFamily: "Outfit_600SemiBold",
    color: '#fff',
  },
});
