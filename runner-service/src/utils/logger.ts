import supabase from "./supabase";

export async function updateLogs(projectId: string, line: string) {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("logs")
      .eq("id", projectId)
      .single();

    if (error) throw error;

    const updatedLogs = (data.logs || "") + "\n" + line;

    const { error: updateError } = await supabase
      .from("projects")
      .update({ logs: updatedLogs })
      .eq("id", projectId);

    if (updateError) throw updateError;
  } catch (err) {
    console.error("# Failed to update logs in Supabase:", err);
  }
}
