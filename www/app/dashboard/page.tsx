"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { useRouter } from "next/navigation";
import type { Project } from "@/types/types";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GitBranch,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
} from "lucide-react";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState("all");
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    const fetchProjects = async () => {
      try {
        setIsLoadingProjects(true);
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SERVER_URL}/api/project?userId=${user.id}`
        );
        const data = await res.json();
        const sortedProjects = (data?.data || []).sort(
          (a: Project, b: Project) => {
            return (
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
            );
          }
        );
        setProjects(sortedProjects);
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setIsLoadingProjects(false);
      }
    };

    fetchProjects();
  }, [router, user, loading]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "deployed":
        return <CheckCircle2 className="h-4 w-4" />;
      case "building":
        return <Clock className="h-4 w-4" />;
      case "error":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (
    status: string
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "deployed":
        return "default";
      case "building":
        return "secondary";
      case "error":
        return "destructive";
      default:
        return "outline";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredProjects = projects.filter((project) => {
    if (filter === "all") return true;
    return project.status === filter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container max-w-7xl mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-10 w-40" />
            </div>
            <Skeleton className="h-10 w-48" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container max-w-8xl mx-auto px-12 py-8">
        <div className="space-y-8">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Welcome, {user.user_metadata.full_name}
              </h1>
            </div>
            <Link href="/dashboard/new">
              <Button className="bg-black hover:bg-gray-800 text-white">
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </Link>
          </div>

          {/* Filter Section */}
          <div className="flex sm:flex-row gap-4 sm:items-center">
            <div className="flex justify-center items-center gap-2 ml-auto">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[180px] cursor-pointer">
                  <SelectValue placeholder="Select status cursor-pointer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem className="cursor-pointer" value="all">All Projects</SelectItem>
                  <SelectItem className="cursor-pointer" value="deployed">Deployed</SelectItem>
                  <SelectItem className="cursor-pointer" value="building">Building</SelectItem>
                  <SelectItem className="cursor-pointer" value="error">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoadingProjects ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="border-border">
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                <GitBranch className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {filter === "all" ? "No projects yet" : `No ${filter} projects`}
              </h3>
              <p className="text-muted-foreground mb-6">
                {filter === "all"
                  ? "Get started by creating your first project"
                  : `No projects with ${filter} status found`}
              </p>
              {filter === "all" && (
                <Link href="/dashboard/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Project
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => (
                <Link
                  href={`/deploy/${project.id}`}
                  key={project.id}
                  className="no-underline"
                >
                  <Card
                    key={project.id}
                    className="border-border hover:shadow-md transition-shadow"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg font-semibold text-foreground">
                            {project.project_name}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-1 text-sm">
                            <GitBranch className="h-3 w-3" />
                            {project.framework}
                          </CardDescription>
                        </div>
                        <Badge
                          variant={getStatusVariant(project.status)}
                          className="flex items-center gap-1"
                        >
                          {getStatusIcon(project.status)}
                          {project.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(project.created_at)}
                        </div>

                        {/* {project.deployed_url && (
                          <div className="flex items-center gap-2">
                            <Globe className="h-3 w-3 text-muted-foreground" />
                            <a
                              href={project.deployed_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                            >
                              View Deployment
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )} */}
                      </div>

                      {/* <div className="pt-2 border-t border-border">
                        <div className="flex items-center justify-between">
                          <a
                            href={project.repo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                          >
                            <GitBranch className="h-3 w-3" />
                            Repository
                            <ExternalLink className="h-3 w-3" />
                          </a>

                          {project.port && (
                            <span className="text-xs bg-muted px-2 py-1 rounded">
                              Port: {project.port}
                            </span>
                          )}
                        </div>
                      </div> */}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
