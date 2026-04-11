namespace OpenAgents.OrchestratorApi.Infrastructure;

// ──────────────────────────────────────────────────────────────
// TODO.md domain models
// ──────────────────────────────────────────────────────────────

/// <summary>
/// Parsed representation of the full TODO.md file.
/// </summary>
public sealed record ParsedTodo(
    string Title,
    TodoMetadata Metadata,
    IReadOnlyList<ParsedStage> Stages,
    IReadOnlyList<ParsedTask> Tasks,
    IReadOnlyList<string> Decisions,
    IReadOnlyList<string> Notes);

/// <summary>Key-value pairs from the ## Metadata block.</summary>
public sealed record TodoMetadata(
    string? JobId,
    string? Workflow,
    string? Stage);

/// <summary>A single stage entry from the ## Stages block.</summary>
public sealed record ParsedStage(
    string Id,
    string DisplayName,
    StageStatus Status);

/// <summary>A single task entry from the ## Tasks block.</summary>
public sealed record ParsedTask(
    string Id,
    string Title,
    string? Description,
    TaskStatus Status);

// ──────────────────────────────────────────────────────────────
// Status enums
// ──────────────────────────────────────────────────────────────

/// <summary>
/// Stage status tokens as defined in the Workspace Contract.
/// Token → Meaning: ' '=NotStarted, '-'=Active, 'x'=Done, '!'=Blocked, 's'=Skipped
/// </summary>
public enum StageStatus
{
    NotStarted,
    Active,
    Done,
    Blocked,
    Skipped
}

/// <summary>
/// Task status tokens as defined in the Workspace Contract.
/// Token → Meaning: ' '=NotStarted, '-'=Active, 'x'=Done, '!'=Blocked, '~'=Cancelled
/// </summary>
public enum TaskStatus
{
    NotStarted,
    Active,
    Done,
    Blocked,
    Cancelled
}

// ──────────────────────────────────────────────────────────────
// Parser
// ──────────────────────────────────────────────────────────────

/// <summary>
/// Parses TODO.md files according to the formal grammar defined in
/// docs/plans/WORKSPACE-CONTRACT.md §4.2.
///
/// Parsing rules (v1):
///   1. A line starting with "- [" followed by one status token and "]" is a parseable entry.
///   2. stage-id and task-id must be lowercase, hyphen-separated, no spaces.
///   3. The ":" separator between id and title is required.
///   4. ## Metadata is key-value pairs, one per line, no YAML delimiters.
///   5. ## Decisions and ## Notes are free-text — not machine-parsed.
///   6. Unknown status tokens cause the entry to be treated as NotStarted.
/// </summary>
public static class TodoParser
{
    private enum Section
    {
        None, Metadata, Stages, Tasks, Decisions, Notes
    }

    /// <summary>Parse the TODO.md content string and return the structured result.</summary>
    public static ParsedTodo Parse(string content)
    {
        ArgumentNullException.ThrowIfNull(content);

        var lines = content.Split('\n');

        var title = string.Empty;
        var section = Section.None;

        // Metadata fields
        string? metaJobId = null, metaWorkflow = null, metaStage = null;

        var stages = new List<ParsedStage>();
        var tasks = new List<ParsedTask>();
        var decisions = new List<string>();
        var notes = new List<string>();
        string? pendingTaskDescription = null;
        ParsedTask? lastTask = null;

        foreach (var rawLine in lines)
        {
            var line = rawLine.TrimEnd('\r');

            // ── Title ──────────────────────────────────────────
            if (line.StartsWith("# ") && title.Length == 0)
            {
                title = line[2..].Trim();
                continue;
            }

            // ── Section headers ────────────────────────────────
            if (line.StartsWith("## "))
            {
                // Flush pending task description
                if (lastTask is not null && pendingTaskDescription is not null)
                {
                    var idx = tasks.IndexOf(lastTask);
                    if (idx >= 0)
                        tasks[idx] = lastTask with { Description = pendingTaskDescription };
                    pendingTaskDescription = null;
                    lastTask = null;
                }

                section = line[3..].Trim() switch
                {
                    "Metadata" => Section.Metadata,
                    "Stages"   => Section.Stages,
                    "Tasks"    => Section.Tasks,
                    "Decisions"=> Section.Decisions,
                    "Notes"    => Section.Notes,
                    _          => Section.None
                };
                continue;
            }

            // ── Per-section parsing ────────────────────────────
            switch (section)
            {
                case Section.Metadata:
                    ParseMetadataLine(line, ref metaJobId, ref metaWorkflow, ref metaStage);
                    break;

                case Section.Stages:
                    if (TryParseCheckedEntry(line, out var stageToken, out var stageId, out var stageName))
                        stages.Add(new ParsedStage(stageId!, stageName!, MapStageStatus(stageToken)));
                    break;

                case Section.Tasks:
                    // Task description continuation lines start with "> "
                    if (line.TrimStart().StartsWith("> ") && lastTask is not null)
                    {
                        pendingTaskDescription = line.TrimStart()[2..].Trim();
                    }
                    else if (TryParseCheckedEntry(line, out var taskToken, out var taskId, out var taskName))
                    {
                        // Flush previous task description
                        if (lastTask is not null && pendingTaskDescription is not null)
                        {
                            var idx = tasks.IndexOf(lastTask);
                            if (idx >= 0)
                                tasks[idx] = lastTask with { Description = pendingTaskDescription };
                        }
                        pendingTaskDescription = null;
                        var newTask = new ParsedTask(taskId!, taskName!, null, MapTaskStatus(taskToken));
                        tasks.Add(newTask);
                        lastTask = newTask;
                    }
                    break;

                case Section.Decisions:
                    if (!string.IsNullOrWhiteSpace(line))
                        decisions.Add(line.TrimStart('-', ' '));
                    break;

                case Section.Notes:
                    if (!string.IsNullOrWhiteSpace(line))
                        notes.Add(line.TrimStart('-', ' '));
                    break;
            }
        }

        // Flush final pending task description
        if (lastTask is not null && pendingTaskDescription is not null)
        {
            var idx = tasks.IndexOf(lastTask);
            if (idx >= 0)
                tasks[idx] = lastTask with { Description = pendingTaskDescription };
        }

        return new ParsedTodo(
            Title: string.IsNullOrEmpty(title) ? "TODO" : title,
            Metadata: new TodoMetadata(metaJobId, metaWorkflow, metaStage),
            Stages: stages.AsReadOnly(),
            Tasks: tasks.AsReadOnly(),
            Decisions: decisions.AsReadOnly(),
            Notes: notes.AsReadOnly());
    }

