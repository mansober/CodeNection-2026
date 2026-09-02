import { StyleSheet } from 'react-native';

import { useHealth } from '@/hooks/use-health';
import { API_URL } from '@/lib/api';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export function ApiStatusCard() {
  const { data, error, isLoading } = useHealth();
  const label = isLoading ? 'Checking connection…' : data ? 'API is online' : 'API unavailable';

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Backend status</ThemedText>
      <ThemedText themeColor="textSecondary" type="small">
        {label}
      </ThemedText>
      <ThemedText themeColor="textSecondary" type="code">
        {error ?? API_URL}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 6,
    borderRadius: 16,
    padding: 20,
  },
});
