import { createClient } from "@/lib/supabase/server";
import DeploymentClient from "./deployment-client";

export default async function DeploymentPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const supabase = await createClient();

  const { projectId } = await params;

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error || !project) {
    return null;
  }

  console.log("Project:", project);

  return <DeploymentClient initialProject={project} />;
}
