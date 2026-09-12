import { Text, View } from "react-native";
import { AppButton, Card, InlineNotice, PageHeader, ScrollPage, SectionLabel } from "@/components/MarginUI";
import { CommitmentForm } from "./OnboardingScreens";
import { CapacityValue, Commitment, capacityMeta } from "@/models/margin";
import { prettyDate } from "@/models/planner";
import { screenStyles as s } from "./screenStyles";

export function WhatIfForm({ draft, date, onBack, onTest }: { draft?: Commitment; date: string; onBack: () => void; onTest: (item: Commitment) => void }) {
  return <CommitmentForm initial={draft} defaultDate={date} eyebrow="Test a possible commitment" title="See how it fits" body="Try the real dates and effort. Nothing is added to your plan until you confirm." submitText="Preview the impact" onBack={onBack} onSubmit={onTest} />;
}

export function WhatIfResult({ draft, capacities, onBack, onConfirm, onDecline, onPlan }: { draft: Commitment; capacities: CapacityValue[]; onBack: () => void; onConfirm: () => void; onDecline: () => void; onPlan: () => void }) {
  const rows = capacities.map(v => ({ kind: v.kind, before: Math.round(v.used / v.limit * 100), after: Math.round((v.used + draft[v.kind]) / v.limit * 100) }));
  const overloaded = rows.some(r => r.after > 100);
  return <ScrollPage><PageHeader eyebrow="Preview · not added" title={draft.name} body={`${draft.startDate ? prettyDate(draft.startDate) : "Illustrative session today · dates not set"} · ${draft.durationHours} hours`} onBack={onBack} /><View style={s.content}>
    <SectionLabel>That day, before and after</SectionLabel>
    <Card tone="dark" style={{ gap: 14 }}>{rows.map(row => <View key={row.kind} style={s.rowBetween}><Text style={[s.whiteBody, s.flex]}>{capacityMeta[row.kind].label}</Text><Text style={s.whiteTitle}>{row.before}% → {row.after}%</Text></View>)}</Card>
    <InlineNotice title={overloaded ? "This goes beyond a personal limit" : "This fits within your current limits"} body="These are estimates based on your routine, check-in and the effort you entered. You can change the date or make the commitment smaller." tone={overloaded ? "amber" : "mint"} />
    <AppButton text={overloaded ? "Add with this load" : "Confirm & add commitment"} onPress={onConfirm} />
    <AppButton text="Try another date or duration" variant="secondary" onPress={onBack} />
    <AppButton text="Review my plan first" variant="quiet" onPress={onPlan} />
    <AppButton text="Don’t add this commitment" variant="quiet" onPress={onDecline} />
  </View></ScrollPage>;
}
