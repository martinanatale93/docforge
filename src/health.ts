import { RepoInfo, HealthReport, HealthCheck } from './types';

// ─── Documentation Health Scorer ─────────────────────────────
// Runs a battery of checks against the repo to produce a
// "Documentation Score: 72%" — devs LOVE scores.

export function calculateHealth(repo: RepoInfo): HealthReport {
  const checks: HealthCheck[] = [];

  // 1. README exists (15 pts)
  checks.push({
    name: 'README',
    passed: repo.readme !== null,
    points: repo.readme !== null ? 15 : 0,
    maxPoints: 15,
    detail: repo.readme !== null
      ? 'README.md exists'
      : 'No README.md found — this is the #1 thing developers look for',
  });

  // 2. README quality (10 pts)
  const readmeLength = repo.readme?.length ?? 0;
  const readmeQuality = readmeLength > 2000 ? 10 : readmeLength > 500 ? 6 : readmeLength > 100 ? 3 : 0;
  checks.push({
    name: 'README quality',
    passed: readmeQuality >= 6,
    points: readmeQuality,
    maxPoints: 10,
    detail: readmeLength > 2000
      ? `README is thorough (${readmeLength} chars)`
      : readmeLength > 500
      ? `README is decent but could be expanded (${readmeLength} chars)`
      : `README is too short (${readmeLength} chars) — add setup instructions, examples, and architecture overview`,
  });

  // 3. Package description (5 pts)
  const hasDesc = (repo.packageJson?.description?.length ?? 0) > 10;
  checks.push({
    name: 'Project description',
    passed: hasDesc,
    points: hasDesc ? 5 : 0,
    maxPoints: 5,
    detail: hasDesc
      ? 'Project has a description'
      : 'Add a description to package.json',
  });

  // 4. Code comments (15 pts)
  const sourceFiles = repo.files.filter(f =>
    ['.ts', '.js', '.tsx', '.jsx', '.py', '.cs', '.java', '.go', '.rb'].includes(f.extension)
  );
  const commentedFiles = sourceFiles.filter(f => f.hasComments).length;
  const commentRatio = sourceFiles.length > 0 ? commentedFiles / sourceFiles.length : 0;
  const commentPoints = Math.round(commentRatio * 15);
  checks.push({
    name: 'Code comments',
    passed: commentRatio > 0.5,
    points: commentPoints,
    maxPoints: 15,
    detail: sourceFiles.length > 0
      ? `${commentedFiles}/${sourceFiles.length} source files have comments (${(commentRatio * 100).toFixed(0)}%)`
      : 'No source files found',
  });

  // 5. API documentation (10 pts)
  const apiDocPoints = repo.apis.length === 0 ? 10 : // N/A, full points
    repo.apis.filter(a => a.description.length > 0).length / repo.apis.length >= 0.5 ? 10 : 3;
  checks.push({
    name: 'API documentation',
    passed: apiDocPoints >= 10,
    points: apiDocPoints,
    maxPoints: 10,
    detail: repo.apis.length === 0
      ? 'No API endpoints detected (N/A)'
      : `${repo.apis.filter(a => a.description.length > 0).length}/${repo.apis.length} endpoints have descriptions`,
  });

  // 6. Tests exist (10 pts)
  checks.push({
    name: 'Tests',
    passed: repo.hasTests,
    points: repo.hasTests ? 10 : 0,
    maxPoints: 10,
    detail: repo.hasTests
      ? 'Test files detected'
      : 'No test files found — add tests to improve reliability',
  });

  // 7. CI/CD configured (5 pts)
  checks.push({
    name: 'CI/CD',
    passed: repo.hasCI,
    points: repo.hasCI ? 5 : 0,
    maxPoints: 5,
    detail: repo.hasCI
      ? 'CI/CD configuration found'
      : 'No CI/CD configuration — add GitHub Actions or similar',
  });

  // 8. License (5 pts)
  checks.push({
    name: 'License',
    passed: repo.license !== null,
    points: repo.license !== null ? 5 : 0,
    maxPoints: 5,
    detail: repo.license !== null
      ? `License: ${repo.license}`
      : 'No LICENSE file found',
  });

  // 9. Contributing guide (5 pts)
  const hasContributing = repo.files.some(f =>
    f.name.toLowerCase() === 'contributing.md' || f.name.toLowerCase() === 'contribute.md'
  );
  checks.push({
    name: 'Contributing guide',
    passed: hasContributing,
    points: hasContributing ? 5 : 0,
    maxPoints: 5,
    detail: hasContributing
      ? 'CONTRIBUTING.md exists'
      : 'No CONTRIBUTING.md — add one to encourage contributions',
  });

  // 10. Changelog (5 pts)
  const hasChangelog = repo.files.some(f =>
    f.name.toLowerCase() === 'changelog.md' || f.name.toLowerCase() === 'changes.md'
  );
  checks.push({
    name: 'Changelog',
    passed: hasChangelog,
    points: hasChangelog ? 5 : 0,
    maxPoints: 5,
    detail: hasChangelog
      ? 'CHANGELOG.md exists'
      : 'No CHANGELOG.md — track your releases',
  });

  // 11. Environment template (5 pts)
  const hasEnvExample = repo.files.some(f =>
    f.name === '.env.example' || f.name === '.env.template' || f.name === '.env.sample'
  );
  checks.push({
    name: 'Env template',
    passed: hasEnvExample,
    points: hasEnvExample ? 5 : 0,
    maxPoints: 5,
    detail: hasEnvExample
      ? '.env.example exists'
      : 'No .env.example — add one so developers know what environment variables are needed',
  });

  // 12. Setup scripts / instructions (10 pts)
  const hasSetupScript = Object.keys(repo.scripts).some(s =>
    ['dev', 'start', 'serve', 'setup', 'install'].includes(s)
  );
  checks.push({
    name: 'Setup scripts',
    passed: hasSetupScript,
    points: hasSetupScript ? 10 : 0,
    maxPoints: 10,
    detail: hasSetupScript
      ? 'Development scripts detected (dev/start/serve)'
      : 'No dev/start script found in package.json',
  });

  // Calculate totals
  const score = checks.reduce((sum, c) => sum + c.points, 0);
  const maxScore = checks.reduce((sum, c) => sum + c.maxPoints, 0);
  const percentage = Math.round((score / maxScore) * 100);

  const missing = checks.filter(c => !c.passed).map(c => c.name);
  const suggestions = checks
    .filter(c => !c.passed)
    .map(c => c.detail);

  return { score, maxScore, percentage, checks, missing, suggestions };
}

