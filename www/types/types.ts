export interface User {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
  };
}

export interface Project {
  id: string;
  user_id: string;
  project_name: string;
  repo_url: string;
  framework: string;
  deployed_url: string;
  env_variables: object;
  logs: string;
  port: number | null;
  total_deployments: number;
  status: string;
  created_at: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  clone_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  pushed_at: string;
  private: boolean;
  default_branch: string;
  topics: string[];
  created_at: string;
}

export interface Repository {
  id: string;
  name: string;
  html_url: string;
  language: string;
  created_at: string;
  branch: string;
  private: boolean;
  pushed_at: string;
  full_name: string;
  description?: string | null;
  stargazers_count?: number;
  forks_count?: number;
  topics?: string[];
}
