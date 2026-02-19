import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import AmbientGlow from "@/components/AmbientGlow";
import { useAuth } from "@/lib/context/AuthContext";

type Mode = "login" | "signup";

function LoginContent() {
  const insets = useSafeAreaInsets();
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const handleSubmit = async () => {
    setError("");
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      const result =
        mode === "login"
          ? await signInWithEmail(email, password)
          : await signUpWithEmail(name, email, password);
      if (!result.success && result.error) {
        setError(result.error);
        if (Platform.OS !== "web")
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      setError("Algo salio mal. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleGooglePress = async () => {
    setError("");
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError(
      "Google Sign-In requiere configuracion adicional. Usa email y contrasena por ahora.",
    );
  };

  const handleApplePress = async () => {
    setError("");
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError(
      "Apple Sign-In requiere configuracion adicional. Usa email y contrasena por ahora.",
    );
  };

  const toggleMode = () => {
    setMode((m) => (m === "login" ? "signup" : "login"));
    setError("");
    setName("");
    setEmail("");
    setPassword("");
  };

  return (
    <View style={styles.root}>
      <AmbientGlow intensity={0.3} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Platform.OS === "web" ? 67 + 40 : insets.top + 40,
              paddingBottom: Platform.OS === "web" ? 34 + 40 : insets.bottom + 40,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <LinearGradient
                colors={[Colors.brand.DEFAULT, Colors.brand.dark]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Text style={styles.logoText}>S</Text>
            </View>
            <Text style={styles.welcomeTitle}>Sencillo</Text>
            <Text style={styles.welcomeSubtitle}>
              Tus finanzas personales en Venezuela
            </Text>
          </View>

          <View style={styles.socialRow}>
            <Pressable
              style={({ pressed }) => [
                styles.socialButton,
                pressed && { opacity: 0.7 },
              ]}
              onPress={handleApplePress}
              disabled={loading}
            >
              <Ionicons name="logo-apple" size={22} color={Colors.text.primary} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.socialButton,
                styles.socialButtonWide,
                pressed && { opacity: 0.7 },
              ]}
              onPress={handleGooglePress}
              disabled={loading}
            >
              <Text style={styles.googleG}>G</Text>
            </Pressable>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>O</Text>
            <View style={styles.dividerLine} />
          </View>

          {mode === "signup" && (
            <View style={styles.fieldGroup}>
              <View style={styles.inputContainer}>
                <TextInput
                  ref={nameRef}
                  style={styles.input}
                  placeholder="Tu nombre completo"
                  placeholderTextColor={Colors.text.disabled}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              </View>
            </View>
          )}

          <View style={styles.fieldGroup}>
            <View style={styles.inputContainer}>
              <TextInput
                ref={emailRef}
                style={styles.input}
                placeholder="Ingresa tu email..."
                placeholderTextColor={Colors.text.disabled}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.inputContainer}>
              <TextInput
                ref={passwordRef}
                style={[styles.input, { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor={Colors.text.disabled}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              <Pressable
                onPress={() => setShowPassword((p) => !p)}
                hitSlop={12}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={Colors.text.muted}
                />
              </Pressable>
            </View>
          </View>

          {!!error && (
            <View style={styles.errorContainer}>
              <Ionicons
                name="alert-circle"
                size={14}
                color={Colors.status.danger}
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              pressed && { opacity: 0.85 },
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <LinearGradient
              colors={[Colors.brand.DEFAULT, Colors.brand.dark]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitText}>
                {mode === "login" ? "Iniciar Sesion" : "Crear Cuenta"}
              </Text>
            )}
          </Pressable>

          <Pressable onPress={toggleMode} style={styles.switchMode}>
            <Text style={styles.switchModeText}>
              {mode === "login"
                ? "No tienes cuenta? "
                : "Ya tienes cuenta? "}
              <Text style={styles.switchModeLink}>
                {mode === "login" ? "Registrate" : "Inicia Sesion"}
              </Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export default function LoginScreen() {
  return (
    <SafeAreaProvider>
      <LoginContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.dark.base,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  logoText: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 36,
    color: "#fff",
    zIndex: 1,
  },
  welcomeTitle: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 26,
    color: Colors.text.primary,
    marginBottom: 6,
  },
  welcomeSubtitle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: Colors.text.muted,
  },
  socialRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  socialButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  socialButtonWide: {
    flex: 1.5,
  },
  googleG: {
    fontFamily: "Outfit_700Bold",
    fontSize: 20,
    color: "#4285F4",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.dark.border,
  },
  dividerText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: Colors.text.disabled,
    marginHorizontal: 16,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    height: 52,
  },
  input: {
    flex: 1,
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    color: Colors.text.primary,
    height: 52,
  },
  eyeButton: {
    paddingLeft: 8,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  errorText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.status.danger,
    flex: 1,
  },
  submitButton: {
    height: 54,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: "#fff",
    zIndex: 1,
  },
  switchMode: {
    marginTop: 28,
    alignItems: "center",
  },
  switchModeText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: Colors.text.muted,
  },
  switchModeLink: {
    fontFamily: "Outfit_700Bold",
    color: Colors.brand.DEFAULT,
  },
});
