import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppButton, Card, FormField, InlineNotice, PageHeader, ScrollPage } from "@/components/MarginUI";
import { MascotAvatar } from "@/components/MascotAvatar";
import { screenStyles as s } from "@/screens/screenStyles";
import { colors, layout, type } from "@/theme/tokens";

type AuthMode = "signin" | "signup";

export function AuthScreen({
  configured,
  connectionError,
  onSignIn,
  onSignUp,
}: {
  configured: boolean;
  connectionError?: string;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError("");
    setPassword("");
    setConfirmPassword("");
  };

  const submit = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      if (mode === "signup") await onSignUp(normalizedEmail, password);
      else await onSignIn(normalizedEmail, password);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollPage contentStyle={styles.page}>
      <PageHeader
        eyebrow="Santai"
        title={mode === "signin" ? "Welcome back" : "Create your account"}
        body="Your planner stays connected to your account across sessions."
      />
      <View style={[s.content, styles.content]}>
        <View style={styles.mascotWrap}><MascotAvatar size={104} /></View>
        {!configured ? (
          <InlineNotice
            title="Backend connection required"
            body="Set EXPO_PUBLIC_API_URL in app/.env, then restart Expo."
            tone="amber"
          />
        ) : connectionError ? (
          <InlineNotice title="Could not restore your session" body={connectionError} tone="amber" />
        ) : null}
        <Card style={styles.form}>
          <View style={styles.modeRow}>
            <AppButton
              text="Sign in"
              variant={mode === "signin" ? "primary" : "quiet"}
              style={styles.modeButton}
              onPress={() => switchMode("signin")}
            />
            <AppButton
              text="Sign up"
              variant={mode === "signup" ? "primary" : "quiet"}
              style={styles.modeButton}
              onPress={() => switchMode("signup")}
            />
          </View>
          <FormField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <FormField
            label="Password"
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            textContentType={mode === "signup" ? "newPassword" : "password"}
            secureTextEntry
            onSubmitEditing={mode === "signin" ? submit : undefined}
          />
          {mode === "signup" ? (
            <FormField
              label="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              secureTextEntry
              onSubmitEditing={submit}
            />
          ) : null}
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <AppButton
            text={submitting ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            disabled={!configured || submitting}
            onPress={submit}
          />
          <Text style={styles.privacy}>Your password is stored only as a secure Argon2 hash.</Text>
        </Card>
      </View>
    </ScrollPage>
  );
}

const styles = StyleSheet.create({
  page: { paddingBottom: 32 },
  content: { width: "100%", maxWidth: 460, alignSelf: "center" },
  mascotWrap: {
    width: 118,
    height: 118,
    borderRadius: 59,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.mint,
    borderWidth: 4,
    borderColor: colors.paper,
    marginTop: -14,
  },
  form: { gap: 15, padding: layout.pagePadding },
  modeRow: { flexDirection: "row", gap: 8 },
  modeButton: { flex: 1, minWidth: 0 },
  error: { ...type.bodySmall, color: colors.coralDark },
  privacy: { ...type.caption, color: colors.textMuted, textAlign: "center" },
});
