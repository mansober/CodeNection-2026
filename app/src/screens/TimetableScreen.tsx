import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";

import { AppButton, Card, FormField, InlineNotice, PageHeader, ScrollPage, SectionLabel } from "@/components/MarginUI";
import { Module, mergeImportedModules, normalizeModuleName, parseTimetable } from "@/models/planner";
import { colors, layout, type } from "@/theme/tokens";
import { screenStyles as s } from "./screenStyles";

export async function readPickedText(asset: DocumentPicker.DocumentPickerAsset) {
  return Platform.OS === "web" ? (asset.file ? asset.file.text() : (await fetch(asset.uri)).text()) : new File(asset.uri).text();
}

export function ImportTimetableScreen({ initial = [], eyebrow = "Academic setup", onBack, onContinue, submitText = "Save timetable" }: { initial?: Module[]; eyebrow?: string; onBack: () => void; onContinue: (modules: Module[]) => void; submitText?: string }) {
  const [modules, setModules] = useState<Module[]>(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [filename, setFilename] = useState("");
  const [showManual, setShowManual] = useState(false);

  const pick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["text/calendar", "application/octet-stream", "image/png", "image/jpeg"], copyToCacheDirectory: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      setFilename(asset.name);
      setBusy(true);
      setMessage("");
      if (/\.ics$/i.test(asset.name)) {
        const found = parseTimetable(await readPickedText(asset));
        if (!found.length) throw new Error("No module names were found. Check the ICS file, or add modules manually.");
        const existingNames = new Set(modules.map(module => normalizeModuleName(module.name)));
        const matched = found.filter(module => existingNames.has(normalizeModuleName(module.name))).length;
        setModules(current => mergeImportedModules(current, found));
        setMessage(`${found.length} module${found.length === 1 ? "" : "s"} found${matched ? ` · ${matched} matched existing module${matched === 1 ? "" : "s"}` : ""}.`);
      } else {
        setMessage("Image text recognition is not connected yet. Import an ICS calendar or add the modules manually.");
        setShowManual(true);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The file could not be opened. Try another file.");
    } finally {
      setBusy(false);
    }
  };

  const addManualModule = () => {
    const trimmed = name.trim();
    if (!trimmed || modules.some(module => normalizeModuleName(module.name) === normalizeModuleName(trimmed))) return;
    setModules(current => [...current, { id: `module-${Date.now()}`, name: trimmed, days: [] }]);
    setName("");
    setShowManual(false);
  };

  return <ScrollPage>
    <PageHeader eyebrow={eyebrow} title="Import timetable" body="Bring in an ICS calendar to connect class days with your modules." onBack={onBack} />
    <View style={s.content}>
      <Card tone={modules.some(module => module.days.length) ? "mint" : "amber"} style={importStyles.importCard}>
        <View style={s.flex}>
          <Text style={s.label}>{filename || "Choose your timetable file"}</Text>
          <Text style={s.bodySmallMuted}>ICS calendars are read immediately. Existing assignments and learning materials stay linked when a module name matches.</Text>
        </View>
        <AppButton text={filename ? "Choose another file" : "Import timetable"} accessibilityLabel={filename ? "Choose another timetable file" : "Import timetable file"} icon="calendar" onPress={pick} disabled={busy} />
      </Card>

      {busy ? <ActivityIndicator accessibilityLabel="Reading timetable" color={colors.forest} /> : null}
      {message ? <InlineNotice title="Import result" body={message} tone={message.includes("could not") || message.includes("No module") ? "amber" : "mint"} /> : null}

      {modules.length ? <>
        <SectionLabel detail={`${modules.length} total`}>Modules in this setup</SectionLabel>
        <View style={importStyles.moduleList}>
          {modules.map(module => <View key={module.id} style={importStyles.moduleRow} accessible accessibilityLabel={`${module.name}. ${module.days.length ? `${module.days.length} class ${module.days.length === 1 ? "day" : "days"} from timetable.` : "Manual module with no class schedule."}`}>
            <View style={s.flex}>
              <Text style={importStyles.moduleName}>{module.name}</Text>
              <Text style={s.caption}>{module.days.length ? `${module.days.length} class ${module.days.length === 1 ? "day" : "days"}` : "No class schedule"}</Text>
            </View>
            <View style={[importStyles.sourceBadge, !module.days.length && importStyles.manualBadge]}>
              <Text style={importStyles.sourceText}>{module.days.length ? "TIMETABLE" : "MANUAL"}</Text>
            </View>
          </View>)}
        </View>
      </> : <InlineNotice title="No timetable imported yet" body="Choose an ICS file above. You can also add a module manually without class dates." />}

      {!showManual ? <Pressable accessibilityRole="button" accessibilityLabel="Add a module manually" onPress={() => setShowManual(true)} style={({ pressed }) => [importStyles.textAction, pressed && importStyles.pressed]}>
        <Text style={importStyles.textActionLabel}>+ Add module manually</Text>
      </Pressable> : <Card style={importStyles.manualForm}>
        <Text style={s.label}>Add a module manually</Text>
        <Text style={s.bodySmallMuted}>It remains valid without timetable sessions and continues using the existing class baseline.</Text>
        <FormField label="Module name" value={name} onChangeText={setName} placeholder="e.g. Data Structures" returnKeyType="done" onSubmitEditing={addManualModule} />
        <View style={importStyles.formActions}>
          <AppButton text="Cancel" variant="quiet" style={importStyles.formButton} onPress={() => { setName(""); setShowManual(false); }} />
          <AppButton text="Add module" variant="secondary" style={importStyles.formButton} disabled={!name.trim() || modules.some(module => normalizeModuleName(module.name) === normalizeModuleName(name))} onPress={addManualModule} />
        </View>
      </Card>}

      <AppButton text={submitText} onPress={() => onContinue(modules)} disabled={!modules.length || busy} />
    </View>
  </ScrollPage>;
}

const importStyles = StyleSheet.create({
  importCard: { gap: 14 },
  moduleList: { borderRadius: layout.radius, overflow: "hidden", borderWidth: 1, borderColor: colors.outlineSoft, backgroundColor: colors.paper },
  moduleRow: { minHeight: 68, paddingHorizontal: 14, paddingVertical: 11, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: colors.outlineSoft },
  moduleName: { ...type.label, color: colors.ink, flexShrink: 1 },
  sourceBadge: { borderRadius: 8, backgroundColor: colors.softMint, paddingHorizontal: 8, paddingVertical: 5, flexShrink: 0 },
  manualBadge: { backgroundColor: colors.softAmber },
  sourceText: { ...type.eyebrow, color: colors.forest, fontSize: 10, lineHeight: 13 },
  textAction: { minHeight: layout.touchTarget, alignSelf: "flex-start", justifyContent: "center", paddingHorizontal: 4 },
  textActionLabel: { ...type.label, color: colors.forest },
  manualForm: { gap: 12 },
  formActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  formButton: { flexGrow: 1, minWidth: 120 },
  pressed: { opacity: 0.65 },
});
