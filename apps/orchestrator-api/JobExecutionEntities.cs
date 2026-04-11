using Microsoft.EntityFrameworkCore;

namespace OpenAgents.OrchestratorApi.Data;

public enum StageExecutionState
{
    NotStarted = 0,
    Running = 1,
    Completed = 2,
    Failed = 3,
    Skipped = 4
}

public enum TaskExecutionState
{
    NotStarted = 0,
    Running = 1,
    Completed = 2,
    Failed = 3,
    Blocked = 4
}

[Index(nameof(JobId), nameof(Order))]
public sealed class JobStageExecution
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid JobId { get; private set; }
    public string StageDefinitionId { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public StageExecutionState State { get; private set; } = StageExecutionState.NotStarted;
    public string? Outcome { get; private set; }
    public int Order { get; private set; }
    public bool IsOptional { get; private set; }
    public bool IsSkipped { get; private set; }
    public int CurrentIteration { get; private set; } = 1;
    public int MaxIterations { get; private set; } = 1;
    public DateTime? StartedAtUtc { get; private set; }
    public DateTime? FinishedAtUtc { get; private set; }

    private JobStageExecution() { }

    public static JobStageExecution Create(
        Guid jobId,
        string stageDefinitionId,
        string name,
        int order,
        bool isOptional,
        int maxIterations)
    {
        return new JobStageExecution
        {
            JobId = jobId,
            StageDefinitionId = stageDefinitionId,
            Name = name,
            Order = order,
            IsOptional = isOptional,
            MaxIterations = Math.Max(1, maxIterations)
        };
    }

    public void Start()
    {
        if (State == StageExecutionState.NotStarted)
        {
            State = StageExecutionState.Running;
            StartedAtUtc = DateTime.UtcNow;
        }
    }

    public void Complete(string? outcome = null)
    {
        State = StageExecutionState.Completed;
        Outcome = outcome ?? "completed";
        FinishedAtUtc = DateTime.UtcNow;
    }

    public void Fail(string? outcome = null)
    {
        State = StageExecutionState.Failed;
        Outcome = outcome ?? "failed";
        FinishedAtUtc = DateTime.UtcNow;
    }

    public void Skip(string? outcome = null)
    {
        IsSkipped = true;
        State = StageExecutionState.Skipped;
        Outcome = outcome ?? "skipped";
        FinishedAtUtc = DateTime.UtcNow;
    }
}

[Index(nameof(JobId), nameof(StageExecutionId))]
public sealed class JobTaskExecution
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid JobId { get; private set; }
    public Guid StageExecutionId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public TaskExecutionState State { get; private set; } = TaskExecutionState.NotStarted;
    public string? Outcome { get; private set; }
    public string Source { get; private set; } = "seed";
    public string? TodoAddress { get; private set; }
    public int CurrentIteration { get; private set; } = 1;
    public int MaxIterations { get; private set; } = 1;
    public DateTime? StartedAtUtc { get; private set; }
    public DateTime? FinishedAtUtc { get; private set; }

    private JobTaskExecution() { }

    public static JobTaskExecution Create(
        Guid jobId,
        Guid stageExecutionId,
        string title,
        string? description,
        string source,
        int maxIterations,
        string? todoAddress = null)
    {
        return new JobTaskExecution
        {
            JobId = jobId,
            StageExecutionId = stageExecutionId,
            Title = title,
            Description = description,
            Source = source,
            MaxIterations = Math.Max(1, maxIterations),
            TodoAddress = todoAddress
        };
    }

    public void Start()
    {
        if (State == TaskExecutionState.NotStarted)
        {
            State = TaskExecutionState.Running;
            StartedAtUtc = DateTime.UtcNow;
        }
    }

    public void Complete(string? outcome = null)
    {
        State = TaskExecutionState.Completed;
        Outcome = outcome ?? "completed";
        FinishedAtUtc = DateTime.UtcNow;
    }

    public void Fail(string? outcome = null)
    {
        State = TaskExecutionState.Failed;
        Outcome = outcome ?? "failed";
        FinishedAtUtc = DateTime.UtcNow;
    }

    public void Block(string? outcome = null)
    {
        State = TaskExecutionState.Blocked;
        Outcome = outcome ?? "blocked";
        FinishedAtUtc = DateTime.UtcNow;
    }
}
