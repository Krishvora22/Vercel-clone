import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { exec } from "child_process";

if (
  !process.env.S3_BUCKET ||
  !process.env.AWS_REGION ||
  !process.env.DEPLOY_DOMAIN ||
  !process.env.SSL_CERT_PATH ||
  !process.env.SSL_CERT_KEY_PATH
) {
  throw new Error(
    "Missing required env vars: S3_BUCKET, AWS_REGION, DEPLOY_DOMAIN, SSL_CERT_PATH, SSL_CERT_KEY_PATH",
  );
}

const nginxRoutePath = "/etc/nginx/conf.d";

export function slugifyProjectName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function writeNginxRoute(
  projectName: string,
  projectId: string,
  isNode: boolean,
  port?: number,
): void {
  if (!fs.existsSync(nginxRoutePath)) {
    fs.mkdirSync(nginxRoutePath, { recursive: true });
  }

  const slug = slugifyProjectName(projectName);
  const subdomain = `${slug}.${process.env.DEPLOY_DOMAIN}`;
  const filePath = path.join(nginxRoutePath, `${projectId}.conf`);

  const sslBlock = `
    ssl_certificate ${process.env.SSL_CERT_PATH};
    ssl_certificate_key ${process.env.SSL_CERT_KEY_PATH};
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;`.trim();

  const httpRedirectBlock = `
server {
    listen 80;
    server_name ${subdomain};
    return 301 https://$host$request_uri;
}`.trim();

  let httpsBlock: string;

  if (isNode) {
    httpsBlock = `
server {
    listen 443 ssl;
    server_name ${subdomain};

    ${sslBlock}

    location / {
        proxy_pass http://127.0.0.1:${port}/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}`.trim();
  } else {
    httpsBlock = `
server {
    listen 443 ssl;
    server_name ${subdomain};

    ${sslBlock}

    location / {
        return 302 https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${projectId}/index.html;
     }
}`.trim();
  }

  const config = `${httpRedirectBlock}\n\n${httpsBlock}\n`;

  try {
    fs.writeFileSync(filePath, config);
    console.log(`[NGINX] Route written: https://${subdomain}`);
  } catch (err) {
    console.error(`[NGINX] Failed to write route: ${err}`);
  }
}

export function reloadNginx() {
  exec(
    `nsenter -t 1 -m -u -i -n -p -- nginx -s reload`,
    (err, _stdout, stderr) => {
      if (err) {
        console.error("# nginx reload failed:", stderr);
      } else {
        console.log("$ nginx reloaded successfully");
      }
    },
  );
}