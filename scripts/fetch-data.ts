
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Types for the script
interface RepoConfig {
  owner: string;
  name: string;
}

interface Config {
  repos: string[]; // "owner/name"
  orgs: string[];  // "orgName"
  users: string[]; // Whitelist of users to monitor
}

interface Contributor {
  id: string;
  username: string;
  avatarUrl: string;
  mergedPRs: number;
  openPRs: number;
  issues: number;
  score: number;
  lastActive: string;
  isIgnored: boolean; // Added to match frontend type
}

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY; // e.g. "owner/repo"
const CONFIG_PATH = path.join(process.cwd(), 'leaderboard.config.json');
const OUTPUT_PATH = path.join(process.cwd(), 'public', 'data.json');

// Scoring weights (could be moved to config)
const SCORING = {
  mergedPrWeight: 10,
  openPrWeight: 5,
  issueWeight: 2
};

async function fetchConfigFromIssue(owner: string, name: string): Promise<Config | null> {
  console.log(`Checking for configuration issue in ${owner}/${name}...`);
  const query = `
    query {
      repository(owner: "${owner}", name: "${name}") {
        issues(first: 1, labels: ["leaderboard-config"], states: OPEN) {
          nodes {
            body
          }
        }
      }
    }
  `;
  
  try {
    const data = await fetchGraphQL(query);
    const issue = data.repository?.issues?.nodes?.[0];
    
    if (!issue || !issue.body) return null;

    // Extract JSON from markdown code block
    const jsonMatch = issue.body.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      return JSON.parse(jsonMatch[1]);
    }
  } catch (e) {
    console.warn("Error fetching config from issue:", e);
  }
  return null;
}

async function loadConfig(): Promise<Config> {
  // 1. Try to fetch from GitHub Issue if running in Action
  if (GITHUB_TOKEN && GITHUB_REPOSITORY) {
    try {
      const [owner, name] = GITHUB_REPOSITORY.split('/');
      const issueConfig = await fetchConfigFromIssue(owner, name);
      if (issueConfig) {
        console.log("Loaded configuration from GitHub Issue.");
        return issueConfig;
      }
    } catch (e) {
      console.warn("Failed to load config from issue, falling back to file.");
    }
  }

  // 2. Fallback to local file
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    console.log("No config found, using defaults.");
    return { repos: [], orgs: [], users: [] };
  }
}

async function fetchGraphQL(query: string) {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`GitHub API Error: ${response.statusText}`);
  }

  const result = await response.json();
  if (result.errors) {
    throw new Error(`GraphQL Error: ${JSON.stringify(result.errors)}`);
  }
  return result.data;
}

async function getOrgRepos(org: string): Promise<RepoConfig[]> {
  console.log(`Fetching repos for org: ${org}...`);
  // Simple query to get first 100 repos of an org
  const query = `
    query {
      organization(login: "${org}") {
        repositories(first: 100, orderBy: {field: UPDATED_AT, direction: DESC}) {
          nodes {
            name
            owner {
              login
            }
            isArchived
          }
        }
      }
    }
  `;
  
  try {
    const data = await fetchGraphQL(query);
    return data.organization.repositories.nodes
      .filter((r: any) => !r.isArchived)
      .map((r: any) => ({ owner: r.owner.login, name: r.name }));
  } catch (e) {
    console.error(`Failed to fetch org ${org}:`, e);
    return [];
  }
}

