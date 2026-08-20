// Minimal JSON-file persistence backed by the GitHub Contents API.
//
// Vercel's serverless functions have no persistent disk, so a plain local
// file would vanish between deploys/invocations. Committing the data file
// straight to this GitHub repo gives every visitor the same shared,
// genuinely permanent store without standing up a database.
//
// Requires a GITHUB_TOKEN env var (a PAT with "Contents: read & write" on
// this repo) to be set wherever the app is deployed.

const OWNER = "xSunnyyy";
const REPO = "VetoCity";
const BRANCH = process.env.REPORTS_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || "main";
const API = "https://api.github.com";

function token() {
  const t = process.env.GITHUB_TOKEN;
  if (!t) throw new Error("GITHUB_TOKEN is not configured on the server.");
  return t;
}

async function ghFetch(path: string, init?: RequestInit) {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
}

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<{ data: T; sha: string | null }> {
  const res = await ghFetch(`/repos/${OWNER}/${REPO}/contents/${filePath}?ref=${BRANCH}`);

  if (res.status === 404) return { data: fallback, sha: null };
  if (!res.ok) throw new Error(`GitHub read failed (${res.status})`);

  const json = await res.json();
  const raw = Buffer.from(json.content, "base64").toString("utf-8");

  try {
    return { data: JSON.parse(raw) as T, sha: json.sha as string };
  } catch {
    return { data: fallback, sha: json.sha as string };
  }
}

export async function writeJsonFile(
  filePath: string,
  data: unknown,
  sha: string | null,
  message: string
): Promise<string> {
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString("base64");

  const res = await ghFetch(`/repos/${OWNER}/${REPO}/contents/${filePath}`, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content,
      branch: BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GitHub write failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const json = await res.json();
  return json.content.sha as string;
}
