import { exec } from "child_process";
import { updateLogs } from "./logger";
import util from "util";

const execPromise = util.promisify(exec);

export async function runCommandWithLogs(
  command: string,
  args: string[],
  cwd: string,
  projectId: string,
): Promise<void> {
  const fullCommand = `${command} ${args.join(" ")}`;

  try {
    const { stdout, stderr } = await execPromise(fullCommand, {
      cwd,
      maxBuffer: 1024 * 1024 * 10,
    });

    if (stdout) {
      for (const line of stdout.trim().split("\n")) {
        console.log(line);
        await updateLogs(projectId, ` ${line.trim()}`);
      }
    }

    if (stderr) {
      for (const line of stderr.trim().split("\n")) {
        console.error(line);
        await updateLogs(projectId, ` ${line.trim()}`);
      }
    }
  } catch (err: any) {
    const errMsg = err.stderr || err.message || "Unknown error";
    console.error("# Command failed:", errMsg);
    await updateLogs(projectId, `# ${fullCommand} failed:\n${errMsg}`);
    throw new Error(`${fullCommand} failed`);
  }
}
