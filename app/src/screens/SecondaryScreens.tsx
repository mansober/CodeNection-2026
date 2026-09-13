import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { MarginIcon } from "@/components/MarginIcon";
import { MascotAvatar } from "@/components/MascotAvatar";
import { AppButton, BottomNav, Card, FormField, InlineNotice, PageHeader, ScrollPage, SectionLabel } from "@/components/MarginUI";
import { DateField } from "@/components/PlannerControls";
import { CapacityKind, Commitment, MainTab, QuickAddAction, RoutineEntry, capacityMeta, formatHours, routineCatalog, weeklyHours } from "@/models/margin";
import { Material, Module, dateKey, fromKey, normalizeModuleName, prettyDate, scheduledCommitments, shiftDate, weekStart } from "@/models/planner";
import { colors, fonts, layout, type } from "@/theme/tokens";
import { screenStyles as s } from "./screenStyles";

const dayOrder = [1, 2, 3, 4, 5, 6, 0];
const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const dayShort = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;
const sessionDuration = (item: Commitment) => {
  const value = item.durationHours ?? item.time / 5;
  return value < 1 ? `${Math.round(value * 60)} min` : `${Number.isInteger(value) ? value : value.toFixed(1)} h`;
};
const rangeLabel = (start: string) => {
  const first = fromKey(start);
  const last = fromKey(shiftDate(start, 6));
  const sameMonth = first.getMonth() === last.getMonth() && first.getFullYear() === last.getFullYear();
  const firstLabel = first.toLocaleDateString(undefined, { month: "short", day: "numeric", ...(sameMonth ? {} : { year: "numeric" }) });
  const lastLabel = last.toLocaleDateString(undefined, { month: sameMonth ? undefined : "short", day: "numeric", year: first.getFullYear() === last.getFullYear() ? undefined : "numeric" });
  return `${firstLabel}–${lastLabel}`;
};

function TextAction({ label, onPress, accessibilityLabel = label }: { label: string; onPress: () => void; accessibilityLabel?: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => [academicStyles.textAction, pressed && academicStyles.pressed]}>
    <Text style={academicStyles.textActionLabel}>{label}</Text>
  </Pressable>;
}

