import axios from "axios";
import env from "../config/env.js";
import { generateInsights } from "./aiService.js";

const githubApi = axios.create({
  baseURL: "https://api.github.com",
  headers: {
    Accept: "application/vnd.github+json",
    ...(env.githubToken ? { Authorization: `Bearer ${env.githubToken}` } : {}),
  },
});

const pickRepoFields = (repo) => ({
  name: repo.name,
  language: repo.language,
  stargazers_count: repo.stargazers_count,
  forks_count: repo.forks_count,
  created_at: repo.created_at,
  updated_at: repo.updated_at,
});

const roundTo = (value, decimals = 2) =>
  Number.isFinite(value) ? Number(value.toFixed(decimals)) : 0;

const clampScore = (value) => Math.min(100, Math.max(0, value));

const normalizeStars = (avgStars) => {
  if (!Number.isFinite(avgStars) || avgStars <= 0) return 0;

  const scaled = Math.log10(avgStars + 1) / Math.log10(1000);
  return clampScore(scaled * 100);
};

const calculateLanguageDistribution = (repos) => {
  const languageCounts = repos.reduce((acc, repo) => {
    const language = repo.language || "Unknown";
    acc[language] = (acc[language] || 0) + 1;
    return acc;
  }, {});

  const total = repos.length;
  const distribution = {};

  for (const [language, count] of Object.entries(languageCounts)) {
    distribution[language] = roundTo((count / total) * 100);
  }

  return distribution;
};

const calculateActivityScore = (repos) => {
  if (!repos.length) return 0;

  const now = Date.now();
  const maxWindowDays = 180;

  const score =
    repos.reduce((total, repo) => {
      const updatedAt = new Date(repo.updated_at).getTime();
      const ageInDays = (now - updatedAt) / (1000 * 60 * 60 * 24);
      const freshness = Math.max(0, 1 - ageInDays / maxWindowDays);
      return total + freshness;
    }, 0) / repos.length;

  return roundTo(clampScore(score * 100));
};

const calculateConsistencyScore = (repos) => {
  if (!repos.length) return 0;

  const now = Date.now();
  const daysSinceUpdates = repos.map((repo) => {
    const updatedAt = new Date(repo.updated_at).getTime();
    return (now - updatedAt) / (1000 * 60 * 60 * 24);
  });

  const mean =
    daysSinceUpdates.reduce((total, value) => total + value, 0) /
    daysSinceUpdates.length;

  if (mean <= 0) return 100;

  const variance =
    daysSinceUpdates.reduce((total, value) => total + (value - mean) ** 2, 0) /
    daysSinceUpdates.length;

  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = stdDev / mean;
  const score = Math.max(0, 1 - coefficientOfVariation);

  return roundTo(clampScore(score * 100));
};

const calculateLanguageDiversityScore = (repos) => {
  if (!repos.length) return 0;

  const languageCounts = repos.reduce((acc, repo) => {
    const language = repo.language || "Unknown";
    acc[language] = (acc[language] || 0) + 1;
    return acc;
  }, {});

  const total = repos.length;
  const probabilities = Object.values(languageCounts).map((count) => count / total);
  const entropy = -probabilities.reduce((sum, p) => sum + p * Math.log2(p), 0);
  const maxEntropy = Math.log2(Object.keys(languageCounts).length || 1);

  if (maxEntropy === 0) return 0;

  return roundTo(clampScore((entropy / maxEntropy) * 100));
};

