"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GitBranch,
  Clock,
  Search,
  Filter,
  ExternalLink,
  Import,
  Code,
  Lock,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Repository, GitHubRepo } from "@/types/types";
import Link from "next/link";

function NewProject() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [sortBy] = useState("updated");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    fetchRepositories();
  }, [user, loading]);

  useEffect(() => {
    filterAndSortRepositories();
  }, [repositories, searchQuery, languageFilter, sortBy]);

  const fetchRepositories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Error fetching session:", sessionError);
        setError("Failed to authenticate. Please try logging in again.");
        return;
      }

      if (!session) {
        console.error("No session found");
        router.push("/login");
        return;
      }

      const githubToken = session?.provider_token || process.env.NEXT_PUBLIC_GITHUB_TOKEN!;

      if (!githubToken) {
        setError(
          "GitHub token not found. Please reconnect your GitHub account."
        );
        return;
      }

      const res = await fetch(
        "https://api.github.com/user/repos?per_page=100&sort=updated",
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      if (!res.ok) {
        if (res.status === 401) {
          setError(
            "GitHub authentication expired. Please reconnect your account."
          );
          return;
        }
        throw new Error(`GitHub API error! status: ${res.status}`);
      }

      const data: GitHubRepo[] = await res.json();

      const mappedRepos: Repository[] = data.map((repo: GitHubRepo) => ({
        id: repo.id.toString(),
        name: repo.name,
        html_url: repo.html_url,
        language: repo.language || "",
        created_at: repo.created_at,
        branch: repo.default_branch,
        private: repo.private,
        pushed_at: repo.pushed_at,
        full_name: repo.full_name,
        description: repo.description,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        topics: repo.topics || [],
      }));

      setRepositories(mappedRepos);
    } catch (error) {
      console.error("Failed to fetch repositories:", error);
      setError("Failed to fetch repositories. Please try again.");
      setRepositories([]);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const filterAndSortRepositories = useCallback(() => {
    const filtered = repositories.filter((repo) => {
      const matchesSearch =
        repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.full_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLanguage =
        languageFilter === "all" || repo.language === languageFilter;
      return matchesSearch && matchesLanguage;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "updated":
        case "pushed":
          return (
            new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime()
          );
        case "stars":
          return (b.stargazers_count || 0) - (a.stargazers_count || 0);
        case "name":
          return a.name.localeCompare(b.name);
        case "created":
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        default:
          return (
            new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime()
          );
      }
    });

    setFilteredRepos(filtered);
  }, [repositories, searchQuery, languageFilter, sortBy]);

  const getUniqueLanguages = () => {
    const languages = repositories
      .map((repo) => repo.language)
      .filter((lang): lang is string => Boolean(lang) && lang.trim() !== "")
      .filter((lang, index, arr) => arr.indexOf(lang) === index)
      .sort();
    return languages;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 24 * 7) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else if (diffInHours < 24 * 30) {
      return `${Math.floor(diffInHours / (24 * 7))}w ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  };

  const handleImport = (repoId: string) => {
    router.push(`/dashboard/new/${repoId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
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
      <div className="container max-w-8xl mx-auto px-12 py-8">
        <div className="space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Import Git Repository
            </h1>
            <p className="text-muted-foreground">
              Select a repository from your GitHub account to deploy
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              <p>{error}</p>
              <Button
                onClick={fetchRepositories}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Filters and Search */}
          <div className="flex justify-between sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Select value={languageFilter} onValueChange={setLanguageFilter}>
                <SelectTrigger className="w-[160px] cursor-pointer">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem className="cursor-pointer" value="all">
                    All
                  </SelectItem>
                  {getUniqueLanguages().map((lang) => (
                    <SelectItem
                      key={lang}
                      value={lang}
                      className="cursor-pointer"
                    >
                      {lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Repository Grid */}
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="border-border">
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-12" />
                      </div>
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                <GitBranch className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No repositories found
              </h3>
              <p className="text-muted-foreground">
                {searchQuery || languageFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Connect your GitHub account to see your repositories"}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredRepos.map((repo) => (
                <Card
                  key={repo.id}
                  className="border-border hover:shadow-md transition-all duration-200 hover:border-gray-300"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1 min-w-0">
                        <CardTitle className="text-lg font-semibold text-foreground flex justify-between items-center gap-2">
                          <span className="truncate text-xl">{repo.name}</span>
                          {repo.private ? (
                            <Badge>
                              <Lock className="h-4 w-4 flex-shrink-0" />
                              <p className="ml-1">Private</p>
                            </Badge>
                          ) : (
                            <></>
                          )}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Repository Stats */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {repo.language && (
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-xs">
                            <Code className="h-3 w-3" />
                            <span>{repo.language}</span>
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Topics */}
                    {repo.topics && repo.topics.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {repo.topics.slice(0, 3).map((topic) => (
                          <Badge
                            key={topic}
                            variant="secondary"
                            className="text-xs"
                          >
                            {topic}
                          </Badge>
                        ))}
                        {repo.topics.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{repo.topics.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Last Activity */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Updated {formatDate(repo.pushed_at)}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-between gap-2 pt-2">
                      <Link href={`${repo.html_url}`}>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4" />
                          View On GitHub
                        </Button>
                      </Link>
                      <Link href={`${repo.full_name}`}>
                        <Button
                          onClick={() => handleImport(repo.id)}
                          className="flex-1 bg-black hover:bg-gray-800 text-white"
                          size="sm"
                        >
                          <Import className="h-4 w-4 mr-2" />
                          Import
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Results Count */}
          {!isLoading && filteredRepos.length > 0 && (
            <div className="text-center text-sm text-muted-foreground">
              Showing {filteredRepos.length} of {repositories.length}{" "}
              repositories
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NewProject;
