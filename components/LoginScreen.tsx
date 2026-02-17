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
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
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
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const handleSubmit = async () => {
    setError("");
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      const result = mode === "login"
        ? await signInWithEmail(email, password)
        : await signUpWithEmail(name, email, password);
      if (!result.success && result.error) {
        setError(result.error);
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      setError("Algo salio mal. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleGooglePress = async () => {
    setError("");
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError("Google Sign-In requiere configuracion adicional. Usa email y contrasena por ahora.");
  };

  const toggleMode = () => {
    setMode(m => m === "login" ? "signup" : "login");
    setError("");
    setName("");
    setEmail("");
    setPassword("");
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#020617", "#0a1628", "#0d2818", "#020617"]}
        locations={[0, 0.3, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />

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
            <Text style={styles.appName}>Sencillo</Text>
            <Text style={styles.tagline}>Tus finanzas, simplificadas</Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.modeToggle}>
              <Pressable
                style={[styles.modeButton, mode === "login" && styles.modeButtonActive]}
                onPress={() => mode !== "login" && toggleMode()}
              >
                <Text style={[styles.modeButtonText, mode === "login" && styles.modeButtonTextActive]}>
                  Iniciar Sesion
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modeButton, mode === "signup" && styles.modeButtonActive]}
                onPress={() => mode !== "signup" && toggleMode()}
              >
                <Text style={[styles.modeButtonText, mode === "signup" && styles.modeButtonTextActive]}>
                  Registrarse
                </Text>
              </Pressable>
            </View>

            {mode === "signup" && (
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={18} color={Colors.text.muted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Nombre completo"
                  placeholderTextColor={Colors.text.disabled}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={18} color={Colors.text.muted} style={styles.inputIcon} />
              <TextInput
                ref={emailRef}
                style={styles.input}
                placeholder="Email"
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

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.text.muted} style={styles.inputIcon} />
              <TextInput
                ref={passwordRef}
                style={[styles.input, { flex: 1 }]}
                placeholder="Contrasena"
                placeholderTextColor={Colors.text.disabled}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              <Pressable onPress={() => setShowPassword(p => !p)} hitSlop={12}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={Colors.text.muted}
                />
              </Pressable>
            </View>

            {!!error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={14} color={Colors.status.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [styles.submitButton, pressed && { opacity: 0.85 }]}
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

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o continua con</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              style={({ pressed }) => [styles.googleButton, pressed && { opacity: 0.85 }]}
              onPress={handleGooglePress}
              disabled={loading}
            >
              <View style={styles.googleIconCircle}>
                <Text style={styles.googleG}>G</Text>
              </View>
              <Text style={styles.googleText}>Google</Text>
            </Pressable>
          </View>

          <Pressable onPress={toggleMode} style={styles.switchMode}>
            <Text style={styles.switchModeText}>
              {mode === "login" ? "No tienes cuenta? " : "Ya tienes cuenta? "}
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
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 36,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoText: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 36,
    color: "#fff",
    zIndex: 1,
  },
  appName: {
    fontFamily: "Outfit_700Bold",
    fontSize: 32,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  tagline: {
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    color: Colors.text.muted,
  },
  formCard: {
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: Colors.dark.base,
    borderRadius: 12,
    padding: 3,
    marginBottom: 20,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  modeButtonActive: {
    backgroundColor: Colors.dark.card,
  },
  modeButtonText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    color: Colors.text.muted,
  },
  modeButtonTextActive: {
    color: Colors.text.primary,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.base,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.borderSubtle,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    color: Colors.text.primary,
    height: 50,
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
  },
  submitButton: {
    height: 50,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 16,
    color: "#fff",
    zIndex: 1,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.dark.border,
  },
  dividerText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.text.disabled,
    marginHorizontal: 12,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: 12,
    backgroundColor: Colors.dark.base,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    gap: 10,
  },
  googleIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  googleG: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: "#4285F4",
  },
  googleText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 15,
    color: Colors.text.primary,
  },
  switchMode: {
    marginTop: 24,
    alignItems: "center",
  },
  switchModeText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: Colors.text.muted,
  },
  switchModeLink: {
    fontFamily: "Outfit_600SemiBold",
    color: Colors.brand.DEFAULT,
  },
});
