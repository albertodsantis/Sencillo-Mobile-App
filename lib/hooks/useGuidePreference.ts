import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function useGuidePreference(storageKey: string) {
  const [showGuide, setShowGuide] = useState(false);
  const [dontShowGuideAgain, setDontShowGuideAgain] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadGuidePreference = async () => {
      const dismissed = await AsyncStorage.getItem(storageKey);
      if (!mounted) return;

      const isDismissed = dismissed === "true";
      setDontShowGuideAgain(isDismissed);
      setShowGuide(!isDismissed);
    };

    void loadGuidePreference();

    return () => {
      mounted = false;
    };
  }, [storageKey]);

  const closeGuide = useCallback(async () => {
    if (dontShowGuideAgain) {
      await AsyncStorage.setItem(storageKey, "true");
    } else {
      await AsyncStorage.removeItem(storageKey);
    }

    setShowGuide(false);
  }, [dontShowGuideAgain, storageKey]);

  return {
    showGuide,
    setShowGuide,
    dontShowGuideAgain,
    setDontShowGuideAgain,
    closeGuide,
  };
}
