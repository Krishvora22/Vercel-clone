export interface Project {
  id: string;
  user_id: string;
  repo_url: string;
  project_name: string;
  framework: "React" | "Node";
  env_variables: Record<string, string>;
  status: "queued" | "building" | "deployed" | "error";
  deployed_url: string;
  port?: number;
  created_at?: string;
}
