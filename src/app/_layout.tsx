import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { supabase } from "../../utils/supabase";
import * as Updates from "expo-updates";
import { Alert } from "react-native";

const isDevelopment = __DEV__;

export default function RootLayout() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "loginScreen";

    if (!session && !inAuthGroup) {
      // If not logged in, redirect to loginScreen
      router.replace("/loginScreen");
    } else if (session && inAuthGroup) {
      // If logged in and in auth group, redirect to index
      router.replace("/");
    }
  }, [session, loading, segments]);

  useEffect(() => {
    if (isDevelopment) return;

    async function checkUpdates() {
      try {
        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          Alert.alert(
            "Nueva Versión Disponible",
            "Hay una actualización disponible para la aplicación. ¿Deseas actualizar ahora?",
            [
              {
                text: "Cancelar",
                style: "cancel"
              },
              {
                text: "Actualizar",
                onPress: async () => {
                  await Updates.fetchUpdateAsync();
                  await Updates.reloadAsync();
                }
              }
            ]
          );
        }
      } catch (e) {
        console.error("Error checking for updates:", e);
      }
    }

    checkUpdates();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="project-task" options={{ headerShown: false }} />
      <Stack.Screen name="loginScreen" options={{ headerShown: false }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0F172A", // Dark theme matching loginScreen
    justifyContent: "center",
    alignItems: "center",
  },
});