// ─── Format health report as Markdown ───────────────────────

export function formatHealthReport(health: HealthReport): string {
  const lines: string[] = [];

  lines.push('# Documentation Health');
  lines.push('');

  // Big score
  const emoji = health.percentage >= 80 ? '🟢' : health.percentage >= 50 ? '🟡' : '🔴';
  lines.push(`## Score: ${health.percentage}% ${emoji}`);
  lines.push('');
  lines.push(generateScoreBar(health.percentage));
  lines.push('');
  lines.push(`**${health.score}** / ${health.maxScore} points`);
  lines.push('');

  // Checklist
  lines.push('## Checks');
  lines.push('');

  for (const check of health.checks) {
    const icon = check.passed ? '✅' : '❌';
    lines.push(`${icon} **${check.name}** — ${check.points}/${check.maxPoints} pts`);
    lines.push(`  ${check.detail}`);
    lines.push('');
  }

  // What's missing
  if (health.missing.length > 0) {
    lines.push('## Missing');
    lines.push('');
    for (const item of health.missing) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }

  // Suggestions
  if (health.suggestions.length > 0) {
    lines.push('## Suggestions');
    lines.push('');
    for (const suggestion of health.suggestions) {
      lines.push(`- ${suggestion}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push(`*Auto-generated by [docforge](https://github.com/martinanatale93/docforge) on ${new Date().toISOString().split('T')[0]}*`);

  return lines.join('\n');
}

function generateScoreBar(percentage: number): string {
  const filled = Math.round(percentage / 5);
  const empty = 20 - filled;
  return `${'█'.repeat(filled)}${'░'.repeat(empty)} ${percentage}%`;
}
