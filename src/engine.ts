import * as fs from 'fs';
import * as path from 'path';
import { RepoInfo, AutoDocConfig, DocSection } from './types';
import { scanRepo } from './scanner';
import {
  generateOverview,
  generateArchitecture,
  generateApiDocs,
  generateStructure,
} from './generators';
import { calculateHealth, formatHealthReport } from './health';

// ─── Core engine ─────────────────────────────────────────────
// Orchestrates scanning → generating → writing docs.

export async function runAutoDoc(config: AutoDocConfig): Promise<{
  sections: DocSection[];
  healthScore: number;
  outputDir: string;
}> {
  // 1. Scan
  console.log('🔍 Scanning repository...');
  const repo = await scanRepo(config.rootDir);
  console.log(`   Found ${repo.files.length} files, ${repo.folders.length} folders, ${repo.apis.length} API endpoints`);

  // 2. Generate sections
  console.log('📝 Generating documentation...');
  const sections: DocSection[] = [];
  const generatorMap: Record<string, (repo: RepoInfo) => DocSection> = {
    overview: generateOverview,
    architecture: generateArchitecture,
    api: generateApiDocs,
    structure: generateStructure,
  };

  for (const sectionName of config.sections) {
    const generator = generatorMap[sectionName];
    if (generator) {
      const section = generator(repo);
      sections.push(section);
      console.log(`   ✓ ${section.title}`);
    }
  }

  // 3. Health check
  let healthScore = 0;
  if (config.includeHealthScore) {
    console.log('🏥 Running health checks...');
    const health = calculateHealth(repo);
    healthScore = health.percentage;
    sections.push({
      filename: 'health.md',
      title: 'Documentation Health',
      content: formatHealthReport(health),
    });
    console.log(`   Score: ${health.percentage}%`);
  }

  // 4. Write files
  const outputDir = path.resolve(config.rootDir, config.outputDir);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`📂 Writing docs to ${config.outputDir}/`);
  for (const section of sections) {
    const filePath = path.join(outputDir, section.filename);
    fs.writeFileSync(filePath, section.content, 'utf-8');
    console.log(`   ✓ ${section.filename}`);
  }

  return { sections, healthScore, outputDir };
}
