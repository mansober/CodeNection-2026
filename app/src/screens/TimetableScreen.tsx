import { useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { AppButton, Card, CheckboxRow, FormField, InlineNotice, PageHeader, ScrollPage, SectionLabel } from "@/components/MarginUI";
import { DateField } from "@/components/PlannerControls";
import { Module, dateKey, parseTimetable } from "@/models/planner";
import { screenStyles as s } from "./screenStyles";

export async function readPickedText(asset: DocumentPicker.DocumentPickerAsset) {
  return Platform.OS === "web" ? (asset.file ? asset.file.text() : (await fetch(asset.uri)).text()) : new File(asset.uri).text();
}

export function ImportTimetableScreen({ initial = [], onBack, onContinue }: { initial?: Module[]; onBack: () => void; onContinue: (modules: Module[]) => void }) {
  const [modules, setModules] = useState<Module[]>(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [filename, setFilename] = useState("");
  const update = (id: string, patch: Partial<Module>) => setModules(current => current.map(m => m.id === id ? { ...m, ...patch } : m));
  const pick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["text/calendar", "application/octet-stream", "image/png", "image/jpeg"], copyToCacheDirectory: true });
      if (result.canceled) return;
      const asset = result.assets[0]; setFilename(asset.name); setBusy(true); setMessage("");
      if (/\.ics$/i.test(asset.name)) {
        const found = parseTimetable(await readPickedText(asset));
        if (!found.length) throw new Error("No module names were found. Check the ICS file, or enter your modules below.");
        setModules(current => { const next = [...current]; found.forEach(m => { const existing = next.findIndex(v => v.name.toLowerCase() === m.name.toLowerCase()); if (existing >= 0) next[existing] = { ...next[existing], days: m.days }; else next.push({ ...m, id: `${m.id}-${Date.now()}` }); }); return next; });
        setMessage(`${found.length} module names read. Review the modules and add any assignments below.`);
      } else setMessage("Image text recognition is not connected yet. Use your timetable to add module names below, or import an ICS calendar.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "The file could not be opened. Try another file."); }
    finally { setBusy(false); }
  };
  const invalidDates = modules.some(m => m.assignment?.due && m.assignment.due < m.assignment.start);
  return <ScrollPage><PageHeader eyebrow="Specific commitments" title="Your modules & assignments" body="Import your timetable, review each module, then tell us which modules have an assignment." onBack={onBack} /><View style={s.content}>
    <AppButton text={filename ? "Choose another timetable" : "Import timetable"} icon="calendar" onPress={pick} disabled={busy} />
    {busy && <ActivityIndicator accessibilityLabel="Reading timetable" />}{filename ? <Text style={s.caption}>{filename}</Text> : null}{message ? <InlineNotice title="Timetable review" body={message} /> : null}
    <SectionLabel>Add your modules</SectionLabel><Text style={s.bodySmallMuted}>Enter each subject once, for example Data Structures. Class days come from your imported timetable; otherwise your baseline class estimate stays in use.</Text>
    <FormField label="Module name" value={name} onChangeText={setName} placeholder="e.g. Data Structures" />
    <AppButton text="Add module" variant="secondary" disabled={!name.trim() || modules.some(m => m.name.toLowerCase() === name.trim().toLowerCase())} onPress={() => { setModules(current => [...current, { id: `module-${Date.now()}`, name: name.trim(), days: [] }]); setName(""); }} />
    {modules.map(m => <Card key={m.id} style={{ gap: 10 }}><Text style={s.title}>{m.name}</Text><Text style={s.bodySmallMuted}>{m.days.length ? "Schedule imported from timetable" : "Module saved · no class dates required"}</Text><AppButton text="Remove module" variant="quiet" onPress={() => setModules(current => current.filter(v => v.id !== m.id))} /></Card>)}
    {modules.length > 0 && <SectionLabel>Assignments</SectionLabel>}
    {modules.map(m => <Card key={m.id} style={{ gap: 12 }}><CheckboxRow label={`${m.name} has an assignment`} selected={!!m.assignment} onPress={() => update(m.id, { assignment: m.assignment ? undefined : { start: dateKey(), due: "" } })} />{m.assignment && <><DateField label="Start working on it" value={m.assignment.start} onChange={start => update(m.id, { assignment: { ...m.assignment!, start } })} /><DateField label="Due date (optional)" value={m.assignment.due} optional onChange={due => update(m.id, { assignment: { ...m.assignment!, due } })} />{m.assignment.due && m.assignment.due < m.assignment.start ? <Text accessibilityRole="alert" style={s.body}>Due date must be on or after the start date.</Text> : null}</>}</Card>)}
    <AppButton text="Save & add a commitment" onPress={() => onContinue(modules)} disabled={!modules.length || invalidDates || busy} />
  </View></ScrollPage>;
}
