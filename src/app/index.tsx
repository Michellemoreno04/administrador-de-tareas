import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Project,
  createProject,
  deleteProject,
  getProjects,
} from "../services/projectService";

import {
  User,
  getCurrentUser,
  signOut,
} from "../services/authService";

const { width } = Dimensions.get("window");

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
      const data = await getProjects();
      setProjects(data || []);
    } catch (error: any) {
      console.log("Error in fetching projects: ", error)
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          await fetchProjects();
        } else {
          setIsLoading(false);
        }
      } catch (err: any) {
        console.log(err);
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProjects(false);
  };

  const handleAddProject = async () => {
    if (!newProjectTitle.trim()) return;

    try {
      const newProject = await createProject(
        newProjectTitle,
        newProjectDescription
      );

      if (newProject) {
        setProjects([newProject, ...projects]);
      }

      setNewProjectTitle("");
      setNewProjectDescription("");
      setIsAdding(false);
    } catch (error: any) {
      Alert.alert(
        "Error",
        "No se pudo crear el proyecto: " + error.message
      );
    }
  };

  const handleProjectPress = (project: Project) => {
    router.push({
      pathname: "/project-task",
      params: {
        projectId: project.id,
        projectName: project.title,
      },
    });
  };

  const handleLogout = async () => {
    Alert.alert(
      "Cerrar Sesión",
      "¿Deseas cerrar sesión?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Salir",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut();
            } catch (error: any) {
              Alert.alert(
                "Error",
                "No se pudo cerrar sesión: " + error.message
              );
            }
          },
        },
      ]
    );
  };

  const handleDeleteProject = (project: Project) => {
    Alert.alert(
      "Eliminar Proyecto",
      `¿Estás seguro de que quieres eliminar "${project.title}"?`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoading(true);
              await deleteProject(project.id);
              setProjects(projects.filter(p => p.id !== project.id));
            } catch (error: any) {
              Alert.alert("Error", "No se pudo eliminar el proyecto: " + error.message);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loaderText}>Preparando tu espacio...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <StatusBar style="light" />

      {/* HEADER SECTION with vibrant gradient */}
      <LinearGradient
        colors={["#4F46E5", "#9333EA", "#DB2777"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.greetingText}>Bienvenido de vuelta 👋</Text>
            <Text numberOfLines={1} style={styles.emailText}>
              {user?.email || "Cargando..."}
            </Text>
            <Text style={styles.headerTitle}>Mis Proyectos</Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Text style={styles.iconButtonText}>🚪</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* STATS OVERLAY */}
      <View style={styles.statsWrapper}>
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{projects.length}</Text>
            <Text style={styles.statLabel}>Totales</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{projects.length > 0 ? "Activos" : "Vacío"}</Text>
            <Text style={styles.statLabel}>Estado</Text>
          </View>
          <View style={styles.statDivider} />
          <TouchableOpacity
            style={styles.mainAddButton}
            onPress={() => setIsAdding(true)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#4F46E5", "#7C3AED"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.mainAddButtonGradient}
            >
              <Text style={styles.mainAddButtonText}>+</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* CONTENT LIST */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4F46E5"
            colors={["#4F46E5"]}
          />
        }
      >
        {projects.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Text style={styles.emptyIcon}>✨</Text>
            </View>
            <Text style={styles.emptyTitle}>Un lienzo en blanco</Text>
            <Text style={styles.emptyDescription}>
              Comienza a organizar tus ideas creando tu primer proyecto hoy mismo.
            </Text>
            <TouchableOpacity
              style={styles.createFirstButton}
              onPress={() => setIsAdding(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.createFirstButtonText}>Crear Proyecto</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.projectsList}>
            <Text style={styles.sectionHeader}>Tus Proyectos</Text>
            <View style={styles.projectsListContainer}>
              {projects.map((project, index) => {
                const themes = [
                  { bg: '#315ce9ff', icon: '🚀', tint: '#1e14e1ff', text: '#312E81' },
                  { bg: '#d9298aff', icon: '✨', tint: '#DB2777', text: '#831843' },
                  { bg: '#1fc04fff', icon: '🎨', tint: '#16A34A', text: '#14532D' },
                  { bg: '#FFFBEB', icon: '🔥', tint: '#D97706', text: '#78350F' },
                  { bg: '#712bb8ff', icon: '💡', tint: '#9333EA', text: '#581C87' },
                ];
                const theme = themes[index % themes.length];

                const tasks = project.tasks || [];
                const totalTasks = tasks.length;
                const completedTasks = tasks.filter(t => t.status === 'completada').length;
                const progress = totalTasks > 0 ? (completedTasks / totalTasks) : 0;
                const progressPercent = Math.round(progress * 100);

                const isCompleted = totalTasks > 0 && totalTasks === completedTasks;
                const cardBg = isCompleted ? theme.bg : "#FFFFFF";

                return (
                  <View key={project.id} style={styles.projectSphereWrapper}>
                    <TouchableOpacity
                      style={styles.projectSphereContainer}
                      activeOpacity={0.8}
                      onPress={() => handleProjectPress(project)}
                      onLongPress={() => handleDeleteProject(project)}
                    >
                      <View style={[styles.projectSphere, { borderColor: theme.bg }]}>
                        {/* Background fill based on progress */}
                        <View
                          style={[
                            styles.projectSphereFill,
                            {
                              height: `${progressPercent}%`,
                              backgroundColor: theme.tint,
                              opacity: 0.2
                            }
                          ]}
                        />

                        {/* Icon and content centered */}
                        <View style={styles.projectSphereContent}>
                          <Text style={[styles.projectInitialText, { color: theme.tint }]}>
                            {project.title ? project.title.charAt(0).toUpperCase() : "?"}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                    <Text numberOfLines={1} style={styles.projectSphereTitle}>
                      {project.title}
                    </Text>
                    <Text style={[styles.projectSphereProgress, { color: theme.tint }]}>
                      {progressPercent}%
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* CREATE MODAL */}
      <Modal
        visible={isAdding}
        transparent
        animationType="slide"
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuevo Proyecto</Text>
              <TouchableOpacity onPress={() => setIsAdding(false)} style={styles.closeModalBtn}>
                <Text style={styles.closeModalText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Dale un nombre y describe de qué trata este nuevo proyecto.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nombre del proyecto</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. Rediseño de app..."
                placeholderTextColor="#94A3B8"
                value={newProjectTitle}
                onChangeText={setNewProjectTitle}
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Descripción (Opcional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Añade detalles sobre los objetivos..."
                placeholderTextColor="#94A3B8"
                multiline
                value={newProjectDescription}
                onChangeText={setNewProjectDescription}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                !newProjectTitle.trim() && styles.submitButtonDisabled,
              ]}
              disabled={!newProjectTitle.trim()}
              onPress={handleAddProject}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={newProjectTitle.trim() ? ["#4F46E5", "#7C3AED"] : ["#CBD5E1", "#CBD5E1"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitButtonGradient}
              >
                <Text style={styles.submitButtonText}>Crear Proyecto</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loaderText: {
    marginTop: 16,
    fontSize: 16,
    color: "#4F46E5",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  headerGradient: {
    paddingHorizontal: 24,
    paddingBottom: 60,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerTextContainer: {
    flex: 1,
  },
  greetingText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
    marginBottom: 4,
  },
  emailText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 16,
    fontWeight: "400",
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  iconButtonText: {
    fontSize: 20,
  },
  statsWrapper: {
    paddingHorizontal: 24,
    marginTop: -40,
    zIndex: 10,
  },
  statsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  statItem: {
    flex: 1,
    alignItems: "flex-start",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 16,
  },
  mainAddButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  mainAddButtonGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  mainAddButtonText: {
    fontSize: 28,
    color: "#FFFFFF",
    fontWeight: "600",
    marginTop: -2,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 120,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },
  emptyDescription: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  createFirstButton: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 100,
  },
  createFirstButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  projectsList: {
    marginTop: 10,
    paddingBottom: 20,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 16,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  projectsListContainer: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 16,
    paddingHorizontal: 8,
  },
  projectSphereWrapper: {
    width: '28%',
    alignItems: 'center',
    marginBottom: 28,
  },
  projectSphereContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  projectSphere: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#FFFFFF',
    borderWidth: 5,
    overflow: 'hidden',
    position: 'relative',

  },
  projectSphereFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  projectSphereContent: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  projectInitialText: {
    fontSize: 36,
    fontWeight: '800',
  },
  projectSphereTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
    marginBottom: 2,
  },
  projectSphereProgress: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    minHeight: "50%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
  },
  closeModalBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  closeModalText: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "700",
  },
  modalSubtitle: {
    fontSize: 15,
    color: "#64748B",
    marginBottom: 28,
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: "#0F172A",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
    paddingTop: 16,
  },
  submitButton: {
    marginTop: 12,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonGradient: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});