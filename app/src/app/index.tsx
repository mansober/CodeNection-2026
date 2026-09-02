import { ScrollView, StyleSheet } from 'react-native';

import { ApiStatusCard } from '@/components/api-status-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">CodeNection</ThemedText>
        <ThemedText themeColor="textSecondary">
          Your mobile experience is ready to connect to the API.
        </ThemedText>
        <ApiStatusCard />
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
  container: { flex: 1, gap: 20, padding: 24, paddingTop: 72 },
});
