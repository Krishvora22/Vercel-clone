import dotenv from "dotenv";
dotenv.config();

import express from "express";
import httpProxy from "http-proxy";
import { createClient } from "@supabase/supabase-js";

const app = express();

const S3_BASE = process.env.BUCKET_NAME!;
const PORT = process.env.PORT || 5000;
const HOST_URL = process.env.HOST_URL || "172.18.0.1";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const proxy = httpProxy.createProxyServer({});

proxy.on("error", (err, req, res: any) => {
  console.error("[Proxy] Error:", err.message);
  res.status(502).send("Bad Gateway — backend container may be down");
});

app.use(async (req: express.Request, res: express.Response) => {
  const hostname = req.headers.host?.split(":")[0] || "";
  const projectSlug = hostname.split(".")[0];

  if (!projectSlug) {
    res.status(400).send("Bad Request: missing subdomain");
    return;
  }

  try {
    const { data: project, error } = await supabase
      .from("projects")
      .select("id, framework, port, status")
      .eq("deployed_url", `https://${hostname}`)
      .eq("status", "deployed")
      .single();

    if (error || !project) {
      console.error(`[Proxy] Not found: ${projectSlug}`);
      res.status(404).send(`
        <h2>404 — Project not found</h2>
        <p>No deployed project for <strong>${projectSlug}</strong></p>
      `);
      return;
    }

    if (project.framework === "React") {
      const reqPath = req.path === "/" ? "/index.html" : req.path;
      const redirectUrl = `${S3_BASE}/${project.id}${reqPath}`;
      console.log(`[React] ${hostname} → ${redirectUrl}`);
      res.redirect(302, redirectUrl);
    } else {
      if (!project.port) {
        res.status(502).send("No port assigned for this backend project");
        return;
      }

      const target = `http://${HOST_URL}:${project.port}`;
      console.log(`[Node] ${hostname}${req.path} → ${target}`);

      proxy.web(req, res, {
        target,
        changeOrigin: true,
      });
    }
  } catch (err) {
    console.error("[Proxy] Unexpected error:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/", (req, res) => {
  res.send("Proxy service is running");
});

app.listen(PORT, () => {
  console.log(`Proxy service running on port ${PORT}`);
});
