export type RuntimeProfileName = 'codex' | 'claude' | 'copilot' | 'opencode';
export type ExecutionMode = 'interactive' | 'auto';
export type FlowStage = 'understand' | 'diagnose' | 'architecture' | 'plan' | 'refactor' | 'validate';
export type RuntimeStatus = 'not_bootstrapped' | 'ready' | 'running' | 'awaiting_validation' | 'blocked' | 'failed' | 'complete';
export type ValidationResult = 'unknown' | 'pass' | 'fail' | 'inconclusive';
export type LegacyTargetStatus = 'supported' | 'planned' | 'experimental';

export interface OutputWriter {
  write(chunk: string): void;
}

export interface CommandContext {
  cwd: string;
  stdout: OutputWriter;
  stderr: OutputWriter;
}

export type CommandHandler = (args: string[], context: CommandContext) => Promise<number>;

export interface VersionMetadata {
  name: string;
  version: string;
  schemaVersion: string;
}

export interface ParsedVersionMetadata {
  presetName: string;
  presetVersion: string;
  schemaVersion: string;
}

export interface PresetEntry {
  relativePath: string;
  content: string;
}

export interface LoadedPreset {
  metadata: VersionMetadata;
  entries: PresetEntry[];
}

export interface FileEntry {
  fullPath: string;
  relativePath: string;
}

export interface RuntimeTimestamps {
  bootstrapped_at: string | null;
  last_transition_at: string | null;
  completed_at: string | null;
}

export interface RuntimeStateBlock {
  status: RuntimeStatus;
  mode: ExecutionMode | null;
  selected_agent: RuntimeProfileName | null;
  current_stage: FlowStage | null;
  current_task_id: string | null;
  completed_stages: FlowStage[];
  awaiting_user_validation: boolean;
  last_validation_result: ValidationResult;
  resumable: boolean;
  blocked_reason: string | null;
  next_action: string;
  timestamps: RuntimeTimestamps;
}

export interface ProdifyState {
  schema_version: string;
  preset_name: string;
  preset_version: string;
  primary_agent: RuntimeProfileName | null;
  runtime: RuntimeStateBlock;
}

export interface ResumeDecision {
  resumable: boolean;
  command: string | null;
  reason: string;
}

export interface RuntimeProfile {
  name: RuntimeProfileName;
  displayName: string;
  bootstrapPrompt: string;
  bootstrapSummary: string;
  executeCommand: '$prodify-execute' | '$prodify-execute --auto';
  resumeCommand: '$prodify-resume';
  nuances: string[];
}

export interface LegacyTargetDefinition {
  agent: RuntimeProfileName;
  status: LegacyTargetStatus;
  canonicalSources: readonly string[];
  targetPath: string;
  enabled: boolean;
  doctorEligible: boolean;
  generator: (repoRoot: string) => Promise<string>;
}

export interface ManagedFileHeader {
  targetAgent: RuntimeProfileName;
  canonicalSources: string[];
  regenerateWith: string;
  bodyFingerprint: string | null;
  manualEditsWarning: boolean;
  headerLength: number;
}

export interface ManagedFileState {
  state: 'unmanaged' | 'unchanged' | 'conflict' | 'outdated';
  header: ManagedFileHeader | null;
}

export interface VersionInspection {
  status: 'missing' | 'current' | 'outdated' | 'malformed';
  current: ParsedVersionMetadata | null;
  expected: VersionMetadata;
  schemaMigrationRequired: boolean;
}

export interface StatusReport {
  ok: boolean;
  initialized: boolean;
  canonicalOk: boolean;
  canonicalMissing: string[];
  versionStatus: VersionInspection;
  primaryAgent: RuntimeProfileName | null;
  runtimeState: ProdifyState | null;
  runtimeStateError: Error | null;
  resumable: boolean;
  manualBootstrapReady: boolean;
  bootstrapProfile: RuntimeProfileName;
  bootstrapPrompt: string;
  recommendedNextAction: string;
  presetMetadata: VersionMetadata;
}

export interface DoctorCheck {
  label: string;
  ok: boolean;
  skipped?: boolean;
  details?: string;
}

export interface DoctorResult {
  ok: boolean;
  checks: DoctorCheck[];
}

export interface LegacySyncResult {
  agent: RuntimeProfileName;
  targetPath: string;
  status: 'updated' | 'unchanged' | 'blocked' | 'skipped-unmanaged' | 'not-enabled';
}

export interface UpdateSummary {
  versionStatus: VersionInspection['status'];
  schemaMigrationRequired: boolean;
  writtenCanonicalCount: number;
  preservedCanonicalCount: number;
}
