using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using OpenAgents.Domain.Aggregates.Jobs;
using OpenAgents.Domain.Aggregates.Workflows;
using OpenAgents.Domain.Enums;

namespace OpenAgents.OrchestratorApi.Data;

/// <summary>
/// EF Core DbContext for the OpenAgents orchestrator.
/// Uses SQLite for v1 local development and production.
/// Schema is created via EnsureCreated() at startup (migrations can be added post-v1).
/// </summary>
public sealed class OrchestratorDbContext : DbContext
{
    public OrchestratorDbContext(DbContextOptions<OrchestratorDbContext> options)
        : base(options) { }

    public DbSet<Job> Jobs => Set<Job>();
    public DbSet<JobEvent> JobEvents => Set<JobEvent>();
    public DbSet<JobStageExecution> JobStageExecutions => Set<JobStageExecution>();
    public DbSet<JobTaskExecution> JobTaskExecutions => Set<JobTaskExecution>();
    public DbSet<WorkflowDefinition> WorkflowDefinitions => Set<WorkflowDefinition>();
    public DbSet<ProviderDefinition> ProviderDefinitions => Set<ProviderDefinition>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        ConfigureJob(modelBuilder);
        ConfigureJobEvent(modelBuilder);
        ConfigureJobStageExecution(modelBuilder);
        ConfigureJobTaskExecution(modelBuilder);
        ConfigureWorkflowDefinition(modelBuilder);
        ConfigureProviderDefinition(modelBuilder);
    }

    // ──────────────────────────────────────────────────────────
    // Entity configurations
    // ──────────────────────────────────────────────────────────

    private static void ConfigureJob(ModelBuilder mb)
    {
        mb.Entity<Job>(b =>
        {
            b.ToTable("Jobs");

            // DomainEvents lives only in memory — never persisted
            b.Ignore(j => j.DomainEvents);

            // JobId → Guid converter
            var jobIdConverter = new ValueConverter<JobId, Guid>(
                id => id.Value,
                val => JobId.From(val));

            b.HasKey(j => j.Id);
            b.Property(j => j.Id)
                .HasConversion(jobIdConverter)
                .HasColumnName("Id")
                .ValueGeneratedNever();

            b.Property(j => j.Title).HasMaxLength(500).IsRequired();
            b.Property(j => j.Description).HasMaxLength(2000);

            b.Property(j => j.State).HasConversion<int>().IsRequired();
            b.Property(j => j.Outcome).HasConversion<int>().IsRequired();
            b.Property(j => j.ConnectionStatus).HasConversion<int>().IsRequired();

            b.Property(j => j.WorkflowDefinitionId).IsRequired();
            b.Property(j => j.WorkflowSlug).HasMaxLength(200).IsRequired();
            b.Property(j => j.WorkflowVersion).HasMaxLength(50).IsRequired();
            b.Property(j => j.WorkflowCategory).HasMaxLength(100);
            b.Property(j => j.PrimaryProviderId).HasMaxLength(200).IsRequired();
            b.Property(j => j.PrimaryModel).HasMaxLength(200);

            b.Property(j => j.SourceGitBranch).HasMaxLength(300);
            b.Property(j => j.WorkingGitBranch).HasMaxLength(300);
            b.Property(j => j.TargetGitBranch).HasMaxLength(300);

            b.Property(j => j.WorkspaceHostPath).HasMaxLength(1000);
            b.Property(j => j.ActiveWorkspaceId);
            b.Property(j => j.ContainerId).HasMaxLength(128);
            b.Property(j => j.ErrorMessage).HasMaxLength(2000);

            b.Property(j => j.CreatedAtUtc).IsRequired();

            b.HasIndex(j => j.State);
            b.HasIndex(j => j.CreatedAtUtc);
        });
    }

    private static void ConfigureJobEvent(ModelBuilder mb)
    {
        mb.Entity<JobEvent>(b =>
        {
            b.ToTable("JobEvents");

            var eventIdConverter = new ValueConverter<JobEventId, Guid>(
                id => id.Value,
                val => JobEventId.From(val));

            b.HasKey(e => e.Id);
            b.Property(e => e.Id)
                .HasConversion(eventIdConverter)
                .HasColumnName("Id")
                .ValueGeneratedNever();

            b.Property(e => e.JobId).IsRequired();
            b.Property(e => e.EventType).HasMaxLength(100).IsRequired();
            b.Property(e => e.Summary).HasMaxLength(1000).IsRequired();
            b.Property(e => e.Source).HasMaxLength(50).IsRequired();
            b.Property(e => e.PayloadJson);
            b.Property(e => e.OccurredAtUtc).IsRequired();
            b.Property(e => e.RecordedAtUtc).IsRequired();

            b.HasIndex(e => e.JobId);
            b.HasIndex(e => new { e.JobId, e.OccurredAtUtc });
        });
    }

    private static void ConfigureJobStageExecution(ModelBuilder mb)
    {
        mb.Entity<JobStageExecution>(b =>
        {
            b.ToTable("JobStageExecutions");

            b.HasKey(s => s.Id);
            b.Property(s => s.Id).ValueGeneratedNever();

            b.Property(s => s.JobId).IsRequired();
            b.Property(s => s.StageDefinitionId).HasMaxLength(200).IsRequired();
            b.Property(s => s.Name).HasMaxLength(500).IsRequired();
            b.Property(s => s.State).HasConversion<int>().IsRequired();
            b.Property(s => s.Outcome).HasMaxLength(200);
            b.Property(s => s.Order).IsRequired();
            b.Property(s => s.IsOptional).IsRequired();
            b.Property(s => s.IsSkipped).IsRequired();
            b.Property(s => s.CurrentIteration).IsRequired();
            b.Property(s => s.MaxIterations).IsRequired();

            b.HasIndex(s => new { s.JobId, s.Order });
        });
    }

    private static void ConfigureJobTaskExecution(ModelBuilder mb)
    {
        mb.Entity<JobTaskExecution>(b =>
        {
            b.ToTable("JobTaskExecutions");

            b.HasKey(t => t.Id);
            b.Property(t => t.Id).ValueGeneratedNever();

            b.Property(t => t.JobId).IsRequired();
            b.Property(t => t.StageExecutionId).IsRequired();
            b.Property(t => t.Title).HasMaxLength(500).IsRequired();
            b.Property(t => t.Description).HasMaxLength(2000);
            b.Property(t => t.State).HasConversion<int>().IsRequired();
            b.Property(t => t.Outcome).HasMaxLength(200);
            b.Property(t => t.Source).HasMaxLength(100).IsRequired();
            b.Property(t => t.TodoAddress).HasMaxLength(500);
            b.Property(t => t.CurrentIteration).IsRequired();
            b.Property(t => t.MaxIterations).IsRequired();

            b.HasIndex(t => new { t.JobId, t.StageExecutionId });
        });
    }

    private static void ConfigureWorkflowDefinition(ModelBuilder mb)
    {
        mb.Entity<WorkflowDefinition>(b =>
        {
            b.ToTable("WorkflowDefinitions");
            b.Ignore(w => w.DomainEvents);

            var wdIdConverter = new ValueConverter<WorkflowDefinitionId, Guid>(
                id => id.Value,
                val => WorkflowDefinitionId.From(val));

            b.HasKey(w => w.Id);
            b.Property(w => w.Id)
                .HasConversion(wdIdConverter)
                .HasColumnName("Id")
                .ValueGeneratedNever();

            b.Property(w => w.Name).HasMaxLength(500).IsRequired();
            b.Property(w => w.Slug).HasMaxLength(200).IsRequired();
            b.Property(w => w.Version).HasMaxLength(50).IsRequired();
            b.Property(w => w.Description).HasMaxLength(2000);
            b.Property(w => w.Category).HasMaxLength(100);
            b.Property(w => w.IsEnabled).IsRequired();
            b.Property(w => w.IsExperimental).IsRequired();
            b.Property(w => w.CreatedAtUtc).IsRequired();

            b.HasIndex(w => w.Slug).IsUnique();
        });
    }

    private static void ConfigureProviderDefinition(ModelBuilder mb)
    {
        mb.Entity<ProviderDefinition>(b =>
        {
            b.ToTable("ProviderDefinitions");
            b.Ignore(p => p.DomainEvents);

            var pdIdConverter = new ValueConverter<ProviderDefinitionId, Guid>(
                id => id.Value,
                val => ProviderDefinitionId.From(val));

            b.HasKey(p => p.Id);
            b.Property(p => p.Id)
                .HasConversion(pdIdConverter)
                .HasColumnName("Id")
                .ValueGeneratedNever();

            b.Property(p => p.ProviderId).HasMaxLength(200).IsRequired();
            b.Property(p => p.Name).HasMaxLength(500).IsRequired();
            b.Property(p => p.Version).HasMaxLength(50).IsRequired();
            b.Property(p => p.DockerImage).HasMaxLength(500).IsRequired();
            b.Property(p => p.Description).HasMaxLength(2000);
            b.Property(p => p.SupportLevel).HasConversion<int>().IsRequired();
            b.Property(p => p.IsEnabled).IsRequired();
            b.Property(p => p.CreatedAtUtc).IsRequired();

            b.HasIndex(p => p.ProviderId).IsUnique();
        });
    }
}
