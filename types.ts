export interface Contributor {
  id: string;
  username: string;
  avatarUrl: string;
  mergedPRs: number;
  openPRs: number;
  issues: number;
  score: number;
  lastActive: string;
  aiTitle?: string;
  aiDescription?: string;
  isIgnored: boolean;
}

export interface Repository {
  id: string;
  owner: string;
  name: string;
  isActive: boolean;
}

export interface AppSettings {
  orgName: string;
  // REMOVED: githubToken is no longer stored in settings to prevent leaks
  projectStartDate: string;
  enableAI: boolean;
  scoring: {
    mergedPrWeight: number;
    openPrWeight: number;
    issueWeight: number;
  };
  lastSnapshotTime?: string; // Track when data was last fetched from GitHub
}

export interface BackupData {
  id: string;
  timestamp: string;
  contributors: Contributor[];
  repos: Repository[];
  settings: AppSettings;
  note?: string; // Auto-Backup vs Manual
}

export enum SortField {
  SCORE = 'score',
  MERGED = 'mergedPRs',
  OPEN = 'openPRs',
  ISSUES = 'issues'
}

export type TimeRange = '7d' | '30d' | 'all';