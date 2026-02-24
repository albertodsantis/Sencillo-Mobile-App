import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const REMINDER_KEY = "@sencillo/daily_reminder";
const NOTIFICATION_PREFS_KEY = "@sencillo/notification_preferences";

export interface NotificationPreferences {
  allEnabled: boolean;
  dailyReminder: boolean;
  budgetAlerts: boolean;
  weeklySummary: boolean;
  fixedExpenseReminders: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  allEnabled: true,
  dailyReminder: true,
  budgetAlerts: true,
  weeklySummary: false,
  fixedExpenseReminders: true,
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function scheduleDailyReminder(): Promise<boolean> {
  const granted = await requestNotificationPermissions();
  if (!granted) return false;

  await cancelDailyReminder();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Sencillo",
      body: "No olvides registrar tus movimientos de hoy!",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    },
  });

  await AsyncStorage.setItem(REMINDER_KEY, "true");
  return true;
}

export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.setItem(REMINDER_KEY, "false");
}

export async function isReminderEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(REMINDER_KEY);
    return val === "true";
  } catch {
    return false;
  }
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const rawPrefs = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
    if (!rawPrefs) return DEFAULT_NOTIFICATION_PREFERENCES;

    const parsedPrefs = JSON.parse(rawPrefs) as Partial<NotificationPreferences>;
    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...parsedPrefs,
    };
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export async function saveNotificationPreferences(
  preferences: NotificationPreferences
): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(preferences));
}

export async function applyNotificationPreferences(
  preferences: NotificationPreferences
): Promise<boolean> {
  const shouldEnableDailyReminder = preferences.allEnabled && preferences.dailyReminder;

  if (shouldEnableDailyReminder) {
    return scheduleDailyReminder();
  }

  await cancelDailyReminder();
  return true;
}
