import { useEffect, useState } from "react";
import { Activity, Brain, Briefcase, Box, Star, Code, BarChart3, Search, GitFork } from "lucide-react";

// ─── Pure helper functions (logic unchanged) ────────────────────────────────

const getScoreCategory = (score) => {
  if (score >= 75) return "Elite";
  if (score >= 55) return "Strong";
  if (score >= 35) return "Average";
  return "Needs Improvement";
};

const normalizeImpactScore = (avgStars) => {
  if (!Number.isFinite(avgStars) || avgStars <= 0) return 0;
  const scaled = Math.log10(avgStars + 1) / Math.log10(1000);
  return Math.min(100, Math.max(0, scaled * 100));
};

const getComparisonPercentile = (devScore) => {
  const percentile = Math.round(Math.min(95, Math.max(20, devScore - 10)));
  return percentile;
};

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const isFallbackAiInsights = (aiInsights) => {
  if (!aiInsights) return false;
  return (
    !aiInsights.archetype &&
    !aiInsights.strengths?.length &&
    !aiInsights.weaknesses?.length &&
    !aiInsights.growthTrajectory &&
    !aiInsights.hireVerdict?.reason
  );
};

// ─── Verdict config ─────────────────────────────────────────────────────────

const VERDICT_CONFIG = {
  YES: {
    label: "Hire",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.07)",
    border: "rgba(34,197,94,0.22)",
  },
  NO: {
    label: "Pass",
    color: "#f87171",
    bg: "rgba(248,113,113,0.07)",
    border: "rgba(248,113,113,0.22)",
  },
  CONDITIONAL: {
    label: "Conditional",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.07)",
    border: "rgba(245,158,11,0.22)",
  },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function Card({ children, className = "", hover = true }) {
  return (
    <div
      className={`rounded-2xl border border-gh-border/80 bg-gh-card/80 backdrop-blur-sm transition-all duration-300 ${hover ? "hover:border-gh-border hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

function App() {
  const [username, setUsername] = useState("");
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAllLanguages, setShowAllLanguages] = useState(false);

  useEffect(() => {
    document.title = profile?.username ? `${profile.username} | DevPulse` : "DevPulse";
  }, [profile]);

  const handleAnalyze = async (event) => {
    event.preventDefault();
    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      setError("Please enter a GitHub username.");
      setProfile(null);
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      const BASE_URL = import.meta.env.DEV ? "" : "https://devpulse-1-g5gn.onrender.com";
      const response = await fetch(`${BASE_URL}/api/user/${trimmedUsername}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to fetch user data.");
      setProfile(data);
      setShowAllLanguages(false);
    } catch (requestError) {
      setProfile(null);
      setError(requestError.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────

  const score = profile?.analytics?.devScore ?? 0;
  const scoreCategory = getScoreCategory(score);
  const comparisonPercentile = getComparisonPercentile(score);
  const topPercentile = 100 - comparisonPercentile;

  const allLanguages = Object.entries(profile?.analytics?.languageDistribution ?? {}).sort(
    (a, b) => b[1] - a[1],
  );
  const displayedLanguages = showAllLanguages ? allLanguages : allLanguages.slice(0, 3);

  const topProject = profile?.repos?.find(
    (repo) => repo.name === profile?.analytics?.mostPopularRepo,
  );

  const activityOverview = (() => {
    const repos = profile?.repos || [];
    const activityScore = profile?.analytics?.activityScore || 0;
    const totalRepos = profile?.analytics?.totalRepos || 0;

    let lastUpdateDays = "N/A";
    let updatedLast30Days = 0;

    if (repos.length > 0) {
      const now = Date.now();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      let mostRecentMs = 0;

      repos.forEach((repo) => {
        if (!repo.updated_at) return;
        const updatedMs = new Date(repo.updated_at).getTime();
        if (updatedMs > mostRecentMs) mostRecentMs = updatedMs;
        if (now - updatedMs <= thirtyDaysMs) updatedLast30Days++;
      });

      if (mostRecentMs > 0) {
        lastUpdateDays = Math.max(0, Math.floor((now - mostRecentMs) / (24 * 60 * 60 * 1000)));
      }
    }

    let activityLevel = "Low";
    if (activityScore >= 75) activityLevel = "High";
    else if (activityScore >= 40) activityLevel = "Moderate";

    return { lastUpdateDays, updatedLast30Days, totalRepos, activityLevel };
  })();

  const impactScore = normalizeImpactScore(profile?.analytics?.avgStars ?? 0);

  const aiInsights = profile?.analytics?.aiInsights;
  const missingAiInsights = profile && !aiInsights;
  const fallbackAiInsights = isFallbackAiInsights(aiInsights);
  const showInsightsSpinner = missingAiInsights || fallbackAiInsights;

  const verdictDecision = aiInsights?.hireVerdict?.decision || "CONDITIONAL";
  const verdict = VERDICT_CONFIG[verdictDecision] ?? VERDICT_CONFIG.CONDITIONAL;

  const scoreMeta = [
    { label: "Activity", value: profile?.analytics?.activityScore ?? 0 },
    { label: "Consistency", value: profile?.analytics?.consistencyScore ?? 0 },
    { label: "Impact", value: impactScore.toFixed(1) },
    { label: "Diversity", value: profile?.analytics?.languageDiversityScore ?? 0 },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-gh-bg text-gh-text flex flex-col relative overflow-hidden">
      {!profile && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[800px] w-[1000px] -translate-x-1/2 -translate-y-1/2 opacity-30 blur-[120px]"
          style={{ background: "radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)" }}
        />
      )}

      {/* ── NAVBAR ── */}
      <div className="mx-auto w-full max-w-6xl px-4 flex-none z-10 relative">
        <nav className="flex h-16 items-center justify-between border-b border-gh-border mt-2">
          <div className="flex items-center gap-3">
            <button onClick={() => { setProfile(null); setUsername(""); setError(""); }} className="focus:outline-none transition-transform hover:scale-105 active:scale-95 cursor-pointer">
              <img src="/devpulse-logo.png" alt="DevPulse Logo" className="h-10 w-auto" />
            </button>
          </div>
          {profile && (
            <div className="relative">
              <form onSubmit={handleAnalyze} className="flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-gh-muted" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Search user..."
                  className="w-48 rounded-md border border-gh-border bg-gh-card/50 pl-9 pr-3 py-1.5 text-sm text-gh-text outline-none transition-all focus:border-gh-blue focus:ring-1 focus:ring-gh-blue/50"
                />
              </form>
            </div>
          )}
        </nav>
      </div>

      {!profile ? (
        // ── LANDING PAGE ──
        <div className="flex-1 flex flex-col items-center justify-center px-4 relative z-10 pb-24">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gh-heading tracking-tight mb-6">
              Analyze Any Developer’s GitHub Profile
            </h1>
            <p className="text-lg md:text-xl text-gh-muted max-w-2xl mx-auto">
              Get a data-driven developer score, behavioral insights, and hiring recommendation instantly.
            </p>
          </div>

          <div className="w-full max-w-xl mx-auto mb-16 relative">
            <div className="rounded-xl border border-gh-border bg-gh-card p-2 shadow-lg transition-all duration-300 hover:border-gh-blue/50 focus-within:border-gh-blue focus-within:ring-1 focus-within:ring-gh-blue">
              <form onSubmit={handleAnalyze} className="flex gap-2">
                <input
                  id="github-username-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter a GitHub username..."
                  className="w-full bg-transparent px-4 py-2 text-base text-gh-text outline-none placeholder:text-gh-muted/60"
                />
                <button
                  id="analyze-btn"
                  type="submit"
                  disabled={isLoading}
                  className="rounded-lg bg-gh-blue px-8 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-gh-blue-dark hover:shadow-lg hover:shadow-gh-blue/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? "Analyzing…" : "Analyze"}
                </button>
              </form>
            </div>
            {error && <p className="absolute -bottom-8 left-0 right-0 text-center text-sm text-gh-red">{error}</p>}
            {isLoading && <p className="absolute -bottom-8 left-0 right-0 text-center text-sm text-gh-muted">Fetching GitHub profile…</p>}
          </div>

          {/* ── FEATURES SECTION ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mx-auto">
            <div className="rounded-xl border border-gh-border bg-gh-card/40 p-8 text-center transition-all duration-300 hover:-translate-y-1 hover:bg-gh-card hover:shadow-xl hover:shadow-gh-blue/5">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="mb-3 text-lg font-bold text-gh-heading">Dev Score</h3>
              <p className="text-sm leading-relaxed text-gh-muted">
                Quantifiable metrics based on activity, consistency, code impact, and language versatility.
              </p>
            </div>

            <div className="rounded-xl border border-gh-border bg-gh-card/40 p-8 text-center transition-all duration-300 hover:-translate-y-1 hover:bg-gh-card hover:shadow-xl hover:shadow-purple-500/5">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20">
                <Brain className="w-6 h-6" />
              </div>
              <h3 className="mb-3 text-lg font-bold text-gh-heading">AI Insights</h3>
              <p className="text-sm leading-relaxed text-gh-muted">
                Deep behavioral analysis revealing developer archetypes, core strengths, and areas to grow.
              </p>
            </div>

            <div className="rounded-xl border border-gh-border bg-gh-card/40 p-8 text-center transition-all duration-300 hover:-translate-y-1 hover:bg-gh-card hover:shadow-xl hover:shadow-green-500/5">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 text-green-400 ring-1 ring-green-500/20">
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="mb-3 text-lg font-bold text-gh-heading">Hiring Recommendation</h3>
              <p className="text-sm leading-relaxed text-gh-muted">
                Actionable Hire, Pass, or Conditional verdicts to streamline your technical screening process.
              </p>
            </div>
          </div>
        </div>
      ) : (
        // ── ANALYSIS DASHBOARD ──
        <div className="mx-auto w-full max-w-6xl px-4 pb-16 z-10 relative mt-10">

          {/* Loading Error Overlay (if any) */}
          {error && <p className="mb-6 text-center text-sm text-gh-red">{error}</p>}
          {isLoading && (
            <p className="mb-6 text-center text-sm text-gh-muted">Updating GitHub profile…</p>
          )}

          <div className="flex flex-col gap-10">

            {/* ── PROFILE HEADER ── */}
            <header className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <img
                  src={profile.avatar_url}
                  alt={`${profile.username} avatar`}
                  className="h-24 w-24 rounded-full border-4 border-gh-card shadow-md object-cover"
                />
                <div className="mt-2">
                  <h1 className="text-3xl font-extrabold text-gh-heading">{profile.username}</h1>
                  <div className="mt-2 flex flex-wrap justify-center sm:justify-start items-center gap-4 text-sm text-gh-muted">
                    <span className="flex items-center gap-1.5"><Box className="w-4 h-4" /> {profile.public_repos} Repos</span>
                    <span className="flex items-center gap-1.5"><Activity className="w-4 h-4" /> {profile.followers} Followers</span>
                    <span className="flex items-center gap-1.5"><Activity className="w-4 h-4" /> {profile.following} Following</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setProfile(null); setUsername(""); setError(""); }}
                className="mt-2 sm:mt-4 flex items-center gap-1.5 text-sm font-medium text-gh-muted hover:text-gh-blue transition-colors outline-none"
              >
                <Search className="w-4 h-4" />
                New Search
              </button>
            </header>

            {/* ── ROW 1: DEV SCORE & PROFILE OVERVIEW ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* DEV SCORE */}
              <Card hover={true} className="p-8 shadow-sm">
                <div className="mb-6 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-gh-muted" />
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-gh-muted">Developer Score</h2>
                </div>
                <div className="flex flex-col items-center gap-6">
                  {/* Glow + score number */}
                  <div className="relative flex h-36 w-36 items-center justify-center">
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full blur-3xl"
                      style={{ background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)" }}
                    />
                    <span className="relative text-[72px] font-bold leading-none tracking-tight text-gh-blue">
                      {score}
                    </span>
                  </div>

                  {/* Category + percentile */}
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gh-heading">
                      {scoreCategory}
                      <span className="ml-2 text-sm font-normal text-gh-muted">
                        · Top {topPercentile}%
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-gh-muted/70">
                      Based on activity, consistency, impact, and versatility
                    </p>
                  </div>

                  {/* Score breakdown grid */}
                  <div className="grid w-full grid-cols-2 gap-px border-t border-gh-border pt-6 sm:grid-cols-4">
                    {scoreMeta.map(({ label, value }) => (
                      <div key={label} className="flex flex-col items-center gap-1 px-2">
                        <p className="text-xs text-gh-muted">{label}</p>
                        <p className="text-2xl font-bold text-gh-heading">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* PROFILE OVERVIEW & TOP PROJECT */}
              <div className="flex flex-col gap-8">
                <Card hover={true} className="p-8 shadow-sm">
                  <div className="mb-6 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-gh-muted" />
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-gh-muted">Profile Overview</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1 rounded-lg bg-gh-bg/50 p-4 border border-gh-border/50">
                      <Box className="w-5 h-5 text-gh-muted mb-2" />
                      <p className="text-xs text-gh-muted">Total Analyzed Repos</p>
                      <p className="text-xl font-bold text-gh-heading">{profile.analytics?.totalRepos ?? 0}</p>
                    </div>
                    <div className="flex flex-col gap-1 rounded-lg bg-gh-bg/50 p-4 border border-gh-border/50">
                      <Star className="w-5 h-5 text-gh-muted mb-2" />
                      <p className="text-xs text-gh-muted">Average Stars</p>
                      <p className="text-xl font-bold text-gh-heading">{profile.analytics?.avgStars ?? 0}</p>
                    </div>
                    <div className="col-span-2 flex flex-col gap-1 rounded-lg bg-gh-bg/50 p-4 border border-gh-border/50">
                      <Code className="w-5 h-5 text-gh-muted mb-2" />
                      <p className="text-xs text-gh-muted">Primary Language</p>
                      <p className="text-xl font-bold text-gh-heading">{profile.analytics?.mostUsedLanguage ?? "N/A"}</p>
                    </div>
                  </div>
                </Card>

                <Card hover={true} className="p-8 shadow-sm flex-1">
                  <div className="mb-6 flex items-center gap-2">
                    <Star className="w-5 h-5 text-gh-muted" />
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-gh-muted">Top Project</h2>
                  </div>
                  {topProject ? (
                    <a
                      href={`https://github.com/${profile.username}/${topProject.name}`}
                      target="_blank"
                      rel="noreferrer"
                      className="group block"
                    >
                      <p className="truncate text-lg font-semibold text-gh-heading group-hover:text-gh-blue transition-colors">
                        {topProject.name}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-4 text-sm text-gh-muted">
                        <span className="flex items-center gap-1.5"><Star className="w-4 h-4" /> {topProject.stargazers_count}</span>
                        <span className="flex items-center gap-1.5"><GitFork className="w-4 h-4" /> {topProject.forks_count}</span>
                        <span className="text-xs mt-0.5 ml-auto">Updated {formatDate(topProject.updated_at)}</span>
                      </div>
                    </a>
                  ) : (
                    <p className="text-sm text-gh-muted">Top project data unavailable.</p>
                  )}
                </Card>
              </div>

            </div>

            {/* ── ROW 2: AI INSIGHTS (Full Width) ── */}
            <Card hover={true} className="p-8 shadow-sm">
              <div className="mb-6 flex items-center gap-2">
                <Brain className="w-5 h-5 text-gh-muted" />
                <h2 className="text-xs font-semibold uppercase tracking-widest text-gh-muted">AI Insights</h2>
              </div>

              {showInsightsSpinner ? (
                <div className="flex items-center justify-center gap-3 py-12">
                  <svg
                    className="h-5 w-5 animate-spin text-gh-blue"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  <p className="text-sm text-gh-muted">Generating deep behavioral analysis…</p>
                </div>
              ) : (
                <div className="flex flex-col gap-8">
                  {/* Archetype */}
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-medium text-gh-muted">Archetype:</p>
                    <span
                      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-gh-blue/10 text-gh-blue border border-gh-blue/20"
                    >
                      {aiInsights?.archetype || "Unknown"}
                    </span>
                  </div>

                  {/* Strengths & Weaknesses */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <article className="rounded-xl p-5 bg-green-500/5 border border-green-500/10">
                      <p className="mb-4 text-xs font-bold uppercase tracking-wider text-green-500">
                        Strengths
                      </p>
                      <ul className="space-y-3">
                        {(aiInsights?.strengths?.length ? aiInsights.strengths : ["No data."]).map((item, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-gh-muted">
                            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500" />
                            <span className="leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </article>

                    <article className="rounded-xl p-5 bg-red-500/5 border border-red-500/10">
                      <p className="mb-4 text-xs font-bold uppercase tracking-wider text-red-500">
                        Areas to Improve
                      </p>
                      <ul className="space-y-3">
                        {(aiInsights?.weaknesses?.length ? aiInsights.weaknesses : ["No data."]).map((item, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-gh-muted">
                            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-500" />
                            <span className="leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </article>
                  </div>

                  {/* Growth Trajectory */}
                  <div className="pt-2">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gh-muted">
                      Growth Trajectory
                    </p>
                    <p className="text-sm leading-relaxed text-gh-text max-w-4xl">
                      {aiInsights?.growthTrajectory || "Growth trajectory unavailable."}
                    </p>
                  </div>

                  {/* Hire Verdict */}
                  <div
                    className="mt-2 rounded-xl p-6"
                    style={{ background: verdict.bg, border: `1px solid ${verdict.border}` }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Briefcase className="w-4 h-4 text-gh-muted" />
                      <p className="text-xs font-semibold uppercase tracking-widest text-gh-muted">
                        Hiring Recommendation
                      </p>
                    </div>
                    <p className="text-2xl font-bold" style={{ color: verdict.color }}>
                      {verdict.label}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-gh-text/80 max-w-4xl">
                      {aiInsights?.hireVerdict?.reason || "Recommendation reason unavailable."}
                    </p>
                  </div>
                </div>
              )}
            </Card>

            {/* ── ROW 3: TECH STACK & ACTIVITY SUMMARY ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* TECH STACK */}
              <Card hover={true} className="p-8 shadow-sm">
                <div className="mb-6 flex items-baseline justify-between">
                  <div className="flex items-center gap-2">
                    <Code className="w-5 h-5 text-gh-muted" />
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-gh-muted">Tech Stack</h2>
                  </div>
                  {allLanguages.length > 3 && (
                    <button
                      onClick={() => setShowAllLanguages((v) => !v)}
                      className="text-xs font-medium text-gh-blue transition-colors hover:text-gh-blue-dark"
                    >
                      {showAllLanguages ? "Show less ↑" : `+${allLanguages.length - 3} more ↓`}
                    </button>
                  )}
                </div>

                {displayedLanguages.length ? (
                  <div className="space-y-6">
                    {displayedLanguages.map(([language, percentage], idx) => (
                      <div key={language} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gh-text">{language}</p>
                          <p className="text-sm font-bold text-gh-blue">{percentage}%</p>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gh-track">
                          <div
                            className="h-2 rounded-full bg-gh-blue transition-all duration-500 ease-out"
                            style={{
                              width: `${percentage}%`,
                              animationDelay: `${idx * 80}ms`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gh-muted">No language data available.</p>
                )}
              </Card>

              {/* ACTIVITY OVERVIEW */}
              <Card hover={true} className="p-8 shadow-sm">
                <div className="mb-6 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-gh-muted" />
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-gh-muted">Activity Overview</h2>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1.5 rounded-lg bg-gh-bg/50 p-4 border border-gh-border/50">
                    <p className="text-xs text-gh-muted">Last Update</p>
                    <p className="text-lg font-bold text-gh-heading">
                      {activityOverview.lastUpdateDays} {activityOverview.lastUpdateDays !== "N/A" && "days ago"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 rounded-lg bg-gh-bg/50 p-4 border border-gh-border/50">
                    <p className="text-xs text-gh-muted">Updated (30d)</p>
                    <p className="text-lg font-bold text-gh-heading">
                      {activityOverview.updatedLast30Days} repos
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 rounded-lg bg-gh-bg/50 p-4 border border-gh-border/50">
                    <p className="text-xs text-gh-muted">Total Repos</p>
                    <p className="text-lg font-bold text-gh-heading">
                      {activityOverview.totalRepos}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 rounded-lg bg-gh-bg/50 p-4 border border-gh-border/50">
                    <p className="text-xs text-gh-muted">Activity Level</p>
                    <p className="text-lg font-bold text-gh-heading">
                      {activityOverview.activityLevel}
                    </p>
                  </div>
                </div>
              </Card>

            </div>

          </div>
        </div>
      )}
    </main>
  );
}

export default App;
