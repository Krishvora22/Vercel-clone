"use client";

import { Button } from "@/components/ui/button";
import { handleLoginWithGithub } from "@/actions/OAuth";
import { GithubIcon } from "lucide-react";

export default function LoginWithGitHub() {
  return (
    <div>
      <Button onClick={handleLoginWithGithub} className="w-full">
        <GithubIcon />
        Login with GitHub</Button>
    </div>
  );
}