const buildRepoAnalytics = (repos) => {
  if (!repos.length) {
    return {
      totalRepos: 0,
      mostUsedLanguage: null,
      languageDistribution: {},
      avgStars: 0,
      mostPopularRepo: null,
      newestRepo: null,
      oldestRepo: null,
      activityScore: 0,
      consistencyScore: 0,
      languageDiversityScore: 0,
      devScore: 0,
    };
  }

  const languageCounts = repos.reduce((acc, repo) => {
    const language = repo.language || "Unknown";
    acc[language] = (acc[language] || 0) + 1;
    return acc;
  }, {});

  const mostUsedLanguage = Object.entries(languageCounts).sort((a, b) => b[1] - a[1])[0][0];
  const languageDistribution = calculateLanguageDistribution(repos);
  const avgStars = roundTo(
    repos.reduce((total, repo) => total + repo.stargazers_count, 0) / repos.length,
  );
  const normalizedStars = normalizeStars(avgStars);

  const mostPopularRepo = repos.reduce((topRepo, currentRepo) =>
    currentRepo.stargazers_count > topRepo.stargazers_count ? currentRepo : topRepo,
  );

  const newestRepo = repos.reduce((newest, currentRepo) =>
    new Date(currentRepo.created_at) > new Date(newest.created_at) ? currentRepo : newest,
  );

  const oldestRepo = repos.reduce((oldest, currentRepo) =>
    new Date(currentRepo.created_at) < new Date(oldest.created_at) ? currentRepo : oldest,
  );

  const activityScore = clampScore(calculateActivityScore(repos));
  const consistencyScore = clampScore(calculateConsistencyScore(repos));
  const languageDiversityScore = clampScore(calculateLanguageDiversityScore(repos));

  const flooredActivityScore = Math.max(activityScore, 20);
  const flooredConsistencyScore = Math.max(consistencyScore, 20);
  const baseScore = 20;

  const devScore = roundTo(
    clampScore(
      baseScore +
        0.25 * flooredActivityScore +
        0.2 * flooredConsistencyScore +
        0.3 * normalizedStars +
        0.25 * languageDiversityScore,
    ),
  );

  return {
    totalRepos: repos.length,
    mostUsedLanguage,
    languageDistribution,
    avgStars,
    mostPopularRepo: mostPopularRepo.name,
    newestRepo: newestRepo.name,
    oldestRepo: oldestRepo.name,
    activityScore,
    consistencyScore,
    languageDiversityScore,
    devScore,
  };
};

const mapGithubError = (error, username) => {
  const status = error.response?.status;
  const message = error.response?.data?.message;

  if (status === 404) {
    const notFoundError = new Error(`GitHub user '${username}' not found`);
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  if (status === 401) {
    const authError = new Error(
      "GitHub API authentication failed. Your GITHUB_TOKEN is invalid or missing. Please set a valid token in your .env file.",
    );
    authError.statusCode = 401;
    throw authError;
  }

  if (status === 403 && message?.toLowerCase().includes("rate limit")) {
    const rateLimitError = new Error(
      "GitHub API rate limit exceeded. Try again later or configure GITHUB_TOKEN.",
    );
    rateLimitError.statusCode = 429;
    throw rateLimitError;
  }

  if (status === 403) {
    const forbiddenError = new Error(
      "GitHub API access forbidden. Check your GITHUB_TOKEN permissions.",
    );
    forbiddenError.statusCode = 403;
    throw forbiddenError;
  }

  const genericError = new Error(`Failed to fetch data from GitHub API (status: ${status ?? "unknown"})`);
  genericError.statusCode = status || 500;
  throw genericError;
};

const computeWeeklyActivity = (repos) => {
  const weeks = new Array(8).fill(0);
  if (!repos || repos.length === 0) return weeks;

  const now = new Date();

  repos.forEach((repo) => {
    if (!repo.updated_at) return;

    const updated = new Date(repo.updated_at);
    const diffDays = Math.floor((now - updated) / (1000 * 60 * 60 * 24));

    const weekIndex = Math.floor(diffDays / 7);

    if (weekIndex >= 0 && weekIndex < 8) {
      weeks[7 - weekIndex] += 1;
    }
  });

  return weeks;
};

export const fetchGitHubUserData = async (username) => {
  try {
    const [profileResponse, reposResponse] = await Promise.all([
      githubApi.get(`/users/${username}`),
      githubApi.get(`/users/${username}/repos`, {
        params: {
          sort: "updated",
          per_page: 100,
        },
      }),
    ]);

    const profile = profileResponse.data;
    const repos = reposResponse.data.map(pickRepoFields);
    
    const weeklyActivity = computeWeeklyActivity(repos);
    const analytics = buildRepoAnalytics(repos);
    const aiInsights = await generateInsights(analytics);
    analytics.aiInsights = aiInsights;

    console.log("analytics:", analytics);
    console.log("aiInsights:", aiInsights);

    return {
      username: profile.login,
      avatar_url: profile.avatar_url,
      followers: profile.followers,
      following: profile.following,
      public_repos: profile.public_repos,
      repos,
      analytics,
      weeklyActivity,
    };
  } catch (error) {
    mapGithubError(error, username);
  }
};
