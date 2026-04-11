using OpenAgents.OrchestratorApi.Infrastructure;
using TaskStatus = OpenAgents.OrchestratorApi.Infrastructure.TaskStatus;

namespace OpenAgents.OrchestratorApi.Tests;

/// <summary>
/// Unit tests for <see cref="TodoParser"/> against the formal grammar
/// defined in docs/plans/WORKSPACE-CONTRACT.md §4.2.
/// </summary>
public sealed class TodoParserTests
{
    // ──────────────────────────────────────────────────────────
    // Title parsing
    // ──────────────────────────────────────────────────────────

    [Fact]
    public void Parse_ExtractsTitle()
    {
        var content = "# My Project TODO\n\n## Stages\n";
        var result = TodoParser.Parse(content);
        Assert.Equal("My Project TODO", result.Title);
    }

    [Fact]
    public void Parse_DefaultsTitleWhenMissing()
    {
        var result = TodoParser.Parse("## Stages\n");
        Assert.Equal("TODO", result.Title);
    }

    // ──────────────────────────────────────────────────────────
    // Metadata parsing
    // ──────────────────────────────────────────────────────────

    [Fact]
    public void Parse_ExtractsMetadata()
    {
        var content = """
            # TODO

            ## Metadata
            job_id: job_abc123
            workflow: planning
            stage: plan
            """;

        var result = TodoParser.Parse(content);

        Assert.Equal("job_abc123", result.Metadata.JobId);
        Assert.Equal("planning",   result.Metadata.Workflow);
        Assert.Equal("plan",       result.Metadata.Stage);
    }

    [Fact]
    public void Parse_MetadataWithExtraWhitespace()
    {
        var content = "# T\n\n## Metadata\njob_id:  id-with-spaces  \n";
        var result = TodoParser.Parse(content);
        Assert.Equal("id-with-spaces", result.Metadata.JobId);
    }

    // ──────────────────────────────────────────────────────────
    // Stage parsing
    // ──────────────────────────────────────────────────────────

    [Theory]
    [InlineData(' ', StageStatus.NotStarted)]
    [InlineData('-', StageStatus.Active)]
    [InlineData('x', StageStatus.Done)]
    [InlineData('!', StageStatus.Blocked)]
    [InlineData('s', StageStatus.Skipped)]
    [InlineData('?', StageStatus.NotStarted)] // unknown → NotStarted (rule 6)
    public void Parse_StageStatusTokens(char token, StageStatus expectedStatus)
    {
        var content = $"# T\n\n## Stages\n- [{token}] setup: Environment Setup\n";
        var result = TodoParser.Parse(content);

        Assert.Single(result.Stages);
        Assert.Equal("setup",           result.Stages[0].Id);
        Assert.Equal("Environment Setup", result.Stages[0].DisplayName);
        Assert.Equal(expectedStatus,    result.Stages[0].Status);
    }

    [Fact]
    public void Parse_MultipleStages()
    {
        var content = """
            # T

            ## Stages
            - [x] setup: Environment Setup
            - [-] plan: Planning
            - [ ] implement: Implementation
            """;

        var result = TodoParser.Parse(content);

        Assert.Equal(3, result.Stages.Count);
        Assert.Equal(StageStatus.Done,       result.Stages[0].Status);
        Assert.Equal(StageStatus.Active,     result.Stages[1].Status);
        Assert.Equal(StageStatus.NotStarted, result.Stages[2].Status);
    }

    // ──────────────────────────────────────────────────────────
    // Task parsing
    // ──────────────────────────────────────────────────────────

    [Theory]
    [InlineData(' ', TaskStatus.NotStarted)]
    [InlineData('-', TaskStatus.Active)]
    [InlineData('x', TaskStatus.Done)]
    [InlineData('!', TaskStatus.Blocked)]
    [InlineData('~', TaskStatus.Cancelled)]
    [InlineData('@', TaskStatus.NotStarted)] // unknown → NotStarted
    public void Parse_TaskStatusTokens(char token, TaskStatus expectedStatus)
    {
        var content = $"# T\n\n## Tasks\n- [{token}] task-001: Do something\n";
        var result = TodoParser.Parse(content);

        Assert.Single(result.Tasks);
        Assert.Equal("task-001",    result.Tasks[0].Id);
        Assert.Equal("Do something", result.Tasks[0].Title);
        Assert.Equal(expectedStatus, result.Tasks[0].Status);
    }

