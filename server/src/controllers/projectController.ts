import { Request, Response } from "express";
import redis from "../utils/redis";
import supabase from "../utils/supabase";
import axios from "axios";

// GET /api/repos
export const getRepos = async (req: Request, res: Response) => {
  const { githubtoken } = req.headers;

  try {
    const response = await fetch(
      "https://api.github.com/user/repos?per_page=100",
      {
        headers: {
          Authorization: `Bearer ${githubtoken}`,
        },
      },
    );
    const repos = await response.json();
    res.status(200).json({ message: "Repos fetched successfully...", repos });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch repos" });
  }
};

// POST /api/project
export const createProject = async (req: Request, res: Response) => {
  const { repo_url, framework, env_variables, user_id } = req.body;

  if (!repo_url || !framework || !user_id) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: repo_url, framework, user_id",
    });
  }

  if (framework !== "React" && framework !== "Node") {
    return res.status(400).json({
      success: false,
      error: "framework must be either 'React' or 'Node'",
    });
  }

  const project_name = repo_url.split("/").pop()?.replace(".git", "");

  try {
    const { data: existingProjects, error: fetchError } = await supabase
      .from("projects")
      .select("*")
      .eq("repo_url", repo_url)
      .eq("user_id", user_id);

    if (fetchError) {
      return res.status(500).json({
        success: false,
        error: fetchError.message,
      });
    }

    const existingProject = existingProjects?.[0];

    if (existingProject) {
      const { data: updatedProject, error: updateError } = await supabase
        .from("projects")
        .update({
          env_variables,
          framework,
          status: "queued",
          logs: "",
          deployed_url: "",
          total_deployments: existingProject.total_deployments + 1,
        })
        .eq("id", existingProject.id)
        .select()
        .single();

      if (updateError) {
        return res.status(500).json({
          success: false,
          error: updateError.message,
        });
      }

      await redis.lpush("build-queue", JSON.stringify(updatedProject));

      return res.json({
        success: true,
        message: "Project re-queued for redeploy",
        project: updatedProject,
      });
    }

    const { data: newProject, error } = await supabase
      .from("projects")
      .insert({
        repo_url,
        project_name,
        framework,
        env_variables,
        user_id,
        status: "queued",
        deployed_url: "",
        total_deployments: 1,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    await redis.lpush("build-queue", JSON.stringify(newProject));

    return res.json({
      success: true,
      message: "New project queued",
      project: newProject,
    });
  } catch (error) {
    console.error("CreateProject error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// DELETE /api/project/:id
export const deleteProject = async (req: Request, res: Response) => {
  const { id } = req.params;

  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  try {
    const queueLength = await redis.llen("build-queue");

    if (queueLength > 0) {
      const allItems = await redis.lrange("build-queue", 0, queueLength - 1);

      const filtered = allItems.filter((item) => {
        try {
          const parsed = JSON.parse(item);
          return parsed.id !== id;
        } catch (err) {
          return true;
        }
      });

      if (filtered.length !== allItems.length) {
        const pipeline = redis.pipeline();
        pipeline.del("build-queue");
        if (filtered.length > 0) {
          pipeline.rpush("build-queue", ...filtered);
        }
        await pipeline.exec();
      }
    }
  } catch (redisError) {
    console.error("Failed to remove job from Redis queue:", redisError);
  }

  res.json({ message: "Project deleted" });
};

// GET /api/project
export const getProjects = async (req: Request, res: Response) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ success: false, error: "Missing user_id" });
  }

  try {
    const { data: userProjectData, error: userProjectError } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId);

    if (userProjectError) {
      return res.status(500).json({ success: false, error: userProjectError });
    }

    return res.status(200).json({ success: true, data: userProjectData });
  } catch (err) {
    console.error("Projects fetch error:", err);
    return res.status(500).json({ success: false, error: err });
  }
};

// POST /api/webhook
export const triggerCreateProject = async (req: Request, res: Response) => {
  try {
    const githubEvent = req.headers["x-github-event"];
    
    if (githubEvent === "ping") {
      return res.status(200).json({ message: "Webhook ping received!" });
    }

    const userName = req.body?.repository?.owner?.login; 
    const repoUrl = req.body?.repository?.clone_url;

    if (!userName || !repoUrl) {
      return res.status(400).json({ error: "Missing repository payload" });
    }

    const { data: userData, error: errorUserData } = await supabase
      .from("users")
      .select("*")
      .eq("name", userName)
      .single();

    if (errorUserData) {
      return res.status(500).json({ error: errorUserData });
    }

    const { data: projectData, error: errorProjectData } = await supabase
      .from("projects")
      .select("user_id, repo_url, framework, env_variables")
      .eq("user_id", userData.id)
      .eq("repo_url", repoUrl)  
      .single();

    if (errorProjectData) {
      return res.status(500).json({ error: errorProjectData });
    }

    const response = await axios.post(
      "https://api-vercel.priyanshuvaliya.dev/api/project",
      {
        repo_url: projectData.repo_url,
        framework: projectData.framework,
        env_variables: projectData.env_variables,
        user_id: projectData.user_id,
      },
    );

    return res.status(200).json({
      success: true,
      message: "Webhook Triggered & Deployment Started",
      projectResponse: response.data,
    });
  } catch (err) {
    console.error("Error in Trigger Webhook :", err);
    return res.status(500).json({ error: String(err) });
  }
};
