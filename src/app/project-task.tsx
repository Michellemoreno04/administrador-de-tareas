import * as Haptic from 'expo-haptics';
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,

    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../utils/supabase";

type TaskStatus = "por-hacer" | "pendiente" | "completada";

type Task = {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
};

export default function ProjectTask() {
    const router = useRouter();
    const { projectId, projectName } = useLocalSearchParams();

    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newTaskDescription, setNewTaskDescription] = useState("");

    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isViewing, setIsViewing] = useState(false);
    const [editTaskTitle, setEditTaskTitle] = useState("");
    const [editTaskDescription, setEditTaskDescription] = useState("");

    const fetchTasks = async (showLoadingIndicator = true) => {
        if (!projectId) return;
        if (showLoadingIndicator) setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("tasks")
                .select("*")
                .eq("project_id", projectId)
                .order("created_at", { ascending: true });

            if (error) throw error;
            setTasks(data || []);
        } catch (error: any) {
            Alert.alert("Error", "No se pudieron cargar las tareas: " + error.message);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, [projectId]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchTasks(false);
    };

    const handleAddTask = async () => {
        if (!newTaskTitle.trim() || !projectId) return;

        try {
            const { data, error } = await supabase
                .from("tasks")
                .insert([
                    {
                        project_id: projectId,
                        title: newTaskTitle.trim(),
                        description: newTaskDescription.trim(),
                        status: "por-hacer",
                    },
                ])
                .select();

            if (error) throw error;

            if (data && data.length > 0) {
                setTasks([...tasks, data[0]]);
            } else {
                fetchTasks(false);
            }

            setNewTaskTitle("");
            setNewTaskDescription("");
            setIsAdding(false);
        } catch (error: any) {
            Alert.alert("Error", "No se pudo crear la tarea: " + error.message);
        }
    };

    const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
        try {
            const { error } = await supabase
                .from("tasks")
                .update({ status: newStatus })
                .eq("id", taskId);

            if (error) throw error;

            setTasks(
                tasks.map((task) =>
                    task.id === taskId ? { ...task, status: newStatus } : task
                )
            );
        } catch (error: any) {
            Alert.alert("Error", "No se pudo actualizar el estado: " + error.message);
        }
    };

    const handleLongPress = async (task: Task) => {

        await Haptic.impactAsync(Haptic.ImpactFeedbackStyle.Heavy);
        setSelectedTask(task);
        setIsMenuVisible(true);
    };

    const handleUpdateTask = async () => {
        if (!selectedTask || !editTaskTitle.trim()) return;

        try {
            const { error } = await supabase
                .from("tasks")
                .update({
                    title: editTaskTitle.trim(),
                    description: editTaskDescription.trim()
                })
                .eq("id", selectedTask.id);

            if (error) throw error;

            setTasks(
                tasks.map((task) =>
                    task.id === selectedTask.id ? { ...task, title: editTaskTitle.trim(), description: editTaskDescription.trim() } : task
                )
            );
            setIsEditing(false);
            setSelectedTask(null);
        } catch (error: any) {
            Alert.alert("Error", "No se pudo actualizar la tarea: " + error.message);
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        Alert.alert(
            "Eliminar tarea",
            "¿Estás seguro de que quieres eliminar esta tarea?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from("tasks")
                                .delete()
                                .eq("id", taskId);

                            if (error) throw error;

                            setTasks(tasks.filter((task) => task.id !== taskId));
                        } catch (error: any) {
                            Alert.alert("Error", "No se pudo eliminar la tarea: " + error.message);
                        }
                    },
                },
            ]
        );
    };

    const getNextStatus = (currentStatus: TaskStatus): TaskStatus => {
        if (currentStatus === "por-hacer") return "pendiente";
        if (currentStatus === "pendiente") return "completada";
        return "por-hacer";
    };

    const getStatusButtonText = (currentStatus: TaskStatus): string => {
        if (currentStatus === "por-hacer") return "Iniciar ⚡";
        if (currentStatus === "pendiente") return "Completar ✅";
        return "Reabrir 🔄";
    };

    const renderTasks = (status: TaskStatus) => {
        const filteredTasks = tasks.filter(
            (task) => task.status === status
        );

        if (filteredTasks.length === 0) {
            return (
                <Text style={styles.emptyText}>
                    Sin tareas
                </Text>
            );
        }

        return filteredTasks.map((task) => (
            <TouchableOpacity
                key={task.id}
                style={styles.taskItem}
                onLongPress={() => handleLongPress(task)}
                delayLongPress={300}
                activeOpacity={0.8}
            >
                <View style={styles.taskContentContainer}>
                    <Text style={styles.taskTitle}>
                        {task.title}
                    </Text>

                    {task.description ? (
                        <Text style={styles.taskDescription}>
                            {task.description}
                        </Text>
                    ) : null}
                </View>

                <View style={styles.taskActions}>
                    <TouchableOpacity
                        style={[
                            styles.statusButton,
                            task.status === "pendiente" && styles.statusButtonPending,
                            task.status === "completada" && styles.statusButtonCompleted,
                        ]}
                        onPress={() => handleUpdateTaskStatus(task.id, getNextStatus(task.status))}
                    >
                        <Text style={styles.statusButtonText}>
                            {getStatusButtonText(task.status)}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteTask(task.id)}
                    >
                        <Text style={styles.deleteButtonText}>🗑️</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        ));
    };

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
                    <View style={styles.headerTitleContainer}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={styles.backButton}
                        >
                            <Text style={styles.backButtonText}>←</Text>
                        </TouchableOpacity>
                        <View style={{ flex: 1, paddingRight: 16 }}>
                            <Text style={styles.headerSubtitle}>Proyecto</Text>
                            <Text style={styles.headerTitle} numberOfLines={1}>
                                {projectName || "Mis Tareas"}
                            </Text>

                            {tasks.length > 0 && (
                                <View style={styles.headerProgressContainer}>
                                    <View style={styles.headerProgressBarBg}>
                                        <View style={[styles.headerProgressBarFill, { width: `${Math.round((tasks.filter(t => t.status === 'completada').length / tasks.length) * 100)}%` }]} />
                                    </View>
                                    <Text style={styles.headerProgressText}>
                                        {Math.round((tasks.filter(t => t.status === 'completada').length / tasks.length) * 100)}% completado
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.headerAddButton}
                        onPress={() => setIsAdding(true)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.headerAddButtonText}>
                            +
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Modal */}
                <Modal
                    visible={isAdding}
                    transparent
                    animationType="fade"
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>
                                Nueva tarea
                            </Text>

                            <TextInput
                                style={styles.modalInput}
                                placeholder="Título"
                                value={newTaskTitle}
                                onChangeText={setNewTaskTitle}
                            />

                            <TextInput
                                style={[
                                    styles.modalInput,
                                    styles.descriptionInput,
                                ]}
                                placeholder="Descripción"
                                value={newTaskDescription}
                                onChangeText={setNewTaskDescription}
                                multiline
                            />

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => {
                                        setIsAdding(false);
                                        setNewTaskTitle("");
                                        setNewTaskDescription("");
                                    }}
                                >
                                    <Text style={styles.cancelButtonText}>
                                        Cancelar
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.createButton}
                                    onPress={handleAddTask}
                                >
                                    <Text style={styles.createButtonText}>
                                        Crear
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Menu Modal */}
                <Modal
                    visible={isMenuVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setIsMenuVisible(false)}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setIsMenuVisible(false)}
                    >
                        <View style={styles.menuContent}>
                            <Text style={styles.menuTitle} numberOfLines={1}>
                                {selectedTask?.title}
                            </Text>

                            <TouchableOpacity
                                style={styles.menuOption}
                                onPress={() => {
                                    setIsMenuVisible(false);
                                    setIsViewing(true);
                                }}
                            >
                                <Text style={styles.menuOptionText}>Ver detalles</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.menuOption}
                                onPress={() => {
                                    setIsMenuVisible(false);
                                    setEditTaskTitle(selectedTask?.title || "");
                                    setEditTaskDescription(selectedTask?.description || "");
                                    setIsEditing(true);
                                }}
                            >
                                <Text style={styles.menuOptionText}>Editar tarea</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.menuOption, styles.menuOptionDestructive]}
                                onPress={() => {
                                    setIsMenuVisible(false);
                                    if (selectedTask) handleDeleteTask(selectedTask.id);
                                }}
                            >
                                <Text style={styles.menuOptionTextDestructive}>Eliminar tarea</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* View Details Modal */}
                <Modal
                    visible={isViewing}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setIsViewing(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.viewHeader}>
                                <Text style={styles.modalTitle}>Detalles de la tarea</Text>
                                <TouchableOpacity onPress={() => setIsViewing(false)}>
                                    <Text style={styles.closeButtonText}>✕</Text>
                                </TouchableOpacity>
                            </View>
                            <ScrollView style={styles.viewScroll}>
                                <Text style={styles.viewLabel}>Título</Text>
                                <Text style={styles.viewValue}>{selectedTask?.title}</Text>

                                <Text style={styles.viewLabel}>Descripción</Text>
                                <Text style={styles.viewValue}>{selectedTask?.description || "Sin descripción"}</Text>

                                <Text style={styles.viewLabel}>Estado</Text>
                                <Text style={styles.viewValue}>{selectedTask?.status}</Text>
                            </ScrollView>
                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={styles.createButton}
                                    onPress={() => setIsViewing(false)}
                                >
                                    <Text style={styles.createButtonText}>Cerrar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Edit Task Modal */}
                <Modal
                    visible={isEditing}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setIsEditing(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>
                                Editar tarea
                            </Text>

                            <TextInput
                                style={styles.modalInput}
                                placeholder="Título"
                                value={editTaskTitle}
                                onChangeText={setEditTaskTitle}
                            />

                            <TextInput
                                style={[
                                    styles.modalInput,
                                    styles.descriptionInput,
                                ]}
                                placeholder="Descripción"
                                value={editTaskDescription}
                                onChangeText={setEditTaskDescription}
                                multiline
                            />

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => setIsEditing(false)}
                                >
                                    <Text style={styles.cancelButtonText}>
                                        Cancelar
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.createButton}
                                    onPress={handleUpdateTask}
                                >
                                    <Text style={styles.createButtonText}>
                                        Guardar
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>


                {isLoading ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color="#3B82F6" />
                        <Text style={styles.loaderText}>Cargando tareas...</Text>
                    </View>
                ) : (
                    <>
                        {/* Tablero tipo tabla */}
                        <View style={[styles.tableContainer, styles.mainTable]}>
                            <View style={styles.tableColumn}>
                                <View style={styles.tableHeader}>
                                    <Text style={styles.tableHeaderText}>Por hacer</Text>
                                </View>
                                <View style={styles.tableContent}>
                                    {renderTasks("por-hacer")}
                                </View>
                            </View>

                            <View style={[styles.tableColumn, styles.lastColumn]}>
                                <View style={styles.tableHeader}>
                                    <Text style={styles.tableHeaderText}>Pendiente</Text>
                                </View>
                                <View style={styles.tableContent}>
                                    {renderTasks("pendiente")}
                                </View>
                            </View>
                        </View>

                        {/* Tareas Completadas Abajo */}
                        <View style={styles.completedContainer}>
                            <View style={styles.tableHeader}>
                                <Text style={styles.tableHeaderText}>Completadas</Text>
                            </View>
                            <View style={[styles.tableContent, styles.completedContent]}>
                                {renderTasks("completada")}
                            </View>
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#F3F4F6",
    },

    container: {
        padding: 6,
        paddingBottom: 40,
        flexGrow: 1,
    },

    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        marginTop: 8,
        paddingHorizontal: 8,
    },

    headerTitleContainer: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },

    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#E5E7EB",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },

    backButtonText: {
        fontSize: 20,
        color: "#374151",
        fontWeight: "bold",
        marginTop: -2,
    },

    headerSubtitle: {
        fontSize: 13,
        color: "#6B7280",
        marginBottom: 2,
    },

    headerTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#111827",
        flexShrink: 1,
    },

    headerProgressContainer: {
        marginTop: 6,
        flexDirection: 'row',
        alignItems: 'center',
    },

    headerProgressBarBg: {
        flex: 1,
        height: 6,
        backgroundColor: '#E5E7EB',
        borderRadius: 3,
        overflow: 'hidden',
        marginRight: 8,
    },

    headerProgressBarFill: {
        height: '100%',
        backgroundColor: '#10B981',
        borderRadius: 3,
    },

    headerProgressText: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '600',
    },

    headerAddButton: {
        backgroundColor: "#3B82F6",
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
    },

    headerAddButtonText: {
        color: "#FFFFFF",
        fontSize: 20,
        fontWeight: "bold",
        marginTop: -2,
    },

    tableContainer: {
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        flex: 1,
    },

    mainTable: {
        marginBottom: 16,
    },

    completedContainer: {
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        overflow: "hidden",
    },

    completedContent: {
        minHeight: 120,
    },

    tableColumn: {
        flex: 1,
        borderRightWidth: 1,
        borderRightColor: "#E5E7EB",
    },

    lastColumn: {
        borderRightWidth: 0,
    },

    tableHeader: {
        backgroundColor: "#F9FAFB",
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
        alignItems: "center",
        justifyContent: "center",
    },

    tableHeaderText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#374151",
        textAlign: "center",
    },

    tableContent: {

        flex: 1,
        minHeight: 300,
    },

    taskItem: {
        backgroundColor: "#FFFFFF",
        padding: 10,
        borderRadius: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        shadowColor: "#000",

    },

    taskContentContainer: {
        marginBottom: 6,
    },

    taskActions: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
        paddingTop: 6,
        marginTop: 2,
    },

    statusButton: {
        backgroundColor: "#EFF6FF",
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
    },

    statusButtonPending: {
        backgroundColor: "#FFFBEB",
    },

    statusButtonCompleted: {
        backgroundColor: "#ECFDF5",
    },

    statusButtonText: {
        fontSize: 10,
        fontWeight: "700",
        color: "#1E293B",
    },

    deleteButton: {
        padding: 4,
    },

    deleteButtonText: {
        fontSize: 12,
    },

    taskTitle: {
        fontSize: 12,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 2,
    },

    taskDescription: {
        fontSize: 11,
        color: "#6B7280",
        lineHeight: 14,
    },

    emptyText: {
        color: "#9CA3AF",
        fontSize: 12,
        fontStyle: "italic",
        textAlign: "center",
        marginTop: 20,
    },

    /* MENU & VIEW STYLES */
    menuContent: {
        width: "80%",
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },

    menuTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#111827",
        marginBottom: 16,
        textAlign: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
        paddingBottom: 12,
    },

    menuOption: {
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },

    menuOptionDestructive: {
        borderBottomWidth: 0,
    },

    menuOptionText: {
        fontSize: 16,
        color: "#374151",
        textAlign: "center",
        fontWeight: "500",
    },

    menuOptionTextDestructive: {
        fontSize: 16,
        color: "#EF4444",
        textAlign: "center",
        fontWeight: "600",
    },

    viewHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },

    closeButtonText: {
        fontSize: 20,
        color: "#6B7280",
        fontWeight: "bold",
    },

    viewScroll: {
        maxHeight: 400,
        marginBottom: 16,
    },

    viewLabel: {
        fontSize: 13,
        color: "#6B7280",
        marginBottom: 4,
        fontWeight: "600",
    },

    viewValue: {
        fontSize: 16,
        color: "#111827",
        marginBottom: 16,
        lineHeight: 24,
    },

    /* MODAL */

    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },

    modalContent: {
        width: "100%",
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 20,
    },

    modalTitle: {
        fontSize: 22,
        fontWeight: "bold",
        marginBottom: 20,
        color: "#111827",
    },

    modalInput: {
        backgroundColor: "#F3F4F6",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 14,
        fontSize: 16,
    },

    descriptionInput: {
        minHeight: 100,
        textAlignVertical: "top",
    },

    modalButtons: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 12,
        marginTop: 10,
    },

    cancelButton: {
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: "#E5E7EB",
    },

    cancelButtonText: {
        color: "#374151",
        fontWeight: "600",
    },

    createButton: {
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: "#3B82F6",
    },

    createButtonText: {
        color: "#FFFFFF",
        fontWeight: "600",
    },

    loaderContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 80,
    },

    loaderText: {
        marginTop: 12,
        fontSize: 16,
        color: "#6B7280",
    },
});