    [Fact]
    public void Parse_TaskWithDescription()
    {
        var content = """
            # T

            ## Tasks
            - [-] task-001: Define requirements
              > This is the description line
            - [ ] task-002: Next task
            """;

        var result = TodoParser.Parse(content);

        Assert.Equal(2, result.Tasks.Count);
        Assert.Equal("This is the description line", result.Tasks[0].Description);
        Assert.Null(result.Tasks[1].Description);
    }

    // ──────────────────────────────────────────────────────────
    // ID validation
    // ──────────────────────────────────────────────────────────

    [Fact]
    public void Parse_IgnoresEntryWithInvalidId()
    {
        // Uppercase in ID → not valid per rule 2
        var content = "# T\n\n## Stages\n- [x] Setup-Stage: Invalid id\n";
        var result = TodoParser.Parse(content);
        Assert.Empty(result.Stages);
    }

    [Fact]
    public void Parse_IgnoresEntryWithSpaceInId()
    {
        var content = "# T\n\n## Tasks\n- [x] task 001: Space in id\n";
        var result = TodoParser.Parse(content);
        Assert.Empty(result.Tasks);
    }

    // ──────────────────────────────────────────────────────────
    // Minimal valid example from spec
    // ──────────────────────────────────────────────────────────

    [Fact]
    public void Parse_MinimalValidExample_FromSpec()
    {
        var content = """
            # TODO

            ## Metadata
            job_id: job_abc123
            workflow: planning
            stage: plan

            ## Stages
            - [x] setup: Environment Setup
            - [-] plan: Planning
            - [ ] implement: Implementation

            ## Tasks
            - [x] task-001: Initialize workspace
            - [-] task-002: Define requirements
            - [ ] task-003: Create design document

            ## Decisions
            - 2026-01-01T12:00:00Z: Chose PostgreSQL for storage layer.

            ## Notes
            - Waiting on stakeholder input for task-003.
            """;

        var result = TodoParser.Parse(content);

        Assert.Equal("TODO", result.Title);
        Assert.Equal("job_abc123", result.Metadata.JobId);
        Assert.Equal("planning",   result.Metadata.Workflow);
        Assert.Equal("plan",       result.Metadata.Stage);

        Assert.Equal(3, result.Stages.Count);
        Assert.Equal(StageStatus.Done,       result.Stages[0].Status);
        Assert.Equal(StageStatus.Active,     result.Stages[1].Status);
        Assert.Equal(StageStatus.NotStarted, result.Stages[2].Status);

        Assert.Equal(3, result.Tasks.Count);
        Assert.Equal(TaskStatus.Done,       result.Tasks[0].Status);
        Assert.Equal(TaskStatus.Active,     result.Tasks[1].Status);
        Assert.Equal(TaskStatus.NotStarted, result.Tasks[2].Status);

        Assert.Single(result.Decisions);
        Assert.Single(result.Notes);
    }

    // ──────────────────────────────────────────────────────────
    // Round-trip from file
    // ──────────────────────────────────────────────────────────

    [Fact]
    public async Task ParseFileAsync_ParsesFromDisk()
    {
        var tmp = Path.GetTempFileName();
        try
        {
            await File.WriteAllTextAsync(tmp,
                "# File Test\n\n## Metadata\njob_id: file-test\n\n## Stages\n- [x] done: Done Stage\n");

            var result = await TodoParser.ParseFileAsync(tmp);

            Assert.Equal("File Test", result.Title);
            Assert.Equal("file-test", result.Metadata.JobId);
            Assert.Single(result.Stages);
        }
        finally
        {
            File.Delete(tmp);
        }
    }
}
