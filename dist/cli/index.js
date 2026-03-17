#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const engine_1 = require("../engine");
const scanner_1 = require("../scanner");
const health_1 = require("../health");
// ─── CLI Entry Point ─────────────────────────────────────────
// Usage:
//   docforge                     generate docs for current directory
//   docforge --dir ./my-project  generate docs for a specific directory
//   docforge health              just run the health check
//   docforge explain src/services  explain a specific folder
const program = new commander_1.Command();
program
    .name('docforge')
    .description('Zero-config documentation for any repo. One command. Always fresh.')
    .version('1.0.0');
// ─── Main generate command ───────────────────────────────────
program
    .command('generate', { isDefault: true })
    .description('Generate documentation for the repository')
    .option('-d, --dir <path>', 'Root directory of the project', '.')
    .option('-o, --output <path>', 'Output directory for docs', 'docs')
    .option('--no-health', 'Skip health score generation')
    .option('-s, --sections <list>', 'Comma-separated sections to generate', 'overview,architecture,api,structure')
    .action(async (opts) => {
    console.log(chalk_1.default.blue.bold('\n� Docforge\n'));
    const config = {
        rootDir: path.resolve(opts.dir),
        outputDir: opts.output,
        includeHealthScore: opts.health !== false,
        commitChanges: false,
        commitMessage: '',
        sections: opts.sections.split(',').map((s) => s.trim()),
    };
    try {
        const result = await (0, engine_1.runAutoDoc)(config);
        console.log('');
        console.log(chalk_1.default.green.bold(`✅ Generated ${result.sections.length} documentation files`));
        console.log(chalk_1.default.gray(`   Output: ${result.outputDir}`));
        if (config.includeHealthScore) {
            const scoreColor = result.healthScore >= 80 ? chalk_1.default.green
                : result.healthScore >= 50 ? chalk_1.default.yellow
                    : chalk_1.default.red;
            console.log(scoreColor(`   Health Score: ${result.healthScore}%`));
        }
        console.log('');
    }
    catch (err) {
        console.error(chalk_1.default.red(`Error: ${err.message}`));
        process.exit(1);
    }
});
// ─── Health check command ────────────────────────────────────
program
    .command('health')
    .description('Run documentation health check only')
    .option('-d, --dir <path>', 'Root directory of the project', '.')
    .action(async (opts) => {
    console.log(chalk_1.default.blue.bold('\n🏥 Documentation Health Check\n'));
    try {
        const repo = await (0, scanner_1.scanRepo)(path.resolve(opts.dir));
        const health = (0, health_1.calculateHealth)(repo);
        const scoreColor = health.percentage >= 80 ? chalk_1.default.green
            : health.percentage >= 50 ? chalk_1.default.yellow
                : chalk_1.default.red;
        console.log(scoreColor.bold(`   Documentation Score: ${health.percentage}%\n`));
        for (const check of health.checks) {
            const icon = check.passed ? chalk_1.default.green('✅') : chalk_1.default.red('❌');
            const pts = check.passed ? chalk_1.default.green(`${check.points}/${check.maxPoints}`) : chalk_1.default.red(`${check.points}/${check.maxPoints}`);
            console.log(`   ${icon} ${check.name} ${chalk_1.default.gray(`(${pts})`)}`);
        }
        if (health.missing.length > 0) {
            console.log(chalk_1.default.yellow('\n   Missing:'));
            for (const item of health.missing) {
                console.log(chalk_1.default.yellow(`   - ${item}`));
            }
        }
        console.log('');
    }
    catch (err) {
        console.error(chalk_1.default.red(`Error: ${err.message}`));
        process.exit(1);
    }
});
// ─── Explain command ─────────────────────────────────────────
program
    .command('explain <path>')
    .description('Explain what a specific folder or file does')
    .option('-d, --dir <path>', 'Root directory of the project', '.')
    .action(async (targetPath, opts) => {
    console.log(chalk_1.default.blue.bold('\n🔎 Docforge Explain\n'));
    try {
        const repo = await (0, scanner_1.scanRepo)(path.resolve(opts.dir));
        // Find matching folder
        const folder = repo.folders.find(f => f.path === targetPath || f.path === targetPath.replace(/\/$/, ''));
        if (folder) {
            console.log(chalk_1.default.white.bold(`   ${folder.path}/`));
            console.log('');
            console.log(`   ${folder.description}`);
            console.log(chalk_1.default.gray(`   ${folder.fileCount} files`));
            // List sub-items
            const subFolders = repo.folders.filter(f => f.path.startsWith(folder.path + '/') &&
                f.path.split('/').length === folder.path.split('/').length + 1);
            const subFiles = repo.files.filter(f => f.path.startsWith(folder.path + '/') &&
                f.path.split('/').length === folder.path.split('/').length + 1);
            if (subFolders.length > 0) {
                console.log(chalk_1.default.gray('\n   Sub-directories:'));
                for (const sf of subFolders) {
                    console.log(`   📁 ${sf.name}/ — ${sf.description}`);
                }
            }
            if (subFiles.length > 0) {
                console.log(chalk_1.default.gray('\n   Files:'));
                for (const sf of subFiles.slice(0, 20)) {
                    console.log(`   📄 ${sf.name}`);
                }
                if (subFiles.length > 20) {
                    console.log(chalk_1.default.gray(`   ... and ${subFiles.length - 20} more`));
                }
            }
        }
        else {
            console.log(chalk_1.default.yellow(`   Could not find folder: ${targetPath}`));
            console.log(chalk_1.default.gray('   Available folders:'));
            for (const f of repo.folders.slice(0, 15)) {
                console.log(chalk_1.default.gray(`   - ${f.path}/`));
            }
        }
        console.log('');
    }
    catch (err) {
        console.error(chalk_1.default.red(`Error: ${err.message}`));
        process.exit(1);
    }
});
program.parse();
//# sourceMappingURL=index.js.map