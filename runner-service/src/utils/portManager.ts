import supabase from "./supabase";

let basePort = 8000;
const usedPorts = new Set<number>();
let portsLoaded = false;

export async function loadPorts(): Promise<void> {
  if (portsLoaded) return;

  const { data, error } = await supabase
    .from("projects")
    .select("port")
    .eq("framework", "Node")
    .not("port", "is", null);

  if (error) {
    console.error("Failed to load ports from DB:", error.message);
    return;
  }

  data?.forEach((row) => {
    if (row.port) usedPorts.add(row.port);
  });

  portsLoaded = true;
}

export async function getAvailablePort(): Promise<number> {
  await loadPorts();
  while (usedPorts.has(basePort)) basePort++;
  usedPorts.add(basePort);
  return basePort;
}

export function releasePort(port: number): void {
  usedPorts.delete(port);
}