    /// <summary>Parse a TODO.md file from disk.</summary>
    public static async Task<ParsedTodo> ParseFileAsync(
        string filePath, CancellationToken ct = default)
    {
        var content = await File.ReadAllTextAsync(filePath, ct);
        return Parse(content);
    }

    // ──────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────

    private static void ParseMetadataLine(
        string line,
        ref string? jobId,
        ref string? workflow,
        ref string? stage)
    {
        if (string.IsNullOrWhiteSpace(line)) return;
        var sep = line.IndexOf(':');
        if (sep < 0) return;

        var key = line[..sep].Trim().ToLowerInvariant();
        var val = line[(sep + 1)..].Trim();

        switch (key)
        {
            case "job_id":   jobId    = val; break;
            case "workflow": workflow = val; break;
            case "stage":    stage    = val; break;
        }
    }

    /// <summary>
    /// Tries to parse a line like: - [x] stage-id: Display Name
    /// Returns true if the pattern matches; token, id, and name are set.
    /// </summary>
    private static bool TryParseCheckedEntry(
        string line,
        out char token,
        out string? id,
        out string? name)
    {
        token = ' ';
        id = null;
        name = null;

        var trimmed = line.TrimStart();
        // Must start with "- ["
        if (!trimmed.StartsWith("- [")) return false;
        if (trimmed.Length < 6) return false; // "- [x] "
        // Token is at index 3
        token = trimmed[3];
        // Index 4 must be ']'
        if (trimmed[4] != ']') return false;

        // Rest after "- [x] "
        var rest = trimmed.Length > 6 ? trimmed[6..].Trim() : string.Empty;
        if (string.IsNullOrEmpty(rest)) return false;

        // Split on first ':'
        var colonIdx = rest.IndexOf(':');
        if (colonIdx < 0) return false;

        id   = rest[..colonIdx].Trim();
        name = rest[(colonIdx + 1)..].Trim();

        // id must be non-empty and lowercase-hyphen
        if (string.IsNullOrEmpty(id) || string.IsNullOrEmpty(name)) return false;
        if (!IsValidId(id)) return false;

        return true;
    }

    /// <summary>id must match: lowercase letters, digits, and hyphens only.</summary>
    private static bool IsValidId(string id)
        => id.All(c => char.IsLower(c) || char.IsDigit(c) || c == '-');

    private static StageStatus MapStageStatus(char token) => token switch
    {
        ' ' => StageStatus.NotStarted,
        '-' => StageStatus.Active,
        'x' => StageStatus.Done,
        '!' => StageStatus.Blocked,
        's' => StageStatus.Skipped,
        _   => StageStatus.NotStarted  // Rule 6: unknown → NotStarted
    };

    private static TaskStatus MapTaskStatus(char token) => token switch
    {
        ' ' => TaskStatus.NotStarted,
        '-' => TaskStatus.Active,
        'x' => TaskStatus.Done,
        '!' => TaskStatus.Blocked,
        '~' => TaskStatus.Cancelled,
        _   => TaskStatus.NotStarted   // Rule 6: unknown → NotStarted
    };
}
