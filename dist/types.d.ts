export interface RepoInfo {
    name: string;
    root: string;
    readme: string | null;
    packageJson: PackageJsonInfo | null;
    folders: FolderInfo[];
    files: FileInfo[];
    apis: ApiEndpoint[];
    techStack: TechStack;
    scripts: Record<string, string>;
    hasTests: boolean;
    hasCI: boolean;
    hasDocker: boolean;
    license: string | null;
}
export interface PackageJsonInfo {
    name: string;
    version: string;
    description: string;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    scripts: Record<string, string>;
}
export interface FolderInfo {
    path: string;
    name: string;
    fileCount: number;
    description: string;
}
export interface FileInfo {
    path: string;
    name: string;
    extension: string;
    size: number;
    hasComments: boolean;
}
export interface ApiEndpoint {
    method: string;
    path: string;
    file: string;
    line: number;
    description: string;
}
export interface TechStack {
    languages: string[];
    frameworks: string[];
    infrastructure: string[];
    databases: string[];
    testing: string[];
}
export interface DocSection {
    filename: string;
    title: string;
    content: string;
}
export interface HealthReport {
    score: number;
    maxScore: number;
    percentage: number;
    checks: HealthCheck[];
    missing: string[];
    suggestions: string[];
}
export interface HealthCheck {
    name: string;
    passed: boolean;
    points: number;
    maxPoints: number;
    detail: string;
}
export interface AutoDocConfig {
    outputDir: string;
    includeHealthScore: boolean;
    commitChanges: boolean;
    commitMessage: string;
    sections: string[];
    rootDir: string;
}
//# sourceMappingURL=types.d.ts.map