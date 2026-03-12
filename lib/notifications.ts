import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const REMINDER_KEY = "@sencillo/daily_reminder";
const REMINDER_NOTIFICATION_ID_KEY = "@sencillo/daily_reminder_id";
const NOTIFICATION_PREFS_KEY = "@sencillo/notification_preferences";
const DAILY_REMINDER_NOTIFICATION_TYPE = "daily-reminder";

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
  budgetAlerts: false,
  weeklySummary: false,
  fixedExpenseReminders: false,
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

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Sencillo",
      body: "No olvides registrar tus movimientos de hoy!",
      sound: true,
      data: {
        type: DAILY_REMINDER_NOTIFICATION_TYPE,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    },
  });

  await AsyncStorage.setItem(REMINDER_KEY, "true");
  await AsyncStorage.setItem(REMINDER_NOTIFICATION_ID_KEY, identifier);
  return true;
}

export async function cancelDailyReminder(): Promise<void> {
  const identifier = await AsyncStorage.getItem(REMINDER_NOTIFICATION_ID_KEY);
  if (identifier) {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  }

  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  const reminderIdentifiers = scheduledNotifications
    .filter((notification) => notification.content.data?.type === DAILY_REMINDER_NOTIFICATION_TYPE)
    .map((notification) => notification.identifier);

  await Promise.all(
    reminderIdentifiers.map((notificationId) =>
      Notifications.cancelScheduledNotificationAsync(notificationId)
    )
  );

  await AsyncStorage.setItem(REMINDER_KEY, "false");
  await AsyncStorage.removeItem(REMINDER_NOTIFICATION_ID_KEY);
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