export function ScheduleScreen({ modules, commitments, onBack, onImport, onModules, onModule }: { modules: Module[]; commitments: Commitment[]; onBack: () => void; onImport: () => void; onModules: () => void; onModule: (moduleId: string) => void }) {
  const currentWeek = weekStart(dateKey());
  const [start, setStart] = useState(currentWeek);
  const [selectedDate, setSelectedDate] = useState(dateKey());
  const days = dayOrder.map((weekday, offset) => {
    const date = shiftDate(start, offset);
    return {
      weekday,
      date,
      modules: modules.filter(module => module.days.includes(weekday)),
      commitments: scheduledCommitments(commitments, date).filter(item => item.category !== "Assignment" && item.scheduleType !== "Daily routine"),
    };
  });
  const sessionCount = days.reduce((sum, day) => sum + day.modules.length + day.commitments.length, 0);
  const selected = days.find(day => day.date === selectedDate) ?? days[0];
  const selectedCount = selected.modules.length + selected.commitments.length;
  const hasImportedSchedule = modules.some(module => module.days.length);
  const unlinkedCount = modules.filter(module => !module.days.length).length;

  const moveWeek = (weeks: number) => {
    const next = shiftDate(start, weeks * 7);
    setStart(next);
    setSelectedDate(next);
  };

  return <ScrollPage>
    <PageHeader eyebrow="Academic planner" title="Your timetable" body="See your classes and fixed sessions for the week." onBack={onBack} />
    <View style={s.content}>
      <View style={academicStyles.weekNav}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous week" onPress={() => moveWeek(-1)} style={({ pressed }) => [academicStyles.weekNavButton, pressed && academicStyles.pressed]}>
          <Text style={academicStyles.weekNavSymbol}>‹</Text>
        </Pressable>
        <View style={academicStyles.weekNavTitle}>
          <Text style={academicStyles.weekRange}>{rangeLabel(start)}</Text>
          <Text style={academicStyles.weekContext}>{start === currentWeek ? "THIS WEEK" : "WEEK VIEW"}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Next week" onPress={() => moveWeek(1)} style={({ pressed }) => [academicStyles.weekNavButton, pressed && academicStyles.pressed]}>
          <Text style={academicStyles.weekNavSymbol}>›</Text>
        </Pressable>
      </View>

      <View style={academicStyles.weekMeta}>
        <Text style={s.bodySmallMuted}>{plural(sessionCount, "session")} · {plural(modules.length, "module")}</Text>
        <TextAction label="Manage modules →" accessibilityLabel={`Manage ${plural(modules.length, "module")} and assignments`} onPress={onModules} />
      </View>

      <View style={academicStyles.weekGrid} accessibilityLabel="Select a day to view its timetable">
        {days.map(day => {
          const count = day.modules.length + day.commitments.length;
          const active = selected.date === day.date;
          return <Pressable
            key={day.date}
            accessibilityRole="button"
            accessibilityLabel={`${dayNames[day.weekday]} ${fromKey(day.date).toLocaleDateString(undefined, { month: "long", day: "numeric" })}. ${count ? plural(count, "fixed session") : "No fixed sessions"}.`}
            accessibilityState={{ selected: active }}
            onPress={() => setSelectedDate(day.date)}
            style={({ pressed }) => [academicStyles.dayCell, count > 0 && academicStyles.dayCellBusy, active && academicStyles.dayCellSelected, pressed && academicStyles.pressed]}
          >
            <Text style={[academicStyles.dayName, active && academicStyles.dayTextSelected]}>{dayShort[day.weekday]}</Text>
            <Text style={[academicStyles.dayDate, active && academicStyles.dayTextSelected]}>{fromKey(day.date).getDate()}</Text>
            <View style={[academicStyles.dayCount, active && academicStyles.dayCountSelected]}>
              <Text style={[academicStyles.dayCountText, active && academicStyles.dayCountTextSelected]}>{count}</Text>
            </View>
          </Pressable>;
        })}
      </View>

      <View style={academicStyles.selectedHeader}>
        <View style={s.flex}>
          <Text style={academicStyles.detailEyebrow}>{dayNames[selected.weekday].toUpperCase()}</Text>
          <Text style={academicStyles.selectedDate}>{fromKey(selected.date).toLocaleDateString(undefined, { month: "long", day: "numeric" })}</Text>
        </View>
        <Text style={s.caption}>{plural(selectedCount, "session")}</Text>
      </View>

      <View style={academicStyles.sessionList}>
        {selected.modules.map(module => <Pressable
          key={module.id}
          accessibilityRole="link"
          accessibilityLabel={`${module.name}. Class from timetable. Open module.`}
          onPress={() => onModule(module.id)}
          style={({ pressed }) => [academicStyles.sessionRow, pressed && academicStyles.pressed]}
        >
          <View style={academicStyles.classAccent} />
          <View style={s.flex}>
            <Text style={academicStyles.sessionTitle}>{module.name}</Text>
            <Text style={s.caption}>Class · Timetable</Text>
          </View>
          <MarginIcon name="chevron" color={colors.forest} size={18} />
        </Pressable>)}
        {selected.commitments.map(item => <View key={item.id} accessible accessibilityLabel={`${item.name}. ${item.category}. ${sessionDuration(item)}.`} style={academicStyles.sessionRow}>
          <View style={academicStyles.commitmentAccent} />
          <View style={s.flex}>
            <Text style={academicStyles.sessionTitle}>{item.name}</Text>
            <Text style={s.caption}>{item.category}</Text>
          </View>
          <Text style={academicStyles.sessionTime}>{sessionDuration(item)}</Text>
        </View>)}
        {!selectedCount ? <View style={academicStyles.compactEmpty}><Text style={s.bodySmallMuted}>No fixed sessions on {dayNames[selected.weekday]}.</Text></View> : null}
      </View>

      {!hasImportedSchedule ? <Card tone="mint" style={academicStyles.importPrompt}>
        <View style={s.flex}>
          <Text style={s.label}>Bring in your class schedule</Text>
          <Text style={s.bodySmallMuted}>Importing a timetable creates or connects modules automatically.</Text>
        </View>
        <AppButton text="Import timetable" icon="calendar" onPress={onImport} />
      </Card> : <View style={academicStyles.secondaryActionRow}>
        <Text style={s.bodySmallMuted}>Need to update your class days?</Text>
        <TextAction label="Import / update timetable →" onPress={onImport} />
      </View>}

      {unlinkedCount ? <View style={academicStyles.contextNote}>
        <View style={s.flex}>
          <Text style={s.label}>{plural(unlinkedCount, "module")} {unlinkedCount === 1 ? "isn't" : "aren't"} linked to class times.</Text>
          <Text style={s.bodySmallMuted}>They remain valid and continue using the existing class baseline.</Text>
        </View>
        <TextAction label="Review modules →" onPress={onModules} />
      </View> : null}
    </View>
  </ScrollPage>;
}

