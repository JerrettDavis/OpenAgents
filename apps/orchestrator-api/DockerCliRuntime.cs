using System.Diagnostics;
using System.Runtime.CompilerServices;
using Microsoft.Extensions.Options;
using OpenAgents.Domain.Contracts;
using OpenAgents.OrchestratorApi.Options;

namespace OpenAgents.OrchestratorApi.Infrastructure;

/// <summary>
/// Implements <see cref="IContainerRuntime"/> using the host Docker CLI.
///
/// v1 assumptions:
/// - The `docker` executable is available on the PATH (host dev) or in /usr/bin (container).
/// - The orchestrator container has the Docker socket mounted when running in Docker.
/// - On Windows dev, Docker Desktop provides the `docker` CLI.
///
/// Each job gets a named container: openagents-job-{jobId}.
///
/// Security notes:
/// - Arguments are passed via <see cref="ProcessStartInfo.ArgumentList"/> (not a shell
///   command string) to prevent argument-injection attacks.
/// - Environment variable values for keys listed in <see cref="SecretEnvKeys"/> are
///   replaced with [REDACTED] in log output to prevent accidental secret disclosure.
/// </summary>
public sealed class DockerCliRuntime : IContainerRuntime
{
    /// <summary>
    /// Env-var keys whose values must never appear in log output.
    /// Add any new secret keys here as additional providers are onboarded.
    /// </summary>
    private static readonly HashSet<string> SecretEnvKeys =
        new(StringComparer.OrdinalIgnoreCase) { "ANTHROPIC_API_KEY" };

    private readonly ILogger<DockerCliRuntime> _logger;
    private readonly OrchestratorOptions _options;

    public DockerCliRuntime(ILogger<DockerCliRuntime> logger, IOptions<OrchestratorOptions> options)
    {
        _logger  = logger;
        _options = options.Value;
    }

    // ──────────────────────────────────────────────────────────
    // IContainerRuntime
    // ──────────────────────────────────────────────────────────

    public async Task<string> StartContainerAsync(
        ContainerStartRequest request,
        CancellationToken ct = default)
    {
        // Use forward slashes for Docker volume paths even on Windows.
        var hostPath = NormaliseDockerPath(request.WorkspaceHostPath);

        // Build the argument list. Using ArgumentList (not a raw string) means
        // the runtime handles quoting/escaping per-platform; no shell is involved.
        var args = new List<string>
        {
            "run", "-d",
            "--name", request.ContainerName,
            "-v", $"{hostPath}:{request.WorkspaceContainerPath}",
            "--network", _options.Docker.DefaultNetworkName,
        };

        foreach (var kv in request.EnvironmentVariables)
        {
            args.Add("-e");
            args.Add($"{kv.Key}={kv.Value}");
        }

        args.Add(request.Image);

        // Log the command with any secret env-var values replaced by [REDACTED].
        if (_logger.IsEnabled(LogLevel.Information))
            _logger.LogInformation("Starting container: docker {Args}", BuildRedactedArgString(args));

        var (stdout, stderr, exitCode) = await RunDockerAsync(args, ct);

        if (exitCode != 0)
            throw new InvalidOperationException(
                $"docker run failed (exit {exitCode}): {stderr.Trim()}");

        var containerId = stdout.Trim();
        _logger.LogInformation("Container started: {ContainerId}", containerId);
        return containerId;
    }

    public async Task StopContainerAsync(string containerId, CancellationToken ct = default)
    {
        _logger.LogInformation("Stopping container {ContainerId}", containerId);
        var (_, stderr, exitCode) = await RunDockerAsync(["stop", containerId], ct);
        if (exitCode != 0)
            _logger.LogWarning("docker stop exited {Code}: {Err}", exitCode, stderr.Trim());
    }

