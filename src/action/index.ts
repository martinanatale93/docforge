import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from '@actions/github';
import * as path from 'path';
import { runAutoDoc } from '../engine';
import { AutoDocConfig } from '../types';

// ─── GitHub Action Entry Point ───────────────────────────────
// Runs inside GitHub Actions, reads inputs from action.yml,
// generates docs, and optionally commits them.

async function run(): Promise<void> {
  try {
    const outputDir = core.getInput('output-dir') || 'docs';
    const includeHealthScore = core.getInput('include-health-score') !== 'false';
    const commitChanges = core.getInput('commit-changes') !== 'false';
    const commitMessage = core.getInput('commit-message') || 'docs: auto-update documentation [skip ci]';
    const sectionsInput = core.getInput('sections') || 'overview,architecture,api,structure';
    const sections = sectionsInput.split(',').map(s => s.trim());

    const rootDir = process.env.GITHUB_WORKSPACE || process.cwd();

    core.info('� Docforge — GitHub Action');
    core.info(`Repository: ${path.basename(rootDir)}`);
    core.info(`Output: ${outputDir}/`);
    core.info(`Sections: ${sections.join(', ')}`);

    const config: AutoDocConfig = {
      rootDir,
      outputDir,
      includeHealthScore,
      commitChanges,
      commitMessage,
      sections,
    };

    const result = await runAutoDoc(config);

    // Set outputs
    core.setOutput('health-score', result.healthScore.toString());
    core.setOutput('docs-path', result.outputDir);
    core.setOutput('files-generated', result.sections.length.toString());

    // Commit changes if configured
    if (commitChanges) {
      core.info('📤 Committing documentation changes...');

      try {
        // Configure git
        await exec.exec('git', ['config', 'user.name', 'docforge[bot]']);
        await exec.exec('git', ['config', 'user.email', 'docforge[bot]@users.noreply.github.com']);

        // Stage docs
        await exec.exec('git', ['add', outputDir]);

        // Check if there are changes
        let hasChanges = false;
        try {
          await exec.exec('git', ['diff', '--cached', '--quiet']);
        } catch {
          hasChanges = true;
        }

        if (hasChanges) {
          await exec.exec('git', ['commit', '-m', commitMessage]);
          await exec.exec('git', ['push']);
          core.info('✅ Documentation committed and pushed');
        } else {
          core.info('ℹ️ No documentation changes to commit');
        }
      } catch (err: any) {
        core.warning(`Could not commit changes: ${err.message}`);
        core.warning('Make sure the workflow has write permissions (contents: write)');
      }
    }

    // Summary
    core.summary
      .addHeading('� Docforge — Documentation Generated')
      .addTable([
        [
          { data: 'Metric', header: true },
          { data: 'Value', header: true },
        ],
        ['Files generated', result.sections.length.toString()],
        ['Health score', `${result.healthScore}%`],
        ['Output directory', outputDir],
      ]);

    if (result.sections.length > 0) {
      core.summary.addHeading('Generated Files', 3);
      const fileList = result.sections.map(s => `- \`${outputDir}/${s.filename}\` — ${s.title}`).join('\n');
      core.summary.addRaw(fileList);
    }

    await core.summary.write();

    core.info(`\n✅ Generated ${result.sections.length} documentation files`);
    if (includeHealthScore) {
      core.info(`📊 Documentation Health Score: ${result.healthScore}%`);
    }

  } catch (error: any) {
    core.setFailed(`Docforge failed: ${error.message}`);
  }
}

run();
