// app/(auth)/index.tsx
import { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../../utils/supabase";

export default function AuthScreen() {
    const [isLogin, setIsLogin] = useState(true);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);

    async function handleAuth() {
        if (!email || !password) {
            Alert.alert("Error", "Completa todos los campos");
            return;
        }

        if (password.length < 6) {
            Alert.alert("Error", "La contraseña debe tener mínimo 6 caracteres");
            return;
        }

        try {
            setLoading(true);

            if (isLogin) {
                // LOGIN
                const { error } = await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password,
                });

                if (error) throw error;

                Alert.alert("Éxito", "Sesión iniciada");
            } else {
                // SIGN UP
                const { data, error } = await supabase.auth.signUp({
                    email: email.trim(),
                    password,
                });

                if (error) throw error;

                // Si no hay sesión, significa que Supabase está pidiendo confirmación por correo
                if (!data.session) {
                    Alert.alert(
                        "Cuenta creada",
                        "Revisa tu correo para confirmar la cuenta"
                    );
                } else {
                    Alert.alert("Éxito", "Cuenta creada y sesión iniciada");
                }
            }
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.keyboard}
            >
                <View style={styles.content}>
                    <Text style={styles.title}>
                        {isLogin ? "Bienvenido 👋" : "Crear Cuenta 🚀"}
                    </Text>

                    <Text style={styles.subtitle}>
                        {isLogin
                            ? "Inicia sesión para continuar"
                            : "Regístrate para comenzar"}
                    </Text>

                    <View style={styles.form}>
                        <TextInput
                            placeholder="Correo electrónico"
                            placeholderTextColor="#999"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            style={styles.input}
                        />

                        <TextInput
                            placeholder="Contraseña"
                            placeholderTextColor="#999"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            style={styles.input}
                        />

                        <TouchableOpacity
                            style={styles.button}
                            onPress={handleAuth}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>
                                    {isLogin ? "Iniciar Sesión" : "Crear Cuenta"}
                                </Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setIsLogin(!isLogin)}
                            style={styles.switchButton}
                        >
                            <Text style={styles.switchText}>
                                {isLogin
                                    ? "¿No tienes cuenta? Regístrate"
                                    : "¿Ya tienes cuenta? Inicia sesión"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0F172A",
    },

    keyboard: {
        flex: 1,
    },

    content: {
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: 24,
    },

    title: {
        fontSize: 34,
        fontWeight: "700",
        color: "#fff",
        marginBottom: 10,
    },

    subtitle: {
        fontSize: 16,
        color: "#94A3B8",
        marginBottom: 40,
    },

    form: {
        gap: 16,
    },

    input: {
        backgroundColor: "#1E293B",
        color: "#fff",
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 14,
        fontSize: 16,
        borderWidth: 1,
        borderColor: "#334155",
    },

    button: {
        backgroundColor: "#3B82F6",
        paddingVertical: 16,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 10,
    },

    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },

    switchButton: {
        marginTop: 10,
        alignItems: "center",
    },

    switchText: {
        color: "#60A5FA",
        fontSize: 14,
        fontWeight: "500",
    },
});