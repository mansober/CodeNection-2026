import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";

const storageKey = "margin-planner-v2";
export async function readSavedPlan(): Promise<string | null> {
  if (Platform.OS === "web") return localStorage.getItem(storageKey);
  const file = new File(Paths.document, `${storageKey}.json`);
  return file.exists ? file.text() : null;
}
export function writeSavedPlan(value: string) {
  if (Platform.OS === "web") localStorage.setItem(storageKey, value);
  else { const file = new File(Paths.document, `${storageKey}.json`); if (!file.exists) file.create(); file.write(value); }
}