async function fetchRepoStats(repo: RepoConfig, contributorMap: Map<string, Contributor>) {
  console.log(`Fetching stats for ${repo.owner}/${repo.name}...`);
  const query = `
    query {
      repository(owner: "${repo.owner}", name: "${repo.name}") {
        pullRequests(first: 100, states: [MERGED, OPEN], orderBy: {field: CREATED_AT, direction: DESC}) {
          nodes {
            state
            createdAt
            author {
              login
              avatarUrl
            }
          }
        }
        issues(first: 100, states: [OPEN, CLOSED], orderBy: {field: CREATED_AT, direction: DESC}) {
          nodes {
            createdAt
            author {
              login
              avatarUrl
            }
          }
        }
      }
    }
  `;

  try {
    const data = await fetchGraphQL(query);
    const repoData = data.repository;
    
    if (!repoData) return;

    const processContribution = (node: any, type: 'PR_MERGED' | 'PR_OPEN' | 'ISSUE') => {
      if (!node.author) return;
      const login = node.author.login;
      
      if (!contributorMap.has(login)) {
        contributorMap.set(login, {
          id: login,
          username: login,
          avatarUrl: node.author.avatarUrl,
          mergedPRs: 0,
          openPRs: 0,
          issues: 0,
          score: 0,
          lastActive: node.createdAt, // Initial value
          isIgnored: false
        });
      }

      const c = contributorMap.get(login)!;
      
      // Update last active if newer
      if (new Date(node.createdAt) > new Date(c.lastActive)) {
        c.lastActive = node.createdAt;
      }

      if (type === 'PR_MERGED') c.mergedPRs++;
      if (type === 'PR_OPEN') c.openPRs++;
      if (type === 'ISSUE') c.issues++;
    };

    repoData.pullRequests.nodes.forEach((pr: any) => {
      processContribution(pr, pr.state === 'MERGED' ? 'PR_MERGED' : 'PR_OPEN');
    });

    repoData.issues.nodes.forEach((issue: any) => {
      processContribution(issue, 'ISSUE');
    });

  } catch (e) {
    console.error(`Error processing ${repo.owner}/${repo.name}:`, e);
  }
}

async function main() {
  if (!GITHUB_TOKEN) {
    console.error("Error: GITHUB_TOKEN environment variable is required.");
    process.exit(1);
  }

  const config = await loadConfig();
  const allRepos: RepoConfig[] = [];

  // 1. Parse explicit repos
  for (const repoStr of config.repos) {
    const [owner, name] = repoStr.split('/');
    if (owner && name) allRepos.push({ owner, name });
  }

  // 2. Fetch org repos
  for (const org of config.orgs) {
    const orgRepos = await getOrgRepos(org);
    allRepos.push(...orgRepos);
  }

  // Deduplicate
  const uniqueRepos = Array.from(new Set(allRepos.map(r => `${r.owner}/${r.name}`)))
    .map(str => {
      const [owner, name] = str.split('/');
      return { owner, name };
    });

  console.log(`Tracking ${uniqueRepos.length} repositories.`);

  // 3. Fetch Stats
  const contributorMap = new Map<string, Contributor>();
  
  // Run in parallel chunks to avoid timeouts but respect rate limits slightly
  const CHUNK_SIZE = 5;
  for (let i = 0; i < uniqueRepos.length; i += CHUNK_SIZE) {
    const chunk = uniqueRepos.slice(i, i + CHUNK_SIZE);
    await Promise.all(chunk.map(repo => fetchRepoStats(repo, contributorMap)));
  }

  // 4. Calculate Scores and Filter
  let contributors = Array.from(contributorMap.values()).map(c => ({
    ...c,
    score: (c.mergedPRs * SCORING.mergedPrWeight) + 
           (c.openPRs * SCORING.openPrWeight) + 
           (c.issues * SCORING.issueWeight),
    // Format date nicely
    lastActive: new Date(c.lastActive).toLocaleDateString()
  }));

  // Filter by whitelist if provided
  if (config.users && config.users.length > 0) {
    contributors = contributors.filter(c => config.users.includes(c.username));
  }

  // Sort
  contributors.sort((a, b) => b.score - a.score);

  // 5. Save Output
  const output = {
    timestamp: new Date().toISOString(),
    contributors,
    repos: uniqueRepos.map(r => ({ ...r, isActive: true })), // Compatible with frontend types
    settings: {
      title: "Leaderboard",
      refreshInterval: 24,
      scoring: SCORING,
      enableAI: false // Default for static
    }
  };

  // Ensure public dir exists
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2));
  
  console.log(`Successfully generated leaderboard for ${contributors.length} contributors.`);
}

main().catch(console.error);
