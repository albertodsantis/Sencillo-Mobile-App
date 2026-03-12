import React, { useMemo } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface BottomSheetPickerProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function BottomSheetPicker({
  visible,
  onClose,
  title,
  children,
}: BottomSheetPickerProps) {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;

  const sheetStyles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          justifyContent: "flex-end" as const,
          paddingHorizontal: isTablet ? 16 : 0,
          paddingBottom: isTablet ? 16 : 0,
        },
        sheet: {
          alignSelf: "center" as const,
          width: "100%",
          maxWidth: isTablet ? 560 : undefined,
          backgroundColor: Colors.dark.surface,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderBottomLeftRadius: isTablet ? 24 : 0,
          borderBottomRightRadius: isTablet ? 24 : 0,
          paddingBottom: 40,
          maxHeight: height * 0.65,
        },
        handle: {
          width: 36,
          height: 4,
          borderRadius: 2,
          backgroundColor: Colors.dark.highlight,
          alignSelf: "center" as const,
          marginTop: 10,
          marginBottom: 8,
        },
        header: {
          flexDirection: "row" as const,
          justifyContent: "space-between" as const,
          alignItems: "center" as const,
          paddingHorizontal: 20,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: Colors.dark.borderSubtle,
        },
        title: {
          fontFamily: "Outfit_700Bold",
          fontSize: 16,
          color: Colors.text.primary,
        },
        closeBtn: {
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: "rgba(255,255,255,0.06)",
          alignItems: "center" as const,
          justifyContent: "center" as const,
        },
      }),
    [height, isTablet],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={sheetStyles.overlay} onPress={onClose}>
        <Pressable style={sheetStyles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={sheetStyles.handle} />
          <View style={sheetStyles.header}>
            <Text style={sheetStyles.title}>{title}</Text>
            <Pressable
              onPress={onClose}
              style={sheetStyles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel={`Cerrar selector de ${title.toLowerCase()}`}
            >
              <Ionicons name="close" size={20} color={Colors.text.secondary} />
            </Pressable>
          </View>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
