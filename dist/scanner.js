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
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanRepo = scanRepo;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// ─── Repo Scanner ─────────────────────────────────────────
// Walks the repository and extracts structural + semantic info.
const IGNORE_DIRS = new Set([
    'node_modules', '.git', 'dist', 'build', 'coverage',
    '.next', '.nuxt', '__pycache__', '.venv', 'venv',
    'vendor', 'target', 'bin', 'obj', '.idea', '.vscode',
]);
const IGNORE_FILES = new Set([
    '.DS_Store', 'Thumbs.db', 'package-lock.json', 'yarn.lock',
    'pnpm-lock.yaml', '.gitignore', '.eslintcache',
]);
async function scanRepo(rootDir) {
    const repoName = path.basename(rootDir);
    const [readme, packageJson, folders, files] = await Promise.all([
        readReadme(rootDir),
        readPackageJson(rootDir),
        scanFolders(rootDir),
        scanFiles(rootDir),
    ]);
    const apis = extractApis(files, rootDir);
    const techStack = detectTechStack(files, packageJson);
    const scripts = packageJson?.scripts ?? {};
    return {
        name: repoName,
        root: rootDir,
        readme,
        packageJson,
        folders,
        files,
        apis,
        techStack,
        scripts,
        hasTests: files.some(f => f.path.includes('test') || f.path.includes('spec') || f.name.includes('.test.') || f.name.includes('.spec.')),
        hasCI: fs.existsSync(path.join(rootDir, '.github/workflows')) ||
            fs.existsSync(path.join(rootDir, '.gitlab-ci.yml')) ||
            fs.existsSync(path.join(rootDir, 'Jenkinsfile')),
        hasDocker: fs.existsSync(path.join(rootDir, 'Dockerfile')) ||
            fs.existsSync(path.join(rootDir, 'docker-compose.yml')) ||
            fs.existsSync(path.join(rootDir, 'docker-compose.yaml')),
        license: detectLicense(rootDir),
    };
}
// ─── README ────────────────────────────────────────────────
async function readReadme(rootDir) {
    const candidates = ['README.md', 'readme.md', 'README.MD', 'Readme.md', 'README'];
    for (const name of candidates) {
        const p = path.join(rootDir, name);
        if (fs.existsSync(p)) {
            return fs.readFileSync(p, 'utf-8');
        }
    }
    return null;
}
// ─── package.json ──────────────────────────────────────────
async function readPackageJson(rootDir) {
    const p = path.join(rootDir, 'package.json');
    if (!fs.existsSync(p))
        return null;
    try {
        const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
        return {
            name: raw.name ?? '',
            version: raw.version ?? '0.0.0',
            description: raw.description ?? '',
            dependencies: raw.dependencies ?? {},
            devDependencies: raw.devDependencies ?? {},
            scripts: raw.scripts ?? {},
        };
    }
    catch {
        return null;
    }
}
// ─── Folder scanning ───────────────────────────────────────
async function scanFolders(rootDir) {
    const folders = [];
    function walk(dir, depth) {
        if (depth > 3)
            return; // Only go 3 levels deep
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            if (!entry.isDirectory())
                continue;
            if (IGNORE_DIRS.has(entry.name))
                continue;
            if (entry.name.startsWith('.'))
                continue;
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(rootDir, fullPath);
            let fileCount = 0;
            try {
                fileCount = fs.readdirSync(fullPath).filter(f => !f.startsWith('.')).length;
            }
            catch { /* ignore */ }
            folders.push({
                path: relativePath,
                name: entry.name,
                fileCount,
                description: inferFolderPurpose(entry.name),
            });
            walk(fullPath, depth + 1);
        }
    }
    walk(rootDir, 0);
    return folders;
}
// ─── File scanning ─────────────────────────────────────────
async function scanFiles(rootDir) {
    const files = [];
    function walk(dir, depth) {
        if (depth > 5)
            return;
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            if (entry.name.startsWith('.'))
                continue;
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (!IGNORE_DIRS.has(entry.name))
                    walk(fullPath, depth + 1);
                continue;
            }
            if (IGNORE_FILES.has(entry.name))
                continue;
            const ext = path.extname(entry.name);
            let size = 0;
            let hasComments = false;
            try {
                const stat = fs.statSync(fullPath);
                size = stat.size;
                // Quick check for comments in source files
                if (['.ts', '.js', '.tsx', '.jsx', '.py', '.cs', '.java', '.go', '.rb'].includes(ext)) {
                    const head = fs.readFileSync(fullPath, 'utf-8').slice(0, 2000);
                    hasComments = head.includes('/**') || head.includes('///') || head.includes('# ') || head.includes('//');
                }
            }
            catch { /* ignore */ }
            files.push({
                path: path.relative(rootDir, fullPath),
                name: entry.name,
                extension: ext,
                size,
                hasComments,
            });
        }
    }
    walk(rootDir, 0);
    return files;
}
// ─── API extraction ────────────────────────────────────────
function extractApis(files, rootDir) {
    const endpoints = [];
    // Patterns for common API frameworks
    const patterns = [
        { regex: /(?:app|router)\.(get)\s*\(\s*['"`]([^'"`]+)['"`]/gi, method: 'GET' },
        { regex: /(?:app|router)\.(post)\s*\(\s*['"`]([^'"`]+)['"`]/gi, method: 'POST' },
        { regex: /(?:app|router)\.(put)\s*\(\s*['"`]([^'"`]+)['"`]/gi, method: 'PUT' },
        { regex: /(?:app|router)\.(delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi, method: 'DELETE' },
        { regex: /(?:app|router)\.(patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi, method: 'PATCH' },
        // .NET style [HttpGet], [HttpPost], etc.
        { regex: /\[Http(Get|Post|Put|Delete|Patch)\s*(?:\("([^"]*)")?\]/gi, method: '' },
        // Python / Flask / FastAPI style
        { regex: /@(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/gi, method: '' },
    ];
    const sourceExts = new Set(['.ts', '.js', '.tsx', '.jsx', '.py', '.cs', '.java', '.go']);
    for (const file of files) {
        if (!sourceExts.has(file.extension))
            continue;
        const fullPath = path.join(rootDir, file.path);
        let content;
        try {
            content = fs.readFileSync(fullPath, 'utf-8');
        }
        catch {
            continue;
        }
        const lines = content.split('\n');
        for (const pattern of patterns) {
            let match;
            const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
            while ((match = regex.exec(content)) !== null) {
                const lineNum = content.slice(0, match.index).split('\n').length;
                const method = (pattern.method || match[1]).toUpperCase();
                const routePath = match[2] || '';
                // Try to grab a comment above the route
                const commentLine = lineNum >= 2 ? lines[lineNum - 2]?.trim() : '';
                const desc = commentLine.startsWith('//') || commentLine.startsWith('#')
                    ? commentLine.replace(/^\/\/\s*|^#\s*/, '')
                    : '';
                endpoints.push({
                    method,
                    path: routePath,
                    file: file.path,
                    line: lineNum,
                    description: desc,
                });
            }
        }
    }
    return endpoints;
}
// ─── Tech stack detection ──────────────────────────────────
function detectTechStack(files, pkg) {
    const stack = {
        languages: [],
        frameworks: [],
        infrastructure: [],
        databases: [],
        testing: [],
    };
    // Languages by file extension
    const langMap = {
        '.ts': 'TypeScript', '.tsx': 'TypeScript',
        '.js': 'JavaScript', '.jsx': 'JavaScript',
        '.py': 'Python',
        '.cs': 'C#',
        '.java': 'Java',
        '.go': 'Go',
        '.rb': 'Ruby',
        '.rs': 'Rust',
        '.swift': 'Swift',
        '.kt': 'Kotlin',
        '.php': 'PHP',
    };
    const detectedLangs = new Set();
    for (const file of files) {
        if (langMap[file.extension])
            detectedLangs.add(langMap[file.extension]);
    }
    stack.languages = [...detectedLangs];
    // Frameworks + databases + infra from deps
    const allDeps = {
        ...(pkg?.dependencies ?? {}),
        ...(pkg?.devDependencies ?? {}),
    };
    const frameworkMap = {
        react: 'React', next: 'Next.js', vue: 'Vue', nuxt: 'Nuxt',
        angular: 'Angular', svelte: 'Svelte', express: 'Express',
        fastify: 'Fastify', nestjs: 'NestJS', '@nestjs/core': 'NestJS',
        django: 'Django', flask: 'Flask', fastapi: 'FastAPI',
        'spring-boot': 'Spring Boot', rails: 'Rails',
    };
    const dbMap = {
        pg: 'PostgreSQL', mysql2: 'MySQL', mongodb: 'MongoDB',
        mongoose: 'MongoDB', redis: 'Redis', typeorm: 'TypeORM',
        prisma: 'Prisma', sequelize: 'Sequelize', knex: 'Knex',
        '@prisma/client': 'Prisma',
    };
    const testMap = {
        jest: 'Jest', mocha: 'Mocha', vitest: 'Vitest',
        '@testing-library/react': 'React Testing Library',
        cypress: 'Cypress', playwright: 'Playwright',
        pytest: 'Pytest',
    };
    for (const dep of Object.keys(allDeps)) {
        if (frameworkMap[dep])
            stack.frameworks.push(frameworkMap[dep]);
        if (dbMap[dep])
            stack.databases.push(dbMap[dep]);
        if (testMap[dep])
            stack.testing.push(testMap[dep]);
    }
    // Infra detection by files
    if (files.some(f => f.name === 'Dockerfile' || f.name.startsWith('docker-compose')))
        stack.infrastructure.push('Docker');
    if (files.some(f => f.name.includes('terraform') || f.path.includes('terraform')))
        stack.infrastructure.push('Terraform');
    if (files.some(f => f.path.includes('.github/workflows')))
        stack.infrastructure.push('GitHub Actions');
    if (files.some(f => f.name === '.gitlab-ci.yml'))
        stack.infrastructure.push('GitLab CI');
    if (files.some(f => f.name === 'serverless.yml' || f.name === 'serverless.ts'))
        stack.infrastructure.push('Serverless Framework');
    if (files.some(f => f.name === 'cdk.json' || f.path.includes('cdk')))
        stack.infrastructure.push('AWS CDK');
    if (files.some(f => f.name === 'vercel.json'))
        stack.infrastructure.push('Vercel');
    if (files.some(f => f.name === 'netlify.toml'))
        stack.infrastructure.push('Netlify');
    // Dedupe
    stack.frameworks = [...new Set(stack.frameworks)];
    stack.databases = [...new Set(stack.databases)];
    stack.infrastructure = [...new Set(stack.infrastructure)];
    stack.testing = [...new Set(stack.testing)];
    return stack;
}
// ─── Helpers ───────────────────────────────────────────────
function inferFolderPurpose(name) {
    const purposes = {
        src: 'Application source code',
        lib: 'Shared library code',
        api: 'API routes and handlers',
        routes: 'Route definitions',
        controllers: 'Request handlers / controllers',
        services: 'Business logic and service layer',
        models: 'Data models and schemas',
        middleware: 'Middleware functions',
        utils: 'Utility / helper functions',
        helpers: 'Helper functions',
        config: 'Configuration files',
        types: 'Type definitions',
        interfaces: 'Interfaces and contracts',
        tests: 'Test files',
        test: 'Test files',
        __tests__: 'Test files',
        spec: 'Test specifications',
        scripts: 'Build and automation scripts',
        docs: 'Documentation',
        public: 'Static / public assets',
        static: 'Static files',
        assets: 'Media and asset files',
        components: 'UI components',
        pages: 'Page components / views',
        views: 'View templates',
        layouts: 'Layout components',
        hooks: 'Custom hooks',
        store: 'State management',
        state: 'Application state',
        reducers: 'State reducers',
        actions: 'State actions / dispatchers',
        db: 'Database layer',
        database: 'Database layer',
        migrations: 'Database migrations',
        seeds: 'Database seed data',
        entities: 'Database entities',
        repositories: 'Data access / repository pattern',
        dtos: 'Data transfer objects',
        guards: 'Auth / access guards',
        pipes: 'Data transformation pipes',
        decorators: 'Custom decorators',
        modules: 'Application modules',
        plugins: 'Plugin extensions',
        workers: 'Background workers / jobs',
        jobs: 'Background jobs',
        queues: 'Queue processing',
        events: 'Event definitions and handlers',
        infra: 'Infrastructure as code',
        deploy: 'Deployment configuration',
        ci: 'Continuous integration config',
    };
    return purposes[name.toLowerCase()] || `Contains ${name}-related files`;
}
function detectLicense(rootDir) {
    const candidates = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license', 'COPYING'];
    for (const name of candidates) {
        const p = path.join(rootDir, name);
        if (fs.existsSync(p)) {
            const head = fs.readFileSync(p, 'utf-8').slice(0, 200).toLowerCase();
            if (head.includes('mit'))
                return 'MIT';
            if (head.includes('apache'))
                return 'Apache 2.0';
            if (head.includes('gpl'))
                return 'GPL';
            if (head.includes('bsd'))
                return 'BSD';
            if (head.includes('isc'))
                return 'ISC';
            return 'Custom';
        }
    }
    return null;
}
//# sourceMappingURL=scanner.js.map