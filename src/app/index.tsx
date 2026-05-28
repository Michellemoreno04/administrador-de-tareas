import { useState, useEffect } from "react";
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "../../utils/supabase";

type Project = {
  id: string;
  title: string;
  description: string;
};

type User = {
  id: string;
  email: string;
};

export default function Home() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");

  const fetchProjects = async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) setIsLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("No autenticado");

      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", authData.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }
      setProjects(data || []);
    } catch (error: any) {
      Alert.alert("Error", "No se pudieron cargar los proyectos: " + error.message);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !authUser) return;
        setUser({
          id: authUser.id,
          email: authUser.email || "",
        });
      } catch (err: any) {
        console.error("Error al cargar usuario:", err.message);
      }
    };
    loadUser();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProjects(false);
  };

  const handleAddProject = async () => {
    if (!newProjectTitle.trim()) return;

    setIsLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("No autenticado");

      const { data, error } = await supabase
        .from("projects")
        .insert([
          {
            title: newProjectTitle.trim(),
            description: newProjectDescription.trim(),
            user_id: authData.user.id,
          },
        ])
        .select();

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        setProjects([data[0], ...projects]);
      } else {
        fetchProjects(false);
      }

      setNewProjectTitle("");
      setNewProjectDescription("");
      setIsAdding(false);
    } catch (error: any) {
      Alert.alert("Error", "No se pudo crear el proyecto: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectPress = (project: Project) => {
    router.push({
      pathname: "/project-task",
      params: { projectId: project.id, projectName: project.title },
    });
  };

  const handleLogout = async () => {
    Alert.alert(
      "Cerrar Sesión",
      "¿Estás seguro de que deseas cerrar sesión?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, salir",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase.auth.signOut();
              if (error) throw error;
            } catch (error: any) {
              Alert.alert("Error", "No se pudo cerrar sesión: " + error.message);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loaderText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerSubtitle}>Bienvenido, {user?.email}</Text>
            <Text style={styles.headerTitle}>Mis Proyectos</Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerLogoutButton}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Text style={styles.headerLogoutButtonText}>🚪</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerAddButton}
              onPress={() => setIsAdding(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.headerAddButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Lista de Proyectos */}
        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loaderText}>Cargando proyectos...</Text>
          </View>
        ) : projects.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📁</Text>
            <Text style={styles.emptyTitle}>No hay proyectos</Text>
            <Text style={styles.emptyDescription}>
              Toca el botón + para crear tu primer proyecto y empezar a organizar tus tareas.
            </Text>
          </View>
        ) : (
          <View style={styles.projectsGrid}>
            {projects.map((project) => (
              <TouchableOpacity
                key={project.id}
                style={styles.projectCard}
                onPress={() => handleProjectPress(project)}
                activeOpacity={0.8}
              >
                <View style={styles.projectIconContainer}>
                  <Text style={styles.projectIcon}>📋</Text>
                </View>
                <Text style={styles.projectTitle} numberOfLines={1}>
                  {project.title}
                </Text>
                {project.description ? (
                  <Text style={styles.projectDescription} numberOfLines={2}>
                    {project.description}
                  </Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Modal para Crear Proyecto */}
        <Modal visible={isAdding} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Nuevo Proyecto</Text>

              <TextInput
                style={styles.modalInput}
                placeholder="Nombre del proyecto"
                value={newProjectTitle}
                onChangeText={setNewProjectTitle}
                placeholderTextColor="#9CA3AF"
              />

              <TextInput
                style={[styles.modalInput, styles.descriptionInput]}
                placeholder="Descripción (opcional)"
                value={newProjectDescription}
                onChangeText={setNewProjectDescription}
                multiline
                placeholderTextColor="#9CA3AF"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setIsAdding(false);
                    setNewProjectTitle("");
                    setNewProjectDescription("");
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.createButton,
                    !newProjectTitle.trim() && styles.createButtonDisabled,
                  ]}
                  onPress={handleAddProject}
                  disabled={!newProjectTitle.trim()}
                >
                  <Text style={styles.createButtonText}>Crear Proyecto</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: "#3B82F6",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    padding: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#64748B",
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerAddButton: {
    backgroundColor: "#3B82F6",
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  headerAddButtonText: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "500",
    marginTop: -2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerLogoutButton: {
    backgroundColor: "#FFE4E6",
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#F43F5E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#FECDD3",
  },
  headerLogoutButtonText: {
    fontSize: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
  },
  projectsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
  },
  projectCard: {
    backgroundColor: "#FFFFFF",
    width: "47%",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  projectIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  projectIcon: {
    fontSize: 20,
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 6,
  },
  projectDescription: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 20,
    color: "#0F172A",
  },
  modalInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 16,
    fontSize: 16,
    color: "#1E293B",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  descriptionInput: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 12,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#64748B",
    fontWeight: "700",
    fontSize: 15,
  },
  createButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonDisabled: {
    backgroundColor: "#93C5FD",
    shadowOpacity: 0,
    elevation: 0,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },

});
