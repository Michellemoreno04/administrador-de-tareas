import { supabase } from "../../utils/supabase";

export type Project = {
  id: string;
  title: string;
  description: string;
  tasks?: { id: string; status: string }[];
};

export const getProjects = async (): Promise<Project[]> => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from("projects")
    .select("*, tasks(id, status)")
    .eq("user_id", authData.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }
  return data as Project[];
};

export const createProject = async (title: string, description: string): Promise<Project | null> => {
  if (!title.trim()) return null;

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from("projects")
    .insert([
      {
        title: title.trim(),
        description: description.trim(),
        user_id: authData.user.id,
      },
    ])
    .select();

  if (error) {
    throw error;
  }

  return data && data.length > 0 ? (data[0] as Project) : null;
};