type AssignmentsScreenProps = {
  modules: Module[];
  materials: Material[];
  initialModuleId?: string;
  onBack: () => void;
  onSave: (modules: Module[]) => void;
  onImport: () => void;
  onTimetable: () => void;
  onAddMaterial: (moduleId: string) => void;
};

export function AssignmentsScreen({ modules, materials, initialModuleId, onBack, onSave, onImport, onTimetable, onAddMaterial }: AssignmentsScreenProps) {
  const [draft, setDraft] = useState(modules);
  const [name, setName] = useState("");
  const [showAdd, setShowAdd] = useState(!modules.length);
  const [expandedId, setExpandedId] = useState(initialModuleId && modules.some(module => module.id === initialModuleId) ? initialModuleId : "");
  const [editingAssignmentId, setEditingAssignmentId] = useState("");
  const [renamingId, setRenamingId] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [confirmingRemovalId, setConfirmingRemovalId] = useState("");
  const [saved, setSaved] = useState(false);
  const [navigationBlocked, setNavigationBlocked] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(modules);
  const invalidDates = draft.some(module => module.assignment?.due && module.assignment.due < module.assignment.start);

  useEffect(() => {
    if (!saved) return;
    const timeout = setTimeout(() => setSaved(false), 3500);
    return () => clearTimeout(timeout);
  }, [saved]);

  const update = (id: string, patch: Partial<Module>) => {
    setSaved(false);
    setNavigationBlocked(false);
    setDraft(current => current.map(module => module.id === id ? { ...module, ...patch } : module));
  };
  const duplicateName = (value: string, exceptId = "") => draft.some(module => module.id !== exceptId && normalizeModuleName(module.name) === normalizeModuleName(value));
  const addModule = () => {
    const trimmed = name.trim();
    if (!trimmed || duplicateName(trimmed)) return;
    const id = `module-${Date.now()}`;
    setDraft(current => [...current, { id, name: trimmed, days: [] }]);
    setName("");
    setShowAdd(false);
    setExpandedId(id);
    setSaved(false);
  };
  const continueWithDraft = (action: () => void) => {
    if (invalidDates) {
      setNavigationBlocked(true);
      return;
    }
    if (dirty) onSave(draft);
    action();
  };

  return <ScrollPage>
    <PageHeader eyebrow="Academic planner" title="Modules & assignments" body="Keep classes, assignments and learning materials together." onBack={() => continueWithDraft(onBack)} />
    <View style={s.content}>
      {saved ? <View accessibilityLiveRegion="polite"><InlineNotice title="Changes saved" body="Assignments, Plan and capacity now use the latest module details and dates." /></View> : null}

      <View style={academicStyles.connectedRow}>
        <Text style={s.bodySmallMuted}>{plural(draft.length, "module")} in your academic setup</Text>
        <TextAction label="View timetable →" onPress={() => continueWithDraft(onTimetable)} />
      </View>

      {!draft.length ? <Card tone="mint" style={academicStyles.emptyModules}>
        <Text style={s.title}>No modules yet</Text>
        <Text style={s.bodySmallMuted}>Import a timetable or add your first module manually.</Text>
        <AppButton text="Import timetable" icon="calendar" variant="secondary" onPress={() => continueWithDraft(onImport)} />
      </Card> : <View style={academicStyles.moduleHeader}>
        <SectionLabel detail={plural(draft.filter(module => module.assignment).length, "assignment")}>Your modules</SectionLabel>
        <View style={academicStyles.headerActions}>
          <TextAction label="+ Add module" onPress={() => setShowAdd(true)} />
          <TextAction label="Import timetable" onPress={() => continueWithDraft(onImport)} />
        </View>
      </View>}

      {showAdd ? <Card style={academicStyles.inlineForm}>
        <Text style={s.label}>{draft.length ? "Add another module" : "Add your first module"}</Text>
        <FormField label="Module name" value={name} onChangeText={setName} placeholder="e.g. Algorithms" returnKeyType="done" onSubmitEditing={addModule} />
        {name.trim() && duplicateName(name) ? <Text accessibilityRole="alert" style={academicStyles.validation}>That module already exists.</Text> : null}
        <View style={academicStyles.formActions}>
          {draft.length ? <AppButton text="Cancel" variant="quiet" style={academicStyles.formButton} onPress={() => { setName(""); setShowAdd(false); }} /> : null}
          <AppButton text="Add module" variant={draft.length ? "secondary" : "primary"} style={academicStyles.formButton} disabled={!name.trim() || duplicateName(name)} onPress={addModule} />
        </View>
      </Card> : null}

      <View style={academicStyles.moduleList}>
        {draft.map(module => {
          const expanded = expandedId === module.id;
          const classCount = module.days.length;
          const materialCount = materials.filter(material => material.moduleId === module.id).length;
          const assignmentCount = module.assignment ? 1 : 0;
          const summary = `${classCount ? plural(classCount, "class day") : "No class schedule"} · ${assignmentCount ? "1 assignment" : "No assignment"} · ${plural(materialCount, "material")}`;
          const renameInvalid = !renameValue.trim() || duplicateName(renameValue, module.id);
          return <View key={module.id} style={[academicStyles.moduleSurface, expanded && academicStyles.moduleSurfaceExpanded]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${module.name}. ${classCount ? plural(classCount, "class day") : "No class schedule"}. ${assignmentCount ? "One assignment" : "No assignment"}. ${plural(materialCount, "learning material")}.`}
              accessibilityState={{ expanded }}
              onPress={() => setExpandedId(current => current === module.id ? "" : module.id)}
              style={({ pressed }) => [academicStyles.moduleSummary, pressed && academicStyles.pressed]}
            >
              <View style={s.flex}>
                <View style={academicStyles.moduleTitleRow}>
                  <Text style={academicStyles.moduleTitle}>{module.name}</Text>
                  <View style={[academicStyles.sourceBadge, !classCount && academicStyles.manualBadge]}>
                    <Text style={academicStyles.sourceBadgeText}>{classCount ? "TIMETABLE" : "MANUAL"}</Text>
                  </View>
                </View>
                <Text style={academicStyles.moduleMeta}>{summary}</Text>
              </View>
              <View style={{ transform: [{ rotate: expanded ? "90deg" : "0deg" }] }}><MarginIcon name="chevron" color={colors.forest} size={19} /></View>
            </Pressable>

            {expanded ? <View style={academicStyles.moduleDetail}>
              <View style={academicStyles.detailSection}>
                <Text style={academicStyles.detailHeading}>CLASSES</Text>
                <Text style={s.label}>{classCount ? plural(classCount, "class day") + " from timetable" : "No timetable sessions"}</Text>
                {!classCount ? <Text style={s.bodySmallMuted}>Your existing baseline class estimate stays in use.</Text> : null}
                <TextAction label="View timetable →" accessibilityLabel={`View timetable for ${module.name}`} onPress={() => continueWithDraft(onTimetable)} />
              </View>

              <View style={academicStyles.detailSection}>
                <Text style={academicStyles.detailHeading}>ASSIGNMENT</Text>
                {!module.assignment ? <>
                  <Text style={s.bodySmallMuted}>No assignment yet.</Text>
                  <AppButton text="+ Add assignment" accessibilityLabel={`Add assignment to ${module.name}`} variant="secondary" onPress={() => {
                    update(module.id, { assignment: { start: dateKey(), due: "" } });
                    setEditingAssignmentId(module.id);
                  }} />
                </> : <>
                  <View style={academicStyles.assignmentSummary}>
                    <View style={s.flex}>
                      <Text style={academicStyles.assignmentTitle}>Assignment</Text>
                      <Text style={s.bodySmall}>Starts {prettyDate(module.assignment.start)}</Text>
                      <Text style={s.bodySmallMuted}>Due date {module.assignment.due ? prettyDate(module.assignment.due) : "not set"}</Text>
                    </View>
                    <AppButton text={editingAssignmentId === module.id ? "Close" : "Edit"} accessibilityLabel={`${editingAssignmentId === module.id ? "Close" : "Edit"} assignment for ${module.name}`} variant="quiet" style={academicStyles.compactButton} onPress={() => setEditingAssignmentId(current => current === module.id ? "" : module.id)} />
                  </View>
                  {editingAssignmentId === module.id ? <View style={academicStyles.assignmentEditor}>
                    <Text style={academicStyles.datePath}>START → DUE</Text>
                    <DateField label="Start working" value={module.assignment.start} accessibilityLabel={`Start working date for ${module.name}, ${prettyDate(module.assignment.start)}`} onChange={start => update(module.id, { assignment: { ...module.assignment!, start } })} />
                    <Text style={s.caption}>Appears in your Plan from this date.</Text>
                    <DateField label="Due date" value={module.assignment.due} optional clearText="Not set" displayValue={module.assignment.due ? prettyDate(module.assignment.due) : "Not set"} accessibilityLabel={`Due date for ${module.name}, ${module.assignment.due ? prettyDate(module.assignment.due) : "not set"}`} onChange={due => update(module.id, { assignment: { ...module.assignment!, due } })} />
                    {module.assignment.due && module.assignment.due < module.assignment.start ? <Text accessibilityRole="alert" style={academicStyles.validation}>Due date must be on or after the start date.</Text> : null}
                    <AppButton text="Remove assignment" accessibilityLabel={`Remove assignment from ${module.name}`} variant="quiet" onPress={() => { update(module.id, { assignment: undefined }); setEditingAssignmentId(""); }} />
                  </View> : null}
                </>}
              </View>

              <View style={academicStyles.detailSection}>
                <Text style={academicStyles.detailHeading}>LEARNING MATERIALS</Text>
                <Text style={s.label}>{materialCount ? plural(materialCount, "learning material") : "No learning materials yet"}</Text>
                <AppButton text="+ Add learning material" accessibilityLabel={`Add learning material to ${module.name}`} variant="secondary" onPress={() => continueWithDraft(() => onAddMaterial(module.id))} />
              </View>

              <View style={academicStyles.detailSection}>
                <Text style={academicStyles.detailHeading}>MODULE OPTIONS</Text>
                {renamingId === module.id ? <View style={academicStyles.inlineForm}>
                  <FormField label="Module name" value={renameValue} onChangeText={setRenameValue} autoFocus />
                  {renameValue.trim() && duplicateName(renameValue, module.id) ? <Text accessibilityRole="alert" style={academicStyles.validation}>That module already exists.</Text> : null}
                  <View style={academicStyles.formActions}>
                    <AppButton text="Cancel" variant="quiet" style={academicStyles.formButton} onPress={() => { setRenamingId(""); setRenameValue(""); }} />
                    <AppButton text="Save name" variant="secondary" style={academicStyles.formButton} disabled={renameInvalid} onPress={() => { update(module.id, { name: renameValue.trim() }); setRenamingId(""); setRenameValue(""); }} />
                  </View>
                </View> : <TextAction label="Rename module" accessibilityLabel={`Rename ${module.name}`} onPress={() => { setRenamingId(module.id); setRenameValue(module.name); }} />}

                {confirmingRemovalId === module.id ? <View style={academicStyles.removeConfirmation}>
                  <Text style={s.label}>{materialCount ? "Remove learning materials first" : `Remove ${module.name}?`}</Text>
                  <Text style={s.bodySmallMuted}>{materialCount
                    ? `This module has ${plural(materialCount, "learning material")}. Keep the module until those materials are reviewed so nothing becomes unlinked.`
                    : `This removes the module${classCount ? ", its timetable class links" : ""}${module.assignment ? ", and its assignment from Plan" : ""}. Nothing is removed until you save changes.`}</Text>
                  <View style={academicStyles.formActions}>
                    <AppButton text="Keep module" variant="quiet" style={academicStyles.formButton} onPress={() => setConfirmingRemovalId("")} />
                    {materialCount ? <AppButton text="Review materials" variant="secondary" style={academicStyles.formButton} onPress={() => continueWithDraft(() => onAddMaterial(module.id))} /> : <AppButton text="Remove module" accessibilityLabel={`Confirm removal of ${module.name}`} variant="warning" style={academicStyles.formButton} onPress={() => {
                      setDraft(current => current.filter(item => item.id !== module.id));
                      setConfirmingRemovalId("");
                      setExpandedId("");
                      setEditingAssignmentId("");
                      setSaved(false);
                    }} />}
                  </View>
                </View> : <TextAction label="Remove module" accessibilityLabel={`Remove ${module.name}`} onPress={() => setConfirmingRemovalId(module.id)} />}
              </View>
            </View> : null}
          </View>;
        })}
      </View>

      {invalidDates ? <Text accessibilityRole="alert" style={academicStyles.validation}>Fix assignment dates before saving.</Text> : null}
      {navigationBlocked ? <Text accessibilityRole="alert" style={academicStyles.validation}>Fix the invalid assignment date before leaving this page.</Text> : null}
      {dirty ? <View style={academicStyles.saveArea}>
        <Text style={s.bodySmallMuted}>Your changes are ready to update Plan and capacity.</Text>
        <AppButton text="Save changes" disabled={invalidDates} onPress={() => { onSave(draft); setSaved(true); }} />
      </View> : null}
    </View>
  </ScrollPage>;
}

export function ProfileScreen({ streak, commitments, modules, routines, answers, onTab, onQuickAdd, onBaseline }: { streak: number; commitments: Commitment[]; modules: Module[]; routines: Record<string, RoutineEntry>; answers: Partial<Record<CapacityKind, number>>; onTab: (tab: MainTab) => void; onQuickAdd: (action: QuickAddAction) => void; onBaseline: () => void }) {
  const routineHours = Object.values(routines).reduce((sum, entry) => sum + weeklyHours(entry), 0);
  return <ScrollPage bottomBar={<BottomNav selected="profile" onSelect={onTab} onQuickAdd={onQuickAdd} />}><PageHeader hideMark eyebrow="Profile" title="The person behind the plan" body="Your baseline, preferences and private planning context live here." /><View style={s.content}>
    <Card tone="mint" style={{ alignItems: "center", gap: 10, paddingVertical: 22 }}><View style={{ borderRadius: 30, borderWidth: 3, borderColor: colors.paper }}><MascotAvatar size={116} /></View><Text style={s.title}>Your Santai companion</Text><Text style={[s.bodySmallMuted, { textAlign: "center" }]}>Tap the mascot on any main page for a small encouragement.</Text><View style={[s.wrapRow, { justifyContent: "center" }]}><View style={s.badge}><Text style={s.badgeText}>{streak} DAY STREAK</Text></View><View style={s.badge}><Text style={s.badgeText}>{commitments.length} PLANS</Text></View><View style={s.badge}><Text style={s.badgeText}>{modules.length} MODULES</Text></View></View></Card>
    <Card style={{ gap: 10, borderLeftWidth: 5, borderLeftColor: colors.waterDeep }}><View style={s.rowBetween}><Text style={s.title}>Normal-week baseline</Text><Text style={[s.label, { color: colors.waterDeep }]}>{formatHours(routineHours)}</Text></View>{routineCatalog.filter(item => routines[item.id]).map(item => <View key={item.id} style={s.rowBetween}><Text style={s.bodySmall}>{item.label}</Text><Text style={s.caption}>{formatHours(weeklyHours(routines[item.id]))}</Text></View>)}<AppButton text="Revisit my baseline" variant="quiet" onPress={onBaseline} /></Card>
    <SectionLabel>Personal capacity answers</SectionLabel><View style={s.wrapRow}>{(Object.keys(capacityMeta) as CapacityKind[]).map(kind => <Card key={kind} style={{ width: "48%", flexGrow: 1, gap: 5, borderTopWidth: 4, borderTopColor: capacityMeta[kind].color }}><Text style={[s.eyebrow, { color: capacityMeta[kind].color }]}>{capacityMeta[kind].label.toUpperCase()}</Text><Text style={s.label}>{answers[kind] === undefined ? "Uses a balanced default" : `Answer ${answers[kind]! + 1} of 4`}</Text></Card>)}</View>
  </View></ScrollPage>;
}

const academicStyles = StyleSheet.create({
  pressed: { opacity: 0.68 },
  textAction: { minHeight: layout.touchTarget, justifyContent: "center", alignSelf: "flex-start", paddingHorizontal: 3 },
  textActionLabel: { ...type.label, color: colors.forest },
  weekNav: { minHeight: 58, borderRadius: 17, backgroundColor: colors.forest, flexDirection: "row", alignItems: "center", paddingHorizontal: 6 },
  weekNavButton: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  weekNavSymbol: { fontFamily: fonts.medium, fontSize: 30, lineHeight: 34, color: colors.white },
  weekNavTitle: { flex: 1, alignItems: "center" },
  weekRange: { ...type.h3, color: colors.white },
  weekContext: { ...type.eyebrow, color: colors.mint, fontSize: 10, lineHeight: 13, marginTop: 1 },
  weekMeta: { minHeight: layout.touchTarget, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 6 },
  weekGrid: { flexDirection: "row", gap: 4 },
  dayCell: { flex: 1, minWidth: 0, minHeight: 78, borderRadius: 12, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.outlineSoft, alignItems: "center", justifyContent: "center", gap: 3, paddingHorizontal: 2, paddingVertical: 6 },
  dayCellBusy: { backgroundColor: colors.softMint },
  dayCellSelected: { backgroundColor: colors.forest, borderColor: colors.forest },
  dayName: { fontFamily: fonts.bold, fontSize: 9, lineHeight: 12, color: colors.textMuted, letterSpacing: 0.35 },
  dayDate: { fontFamily: fonts.number, fontSize: 16, lineHeight: 20, color: colors.ink },
  dayTextSelected: { color: colors.white },
  dayCount: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center" },
  dayCountSelected: { backgroundColor: colors.mint },
  dayCountText: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, color: colors.textMuted },
  dayCountTextSelected: { color: colors.forest },
  selectedHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12, paddingTop: 4 },
  detailEyebrow: { ...type.eyebrow, color: colors.forest },
  selectedDate: { ...type.h2, color: colors.ink, marginTop: 1 },
  sessionList: { borderRadius: layout.radius, overflow: "hidden", borderWidth: 1, borderColor: colors.outlineSoft, backgroundColor: colors.paper },
  sessionRow: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 13, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.outlineSoft },
  classAccent: { width: 5, height: 42, borderRadius: 3, backgroundColor: colors.waterDeep },
  commitmentAccent: { width: 5, height: 42, borderRadius: 3, backgroundColor: colors.amber },
  sessionTitle: { ...type.label, color: colors.ink, flexShrink: 1 },
  sessionTime: { ...type.label, color: colors.forest, flexShrink: 0 },
  compactEmpty: { minHeight: 58, justifyContent: "center", paddingHorizontal: 14, paddingVertical: 10 },
  importPrompt: { gap: 12 },
  secondaryActionRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 6, borderTopWidth: 1, borderColor: colors.outlineSoft, paddingTop: 8 },
  contextNote: { borderRadius: 14, backgroundColor: colors.softMint, paddingHorizontal: 14, paddingVertical: 10, gap: 2 },
  connectedRow: { minHeight: layout.touchTarget, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 6 },
  emptyModules: { gap: 12 },
  moduleHeader: { gap: 4 },
  headerActions: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  inlineForm: { gap: 11 },
  formActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  formButton: { flexGrow: 1, minWidth: 116 },
  moduleList: { gap: 10 },
  moduleSurface: { borderRadius: layout.radius, borderWidth: 1, borderColor: colors.outlineSoft, backgroundColor: colors.paper, overflow: "hidden" },
  moduleSurfaceExpanded: { borderColor: colors.waterDeep },
  moduleSummary: { minHeight: 84, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 15, paddingVertical: 13 },
  moduleTitleRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 7 },
  moduleTitle: { ...type.h3, color: colors.ink, flexShrink: 1 },
  moduleMeta: { ...type.bodySmall, color: colors.textMuted, marginTop: 4, flexShrink: 1 },
  sourceBadge: { borderRadius: 7, backgroundColor: colors.softMint, paddingHorizontal: 7, paddingVertical: 4 },
  manualBadge: { backgroundColor: colors.softAmber },
  sourceBadgeText: { fontFamily: fonts.bold, fontSize: 9, lineHeight: 11, letterSpacing: 0.6, color: colors.forest },
  moduleDetail: { borderTopWidth: 1, borderTopColor: colors.outlineSoft, padding: 15, gap: 0, backgroundColor: colors.canvas },
  detailSection: { gap: 9, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.outlineSoft },
  detailHeading: { ...type.eyebrow, color: colors.textMuted },
  assignmentSummary: { borderRadius: 15, backgroundColor: colors.lavender, padding: 13, flexDirection: "row", alignItems: "center", gap: 10 },
  assignmentTitle: { ...type.h3, color: colors.violet },
  compactButton: { minHeight: 48, paddingHorizontal: 14, flexShrink: 0 },
  assignmentEditor: { borderRadius: 15, borderWidth: 1, borderColor: colors.violet, backgroundColor: colors.paper, padding: 13, gap: 10 },
  datePath: { ...type.eyebrow, color: colors.violet },
  validation: { ...type.bodySmall, color: colors.coralDark },
  removeConfirmation: { borderRadius: 14, backgroundColor: colors.softCoral, padding: 13, gap: 10 },
  saveArea: { borderRadius: 16, backgroundColor: colors.mint, padding: 13, gap: 9 },
});
