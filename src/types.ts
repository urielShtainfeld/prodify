export type RuntimeProfileName = 'codex' | 'claude' | 'copilot' | 'opencode';
export type ExecutionMode = 'interactive' | 'auto';
export type FlowStage = 'understand' | 'diagnose' | 'architecture' | 'plan' | 'refactor' | 'validate';
export type RuntimeStatus = 'not_bootstrapped' | 'ready' | 'running' | 'awaiting_validation' | 'blocked' | 'failed' | 'complete';
export type ValidationResult = 'unknown' | 'pass' | 'fail' | 'inconclusive';
export type ContractArtifactFormat = 'markdown' | 'json';
export type SkillCategory = 'stage-method' | 'domain' | 'quality-policy';
export type RepoContextFact = 'language' | 'framework' | 'project_type' | 'architecture_pattern' | 'risk_signal';
export type ContractRuntimeState =
  | 'not_bootstrapped'
  | 'bootstrapped'
  | 'understand_pending'
  | 'understand_complete'
  | 'diagnose_pending'
  | 'diagnose_complete'
  | 'architecture_pending'
  | 'architecture_complete'
  | 'plan_pending'
  | 'plan_complete'
  | 'refactor_pending'
  | 'refactor_complete'
  | 'validate_pending'
  | 'validate_complete'
  | 'blocked'
  | 'failed'
  | 'completed';
export type ScoreSnapshotKind = 'baseline' | 'final';
export type ScoreMetricStatus = 'pass' | 'partial' | 'fail' | 'unavailable';

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

export interface CompiledContractArtifactRule {
  path: string;
  format: ContractArtifactFormat;
  required_sections: string[];
  required_json_keys: string[];
}

export interface SkillConditionPredicate {
  fact: RepoContextFact;
  includes: string;
}

export interface SkillCondition {
  all: SkillConditionPredicate[];
}

export interface SkillDefinition {
  schema_version: string;
  id: string;
  name: string;
  version: string;
  category: SkillCategory;
  description: string;
  intended_use: string[];
  stage_compatibility: FlowStage[];
  activation_conditions: SkillCondition[];
  execution_guidance: string[];
  caution_guidance: string[];
}

export interface SkillRegistryManifest {
  schema_version: string;
  skills: string[];
}

export interface StageSkillRoutingRule {
  skill: string;
  when: SkillCondition;
  reason: string;
}

export interface StageSkillRouting {
  default_skills: string[];
  allowed_skills: string[];
  conditional_skills: StageSkillRoutingRule[];
}

export interface CompiledStageContract {
  schema_version: string;
  contract_version: string;
  stage: FlowStage;
  task_id: string;
  source_path: string;
  source_hash: string;
  required_artifacts: CompiledContractArtifactRule[];
  allowed_write_roots: string[];
  forbidden_writes: string[];
  policy_rules: string[];
  success_criteria: string[];
  skill_routing: StageSkillRouting;
}

export interface ContractSourceDocument {
  frontmatter: Record<string, unknown>;
  body: string;
}

export interface CompiledContractInventory {
  ok: boolean;
  sourceCount: number;
  compiledCount: number;
  staleStages: FlowStage[];
  missingCompiledStages: FlowStage[];
  missingSourceStages: FlowStage[];
  invalidStages: string[];
}

export interface ValidationIssue {
  rule: string;
  message: string;
  path?: string;
}

export interface StageValidationResult {
  stage: FlowStage;
  contract_version: string;
  passed: boolean;
  violated_rules: ValidationIssue[];
  missing_artifacts: string[];
  warnings: string[];
  diagnostics: string[];
}

export interface RuntimeFailureMetadata {
  stage: FlowStage | null;
  contract_version: string | null;
  reason: string;
}

export interface RuntimeBootstrapMetadata {
  bootstrapped: boolean;
}

export interface RuntimeStateBlock {
  status: RuntimeStatus;
  current_state: ContractRuntimeState;
  mode: ExecutionMode | null;
  current_stage: FlowStage | null;
  current_task_id: string | null;
  pending_stage: FlowStage | null;
  completed_stages: FlowStage[];
  awaiting_user_validation: boolean;
  last_validation_result: ValidationResult;
  last_validation: StageValidationResult | null;
  last_validated_contract_versions: Partial<Record<FlowStage, string>>;
  resumable: boolean;
  blocked_reason: string | null;
  failure_metadata: RuntimeFailureMetadata | null;
  bootstrap: RuntimeBootstrapMetadata;
  next_action: string;
  timestamps: RuntimeTimestamps;
}

export interface ProdifyState {
  schema_version: string;
  preset_name: string;
  preset_version: string;
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

export interface RepoContextSnapshot {
  languages: string[];
  frameworks: string[];
  project_types: string[];
  architecture_patterns: string[];
  risk_signals: string[];
}

export interface SkillActivationRecord {
  id: string;
  name: string;
  category: SkillCategory;
  source: 'default' | 'conditional';
  active: boolean;
  reason: string;
}

export interface StageSkillResolution {
  stage: FlowStage;
  context: RepoContextSnapshot;
  considered_skills: SkillActivationRecord[];
  active_skill_ids: string[];
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
  contractsOk: boolean;
  contractInventory: CompiledContractInventory | null;
  versionStatus: VersionInspection;
  configuredAgents: RuntimeProfileName[];
  runtimeState: ProdifyState | null;
  runtimeStateError: Error | null;
  resumable: boolean;
  manualBootstrapReady: boolean;
  bootstrapProfile: RuntimeProfileName;
  bootstrapPrompt: string;
  stageSkillResolution: StageSkillResolution | null;
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

export interface UpdateSummary {
  versionStatus: VersionInspection['status'];
  schemaMigrationRequired: boolean;
  writtenCanonicalCount: number;
  preservedCanonicalCount: number;
  compiledContractCount: number;
}

export interface ScoreMetric {
  id: string;
  label: string;
  tool: string;
  weight: number;
  max_points: number;
  points: number;
  status: ScoreMetricStatus;
  details: string;
}

export interface ScoreSnapshot {
  schema_version: string;
  kind: ScoreSnapshotKind;
  ecosystems: string[];
  total_score: number;
  max_score: number;
  metrics: ScoreMetric[];
}

export interface ScoreDelta {
  schema_version: string;
  baseline_score: number;
  final_score: number;
  delta: number;
}

export interface AgentSetupRecord {
  agent: RuntimeProfileName;
  display_name: string;
  configured_at: string;
  commands: string[];
}

export interface GlobalAgentSetupState {
  schema_version: string;
  configured_agents: Partial<Record<RuntimeProfileName, AgentSetupRecord>>;
}
