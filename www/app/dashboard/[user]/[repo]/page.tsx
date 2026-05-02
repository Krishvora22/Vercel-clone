"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GitBranch,
  Star,
  GitFork,
  Code,
  Plus,
  Trash2,
  ExternalLink,
  Settings,
  Eye,
  EyeOff,
} from "lucide-react";
import { type GitHubRepo } from "@/types/types";
import { supabase } from "@/lib/supabase/client";

interface EnvVariable {
  id: string;
  key: string;
  value: string;
  isVisible: boolean;
}

function DeployPage() {
  const params = useParams();
  const { user } = useAuth();
  const { user: username, repo } = params as { user: string; repo: string };
  const router = useRouter();
  const [repoData, setRepoData] = useState<GitHubRepo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [projectType, setProjectType] = useState<"Node" | "React" | "">("");
  const [envVariables, setEnvVariables] = useState<EnvVariable[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);

  useEffect(() => {
    fetchRepositoryData();
  }, [username, repo]);

  const fetchRepositoryData = async () => {
    try {
      setIsLoading(true);
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Error fetching session:", sessionError);
        return;
      }

      if (!session) {
        console.error("No session found");
        router.push("/login");
        return;
      }

      const githubToken = session?.provider_token || process.env.NEXT_PUBLIC_GITHUB_TOKEN!;

      const headers: Record<string, string> = {
        Accept: "application/vnd.github.v3+json",
      };

      // Only add Authorization header if token exists
      if (githubToken) {
        headers.Authorization = `Bearer ${githubToken}`;
      }

      const res = await fetch(
        `https://api.github.com/repos/${username}/${repo}`,
        {
          headers,
        }
      );

      if (!res.ok) {
        // If unauthorized and it's a public repo, try without auth
        if (res.status === 401) {
          const publicRes = await fetch(
            `https://api.github.com/repos/${username}/${repo}`,
            {
              headers: {
                Accept: "application/vnd.github.v3+json",
              },
            }
          );

          if (publicRes.ok) {
            const data = await publicRes.json();
            setRepoData(data);

            // Auto-detect project type based on language
            if (
              data.language === "JavaScript" ||
              data.language === "TypeScript"
            ) {
              setProjectType("React");
            } else if (data.language === "Python" || data.language === "Go") {
              setProjectType("Node");
            }
            return;
          }
        }
        throw new Error(`GitHub API error! status: ${res.status}`);
      }

      const data = await res.json();
      setRepoData(data);

      // Auto-detect project type based on language
      if (data.language === "JavaScript" || data.language === "TypeScript") {
        setProjectType("React");
      } else if (data.language === "Python" || data.language === "Go") {
        setProjectType("Node");
      }
    } catch (error) {
      console.error("Failed to fetch repository data:", error);
      // Set some fallback data so the page doesn't break
      setRepoData({
        id: 0,
        name: repo,
        full_name: `${user}/${repo}`,
        description: "Repository data could not be loaded",
        html_url: `https://github.com/${username}/${repo}`,
        clone_url: `https://github.com/${username}/${repo}.git`,
        language: null,
        stargazers_count: 0,
        forks_count: 0,
        updated_at: new Date().toISOString(),
        pushed_at: new Date().toISOString(),
        private: false,
        default_branch: "main",
        topics: [],
        created_at: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addEnvVariable = () => {
    const newEnvVar: EnvVariable = {
      id: Date.now().toString(),
      key: "",
      value: "",
      isVisible: false,
    };
    setEnvVariables([...envVariables, newEnvVar]);
  };

  const removeEnvVariable = (id: string) => {
    setEnvVariables(envVariables.filter((env) => env.id !== id));
  };

  const updateEnvVariable = (
    id: string,
    field: "key" | "value",
    newValue: string
  ) => {
    setEnvVariables(
      envVariables.map((env) =>
        env.id === id ? { ...env, [field]: newValue } : env
      )
    );
  };

  const toggleEnvVisibility = (id: string) => {
    setEnvVariables(
      envVariables.map((env) =>
        env.id === id ? { ...env, isVisible: !env.isVisible } : env
      )
    );
  };

  const handleDeploy = async () => {
    if (!projectType) {
      alert("Please select a project type");
      return;
    }

    setIsDeploying(true);

    try {
      // Prepare environment variables object
      const envObject = envVariables.reduce((acc, env) => {
        if (env.key && env.value) {
          acc[env.key] = env.value;
        }
        return acc;
      }, {} as Record<string, string>);

      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4500";

      // Make API call to deploy
      const deployResponse = await fetch(
        `${serverUrl}/api/project`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            repo_url: repoData?.clone_url,
            framework: projectType,
            env_variables: envObject,
            user_id: user.id,
          }),
        }
      );

      if (deployResponse.ok) {
        const result = await deployResponse.json();
        router.push(`/deploy/${result?.project.id}`);
      } else {
        throw new Error(`Deployment failed: ${deployResponse.statusText}`);
      }
    } catch (error) {
      console.error("Deployment error:", error);
    } finally {
      setIsDeploying(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-8 w-64" />
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-32 w-full" />
                  </CardContent>
                </Card>
              </div>
              <div>
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!repoData) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Repository Not Found
            </h1>
            <p className="text-muted-foreground">
              The repository {username}/{repo} could not be found.
            </p>
            <Button
              onClick={() => router.push("/dashboard/new")}
              className="mt-4"
            >
              Back to Import
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header Section */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  Deploy {repoData.name}
                </h1>
              </div>

              <Button
                onClick={() => window.open(repoData.html_url, "_blank")}
                variant="outline"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                View Repository
              </Button>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left Column - Configuration */}
            <div className="lg:col-span-2 space-y-6">
              {/* Repository Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GitBranch className="h-5 w-5" />
                    Repository Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">
                          {repoData.full_name}
                        </h3>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {repoData.description || ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex gap-x-4">
                      {repoData.language && (
                        <div className="flex items-center gap-1">
                          <Code className="h-4 w-4" />
                          <span>{repoData.language}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4" />
                        <span>{repoData.stargazers_count}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <GitFork className="h-4 w-4" />
                        <span>{repoData.forks_count}</span>
                      </div>
                    </div>
                    <div className="">
                      <span>Updated {formatDate(repoData.updated_at)}</span>
                    </div>
                  </div>

                  {repoData.topics && repoData.topics.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {repoData.topics.map((topic) => (
                        <Badge
                          key={topic}
                          variant="secondary"
                          className="text-xs"
                        >
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Project Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Project Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="project-type">Framework Preset</Label>
                    <Select
                      value={projectType}
                      onValueChange={(value: "Node" | "React") =>
                        setProjectType(value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select project type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="React">React</SelectItem>
                        <SelectItem value="Node">Node.js</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      {projectType === "React"
                        ? "Static site generation with build command: npm run build"
                        : projectType === "Node"
                        ? "Server-side application with start command: npm start"
                        : "Select a framework to see build configuration"}
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Build Settings</Label>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          Build Command:
                        </span>
                        <p className="font-mono bg-muted px-2 py-1 rounded mt-1">
                          {projectType === "React"
                            ? "npm run build"
                            : projectType === "Node"
                            ? "npm install"
                            : "Auto-detected"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Output Directory:
                        </span>
                        <p className="font-mono bg-muted px-2 py-1 rounded mt-1">
                          {projectType === "React"
                            ? "dist"
                            : projectType === "Node"
                            ? "./"
                            : "Auto-detected"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Environment Variables */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Environment Variables</CardTitle>
                      <CardDescription>
                        Add environment variables for your deployment
                      </CardDescription>
                    </div>
                    <Button
                      onClick={addEnvVariable}
                      variant="outline"
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Variable
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {envVariables.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No environment variables configured</p>
                      <p className="text-sm">
                        Click &quot;Add Variable&quot; to get started
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {envVariables.map((envVar) => (
                        <div
                          key={envVar.id}
                          className="flex gap-2 items-center"
                        >
                          <div className="flex-1">
                            <Input
                              placeholder="KEY"
                              value={envVar.key}
                              onChange={(e) =>
                                updateEnvVariable(
                                  envVar.id,
                                  "key",
                                  e.target.value
                                )
                              }
                              className="font-mono"
                            />
                          </div>
                          <div className="flex-1 relative">
                            <Input
                              type={envVar.isVisible ? "text" : "password"}
                              placeholder="value"
                              value={envVar.value}
                              onChange={(e) =>
                                updateEnvVariable(
                                  envVar.id,
                                  "value",
                                  e.target.value
                                )
                              }
                              className="font-mono pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                              onClick={() => toggleEnvVisibility(envVar.id)}
                            >
                              {envVar.isVisible ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <Button
                            onClick={() => removeEnvVariable(envVar.id)}
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Deploy Summary */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Deploy Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Repository:</span>
                      <span className="font-medium">{repoData.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Branch:</span>
                      <span className="font-medium">
                        {repoData.default_branch}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Framework:</span>
                      <span className="font-medium">
                        {projectType || "Not selected"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Environment Variables:
                      </span>
                      <span className="font-medium">
                        {
                          envVariables.filter((env) => env.key && env.value)
                            .length
                        }
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <Button
                    onClick={handleDeploy}
                    disabled={!projectType || isDeploying}
                    className="w-full bg-black hover:bg-gray-800 text-white"
                    size="lg"
                  >
                    {isDeploying ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        <p className="text-xl">Deploying...</p>
                      </>
                    ) : (
                      <>
                        <p className="text-xl">Deploy</p>
                      </>
                    )}
                  </Button>

                  {!projectType && (
                    <p className="text-sm text-muted-foreground text-center">
                      Please select a framework to deploy
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Additional Info */}
              <Card>
                <CardHeader>
                  <CardTitle>What happens next?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>• Your repository will be cloned</p>
                  <p>• Dependencies will be installed</p>
                  <p>• Build process will run</p>
                  <p>• Application will be deployed</p>
                  <p>• You&apos;ll get a live URL</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeployPage;
