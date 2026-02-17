import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const REMINDER_KEY = "@sencillo/daily_reminder";

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
