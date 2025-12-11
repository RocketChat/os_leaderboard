import { Contributor, Repository, AppSettings } from './types';

export const INITIAL_REPOS: Repository[] = [
  { id: '1', owner: 'facebook', name: 'react', isActive: true },
  { id: '2', owner: 'vercel', name: 'next.js', isActive: true },
  { id: '3', owner: 'tailwindlabs', name: 'tailwindcss', isActive: true },
];

export const INITIAL_SETTINGS: AppSettings = {
  orgName: 'OpenSourceCorp',
  projectStartDate: '2023-01-01',
  enableAI: true,
  scoring: {
    mergedPrWeight: 10,
    openPrWeight: 2,
    issueWeight: 5,
  },
};

// Generate 50+ contributors for pagination (Fallback Mock Data)
const generateContributors = (count: number): Contributor[] => {
  const users: Contributor[] = [];
  const baseUsers = [
    'sarah_dev', 'alex_codes', 'jordan_builds', 'kim_shipit', 'dave_debug',
    'max_scale', 'nina_ui', 'tom_backend', 'lisa_test', 'chris_ops'
  ];

  for (let i = 0; i < count; i++) {
    const mergedPRs = Math.floor(Math.random() * 50);
    const openPRs = Math.floor(Math.random() * 15);
    const issues = Math.floor(Math.random() * 30);
    const score = mergedPRs * 10 + openPRs * 2 + issues * 5;
    
    users.push({
      id: (i + 1).toString(),
      username: i < baseUsers.length ? baseUsers[i] : `contributor_${i + 1}`,
      avatarUrl: `https://picsum.photos/200/200?random=${i + 1}`,
      mergedPRs,
      openPRs,
      issues,
      score,
      lastActive: `${Math.floor(Math.random() * 24)} hours ago`,
      isIgnored: false,
    });
  }
  return users.sort((a, b) => b.score - a.score);
};

export const MOCK_CONTRIBUTORS: Contributor[] = generateContributors(65);