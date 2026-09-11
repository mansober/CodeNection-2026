import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import { AppButton, Card, FormField, InlineNotice, PageHeader, ScrollPage, SectionLabel, SegmentedChoices } from "@/components/MarginUI";
import { DateField } from "@/components/PlannerControls";
import { Material, Module, cardsFromText, dateKey, prettyDate, weekStart } from "@/models/planner";
import { readPickedText } from "./TimetableScreen";
import { screenStyles as s } from "./screenStyles";
import { colors } from "@/theme/tokens";

export function FlashcardScreen({ modules, materials, onSave, onModule, onBack }: { modules: Module[]; materials: Material[]; onSave: (materials: Material[]) => void; onModule: (name: string) => string; onBack: () => void }) {
  const [moduleId, setModuleId] = useState(modules[0]?.id ?? "");
  const [newModule, setNewModule] = useState("");
  const [topic, setTopic] = useState("");
  const [scope, setScope] = useState("This week");
  const [lessonDate, setLessonDate] = useState(dateKey());
  const [groupBy, setGroupBy] = useState("Module");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [flipped, setFlipped] = useState<string[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("All");
  const labelFor = (m: Material) => groupBy === "Module" ? modules.find(v => v.id === m.moduleId)?.name ?? "Unassigned" : groupBy === "Topic" ? m.topic : groupBy === "Day" ? prettyDate(m.date) : m.week === "Semester" ? "Semester" : `Week of ${prettyDate(m.week)}`;
  const groups = [...new Set(materials.map(labelFor))];
  const pick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true, type: ["text/plain", "text/markdown", "text/csv", "application/pdf", "application/vnd.openxmlformats-officedocument.presentationml.presentation"] });
      if (result.canceled) return;
      setBusy(true); const additions: Material[] = []; let cardCount = 0;
      for (const asset of result.assets) {
        const id = `material-${Date.now()}-${additions.length}`;
        const cards = /\.(txt|md|csv)$/i.test(asset.name) ? cardsFromText(await readPickedText(asset)) : [];
        let uri = asset.uri;
        if (Platform.OS !== "web") { const dest = new File(Paths.document, `${id}-${asset.name.replace(/[^\w.-]/g, "_")}`); new File(asset.uri).copy(dest); uri = dest.uri; }
        additions.push({ id, name: asset.name, moduleId, topic: topic.trim() || asset.name.replace(/\.[^.]+$/, ""), week: scope === "Semester" ? "Semester" : weekStart(lessonDate), date: lessonDate, uri, cards }); cardCount += cards.length;
      }
      onSave([...materials, ...additions]); setNotice(`${additions.length} materials added with ${cardCount} cards. Text cards use “term: explanation” or tab-separated lines. For PDFs and slides, add question-and-answer cards below.`);
    } catch { setNotice("Could not finish importing these materials. Try again with a smaller batch."); }
    finally { setBusy(false); }
  };
  return <ScrollPage><PageHeader eyebrow="Daily learning" title="Flashcards" body="Keep your learning materials together and practise a few cards from today's modules." onBack={onBack} /><View style={s.content}>
    <SectionLabel>Add learning materials</SectionLabel>
    <View style={s.wrapRow}>{modules.map(m => <AppButton key={m.id} text={m.name} variant={m.id === moduleId ? "primary" : "secondary"} onPress={() => setModuleId(m.id)} />)}</View>
    <FormField label="New module (optional)" value={newModule} onChangeText={setNewModule} placeholder="Module name" />
    {newModule.trim() ? <AppButton text="Add module" variant="quiet" onPress={() => { setModuleId(onModule(newModule.trim())); setNewModule(""); }} /> : null}
    <FormField label="Topic (optional)" value={topic} onChangeText={setTopic} placeholder="e.g. Trees and graphs" />
    <SegmentedChoices label="Material covers" choices={["This week", "Semester"]} selected={scope} onSelect={setScope} />
    <DateField label="Lesson date" value={lessonDate} onChange={setLessonDate} />
    <AppButton text={busy ? "Importing materials…" : "Upload learning materials"} icon="plus" disabled={!moduleId || busy} onPress={pick} />
    <Text style={s.caption}>Select multiple files for the chosen module. TXT, MD, CSV, PDF and PowerPoint are supported. Repeat for other modules.</Text>
    {notice ? <InlineNotice title="Materials" body={notice} /> : null}
    <SectionLabel>Create a flashcard</SectionLabel>
    <FormField label="Question or term" value={question} onChangeText={setQuestion} placeholder="What is a binary tree?" />
    <FormField label="Answer" value={answer} onChangeText={setAnswer} multiline placeholder="Write the answer in your own words" />
    <AppButton text="Save flashcard" variant="secondary" disabled={!moduleId || !question.trim() || !answer.trim()} onPress={() => { const id = `manual-${Date.now()}`; onSave([...materials, { id, moduleId, name: "My flashcard", topic: topic.trim() || "General", week: scope === "Semester" ? "Semester" : weekStart(lessonDate), date: lessonDate, uri: "", cards: [{ id, question: question.trim(), answer: answer.trim() }] }]); setQuestion(""); setAnswer(""); setNotice("Flashcard saved."); }} />
    <SectionLabel>Your library</SectionLabel>
    <SegmentedChoices label="Group by" choices={["Module", "Day", "Topic", "Week"]} selected={groupBy} onSelect={v => { setGroupBy(v); setSelectedGroup("All"); }} />
    {groups.length > 0 && <SegmentedChoices label="Show" choices={["All", ...groups]} selected={selectedGroup} onSelect={setSelectedGroup} />}
    {!materials.length && <InlineNotice title="Your library is ready" body="Upload materials or create your first card above." />}
    {groups.filter(g => selectedGroup === "All" || selectedGroup === g).map(group => <View key={group} style={{ gap: 12 }}><SectionLabel>{group}</SectionLabel>{materials.filter(m => labelFor(m) === group).map(m => <Card key={m.id} style={{ gap: 10 }}><Text style={s.label}>{m.name}</Text><Text style={s.caption}>{modules.find(v => v.id === m.moduleId)?.name} · {m.topic} · {m.cards.length} cards</Text>{!m.cards.length ? <Text style={s.bodySmallMuted}>Material saved. Add your question-and-answer cards using the form above.</Text> : m.cards.map(card => { const key = m.id + card.id; const show = flipped.includes(key); return <Pressable key={key} accessibilityRole="button" accessibilityLabel={`${show ? "Answer" : "Question"}: ${show ? card.answer : card.question}. Tap to flip.`} onPress={() => setFlipped(current => show ? current.filter(k => k !== key) : [...current, key])} style={{ padding: 18, minHeight: 120, borderRadius: 12, backgroundColor: show ? colors.mint : colors.softAmber, gap: 10 }}><Text style={s.eyebrow}>{show ? "ANSWER" : "QUESTION"}</Text><Text style={s.body}>{show ? card.answer : card.question}</Text><Text style={s.caption}>Tap to flip</Text></Pressable>; })}<AppButton text="Remove material" variant="quiet" onPress={() => onSave(materials.filter(v => v.id !== m.id))} /></Card>)}</View>)}
  </View></ScrollPage>;
}
