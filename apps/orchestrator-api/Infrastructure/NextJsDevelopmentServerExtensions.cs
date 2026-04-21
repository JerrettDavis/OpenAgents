using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using Microsoft.AspNetCore.SpaServices;

namespace OpenAgents.OrchestratorApi.Infrastructure;

/// <summary>
/// Extension methods for launching a Next.js dev server and proxying to it.
/// </summary>
public static class NextJsDevelopmentServerExtensions
{
    /// <summary>
    /// Launches 'pnpm dev' (or specified command) in the SPA source directory
    /// and proxies non-API requests to it once ready.
    /// </summary>
    public static void UseNextJsDevelopmentServer(
        this ISpaBuilder spaBuilder,
        string npmScript = "dev",
        int port = 3000,
        string packageManager = "pnpm")
    {
        var sourcePath = spaBuilder.Options.SourcePath
            ?? throw new InvalidOperationException("SPA SourcePath must be set before calling UseNextJsDevelopmentServer.");

        var devServerTask = StartNextJsDevServerAsync(sourcePath, npmScript, port, packageManager);
        spaBuilder.UseProxyToSpaDevelopmentServer(() => devServerTask);
    }

    private static async Task<Uri> StartNextJsDevServerAsync(
        string sourcePath,
        string npmScript,
        int port,
        string packageManager)
    {
        var uri = new Uri($"http://localhost:{port}");

        // Check if something is already running on the port
        if (await IsPortInUse(port))
        {
            // Dev server already running — just proxy to it
            return uri;
        }

        // Determine the command to run
        var (fileName, arguments) = GetCommand(packageManager, npmScript, port);

        var processInfo = new ProcessStartInfo
        {
            FileName = fileName,
            Arguments = arguments,
            WorkingDirectory = sourcePath,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
            Environment =
            {
                ["PORT"] = port.ToString(),
                ["BROWSER"] = "none",
                ["NEXT_OPEN_BROWSER"] = "false",
                ["OPEN_BROWSER"] = "false"
            }
        };

        var process = Process.Start(processInfo)
            ?? throw new InvalidOperationException($"Failed to start {packageManager} {npmScript}");

        // Wait for the Next.js server to be ready by polling the port
        var timeout = TimeSpan.FromSeconds(60);
        var stopwatch = Stopwatch.StartNew();

        while (stopwatch.Elapsed < timeout)
        {
            if (process.HasExited)
            {
                var stderr = await process.StandardError.ReadToEndAsync();
                throw new InvalidOperationException(
                    $"Next.js dev server exited prematurely with code {process.ExitCode}. Stderr: {stderr}");
            }

            if (await IsPortInUse(port))
                return uri;

            await Task.Delay(500);
        }

        throw new TimeoutException(
            $"Next.js dev server did not start within {timeout.TotalSeconds}s. " +
            $"Check that '{packageManager} run {npmScript}' works in {sourcePath}");
    }

    private static async Task<bool> IsPortInUse(int port)
    {
        try
        {
            using var client = new TcpClient();
            await client.ConnectAsync(IPAddress.Loopback, port);
            return true;
        }
        catch (SocketException)
        {
            return false;
        }
    }

    private static (string FileName, string Arguments) GetCommand(string packageManager, string script, int port)
    {
        // Next.js accepts --port directly: `next dev --port 3000`
        // pnpm/npm pass args after -- to the script: `pnpm run dev --port 3000`
        // (pnpm does NOT need the extra --, unlike npm)
        if (OperatingSystem.IsWindows())
            return ("cmd.exe", $"/c {packageManager} run {script} --port {port}");

        return (packageManager, $"run {script} --port {port}");
    }
}
