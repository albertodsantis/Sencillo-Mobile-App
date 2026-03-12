import { useCallback, useEffect, useState } from "react";
import {
  applyNotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  getNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notifications";

interface UpdateNotificationPreferencesResult {
  success: boolean;
  reason?: "permission" | "unknown";
  message?: string;
}

export function useNotificationPreferences() {
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES,
  );
  const [notificationLoading, setNotificationLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      const prefs = await getNotificationPreferences();
      if (!mounted) return;
      setNotificationPrefs(prefs);
      setNotificationLoading(false);
    };

    void loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  const updateNotificationPrefs = useCallback(
    async (
      nextPrefs: NotificationPreferences,
    ): Promise<UpdateNotificationPreferencesResult> => {
      setNotificationLoading(true);

      try {
        const success = await applyNotificationPreferences(nextPrefs);
        if (!success) {
          return {
            success: false,
            reason: "permission",
            message: "No se pudieron activar las notificaciones. Verifica los permisos en Ajustes.",
          };
        }

        await saveNotificationPreferences(nextPrefs);
        setNotificationPrefs(nextPrefs);
        return { success: true };
      } catch {
        return {
          success: false,
          reason: "unknown",
          message: "Ocurrio un error con las notificaciones",
        };
      } finally {
        setNotificationLoading(false);
      }
    },
    [],
  );

  return {
    notificationPrefs,
    notificationLoading,
    updateNotificationPrefs,
  };
}
