import { supabase } from "../../utils/supabase";

export type User = {
  id: string;
  email: string;
};

export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user: authUser }, error } = await supabase.auth.getUser();
  if (error || !authUser) return null;
  
  return {
    id: authUser.id,
    email: authUser.email || "",
  };
};

export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