    public async Task<int> WaitForContainerAsync(string containerId, CancellationToken ct = default)
    {
        _logger.LogInformation("Waiting for container {ContainerId} to exit", containerId);
        var (stdout, _, _) = await RunDockerAsync(["wait", containerId], ct);
        return int.TryParse(stdout.Trim(), out var code) ? code : -1;
    }

    public async IAsyncEnumerable<string> StreamLogsAsync(
        string containerId,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        var psi = BuildDockerProcessInfo(["logs", "--follow", "--timestamps", containerId]);
        using var process = new Process { StartInfo = psi };
        process.Start();

        // Yield stdout; Docker may write to stderr for status lines too
        while (!process.StandardOutput.EndOfStream && !ct.IsCancellationRequested)
        {
            var line = await process.StandardOutput.ReadLineAsync(ct);
            if (line is not null)
                yield return line;
        }

        // Drain stderr (informational)
        while (!process.StandardError.EndOfStream && !ct.IsCancellationRequested)
        {
            var line = await process.StandardError.ReadLineAsync(ct);
            if (line is not null)
                yield return $"[stderr] {line}";
        }

        if (!ct.IsCancellationRequested)
            await process.WaitForExitAsync(ct);
    }

    // ──────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────

    private static async Task<(string Stdout, string Stderr, int ExitCode)> RunDockerAsync(
        IReadOnlyList<string> args,
        CancellationToken ct)
    {
        var psi = BuildDockerProcessInfo(args);
        using var process = new Process { StartInfo = psi };
        process.Start();

        var stdoutTask = process.StandardOutput.ReadToEndAsync(ct);
        var stderrTask = process.StandardError.ReadToEndAsync(ct);
        await process.WaitForExitAsync(ct);

        var stdout = await stdoutTask;
        var stderr = await stderrTask;

        return (stdout, stderr, process.ExitCode);
    }

    /// <summary>
    /// Builds a <see cref="ProcessStartInfo"/> using <c>ArgumentList</c> so that
    /// each argument is passed directly to the OS without going through a shell.
    /// This prevents argument-injection attacks regardless of argument content.
    /// </summary>
    private static ProcessStartInfo BuildDockerProcessInfo(IEnumerable<string> args)
    {
        var psi = new ProcessStartInfo("docker")
        {
            RedirectStandardOutput = true,
            RedirectStandardError  = true,
            UseShellExecute        = false,
            CreateNoWindow         = true,
        };
        foreach (var arg in args)
            psi.ArgumentList.Add(arg);
        return psi;
    }

    /// <summary>
    /// Returns a log-safe representation of the docker argument list.
    /// For any <c>-e KEY=VALUE</c> pair where KEY is in <see cref="SecretEnvKeys"/>,
    /// the value is replaced with <c>[REDACTED]</c>.
    /// </summary>
    private static string BuildRedactedArgString(IReadOnlyList<string> args)
    {
        var parts = new List<string>(args.Count);
        for (var i = 0; i < args.Count; i++)
        {
            // Check if this token is the value half of a "-e KEY=VALUE" pair.
            if (i > 0 && args[i - 1] == "-e")
            {
                var eq = args[i].IndexOf('=');
                if (eq > 0 && SecretEnvKeys.Contains(args[i][..eq]))
                {
                    parts.Add($"{args[i][..eq]}=[REDACTED]");
                    continue;
                }
            }
            parts.Add(args[i]);
        }
        return string.Join(" ", parts);
    }

    /// <summary>
    /// On Windows, Docker Desktop accepts Windows paths as-is for bind mounts,
    /// but also accepts /c/... style. We normalise to forward slashes.
    /// </summary>
    private static string NormaliseDockerPath(string path)
    {
        if (!OperatingSystem.IsWindows()) return path;
        // Convert C:\foo\bar → /c/foo/bar
        if (path.Length >= 2 && path[1] == ':')
        {
            var drive = char.ToLowerInvariant(path[0]);
            var rest = path[2..].Replace('\\', '/');
            return $"/{drive}{rest}";
        }
        return path.Replace('\\', '/');
    }
}
