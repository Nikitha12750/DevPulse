import test from "node:test";
import assert from "node:assert/strict";
import { calculateDeveloperScore } from "../src/services/githubService.js";

test("keeps strong profiles in a sensible range", () => {
  const score = calculateDeveloperScore({
    activityScore: 85,
    consistencyScore: 80,
    impactScore: 60,
    languageDiversityScore: 65,
  });

  assert.equal(score, 65);
});

test("keeps average profiles from getting inflated scores", () => {
  const score = calculateDeveloperScore({
    activityScore: 90,
    consistencyScore: 90,
    impactScore: 35,
    languageDiversityScore: 60,
  });

  assert.equal(score, 59.25);
});

test("gives strong scores to high-impact profiles with many followers and repos", () => {
  const score = calculateDeveloperScore({
    activityScore: 65,
    consistencyScore: 60,
    impactScore: 70,
    languageDiversityScore: 60,
    followers: 800,
    publicRepos: 100,
  });

  assert.equal(score, 71.15);
});

test("gives elite profiles a 90+ score when their signals are consistently strong", () => {
  const score = calculateDeveloperScore({
    activityScore: 85,
    consistencyScore: 80,
    impactScore: 80,
    languageDiversityScore: 75,
    followers: 1200,
    publicRepos: 120,
  });

  assert.equal(score, 94.5);
});

test("treats high-reach, high-impact profiles as elite even when recency signals are modest", () => {
  const score = calculateDeveloperScore({
    activityScore: 10,
    consistencyScore: 40,
    impactScore: 70,
    languageDiversityScore: 60,
    followers: 791,
    publicRepos: 108,
  });

  assert.equal(score, 53.33);
});
