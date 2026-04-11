using Microsoft.Extensions.FileProviders;

namespace OpenAgents.OrchestratorApi.Tests;

internal sealed class TestHostEnvironment : Microsoft.Extensions.Hosting.IHostEnvironment
{
    public string EnvironmentName { get; set; } = "Development";
    public string ApplicationName { get; set; } = typeof(Program).Assembly.GetName().Name ?? "OpenAgents.OrchestratorApi";
    public string ContentRootPath { get; set; } = ResolveProjectContentRoot();
    public IFileProvider ContentRootFileProvider { get; set; }

    public TestHostEnvironment()
    {
        ContentRootFileProvider = new PhysicalFileProvider(ContentRootPath);
    }

    private static string ResolveProjectContentRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            if (dir.GetFiles("OpenAgents.OrchestratorApi.csproj").Length > 0)
                return dir.FullName;
            dir = dir.Parent;
        }

        throw new DirectoryNotFoundException("Unable to resolve orchestrator-api project root for tests.");
    }
}
