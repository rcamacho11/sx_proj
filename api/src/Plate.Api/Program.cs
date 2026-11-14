using System.Diagnostics;
using Microsoft.AspNetCore.HostFiltering;
using Microsoft.Extensions.Options;
using Plate.Api;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddJsonConsole(options =>
{
    options.IncludeScopes = true;
});

var logLevel = builder.Configuration["LOG_LEVEL"];
if (!string.IsNullOrWhiteSpace(logLevel) && Enum.TryParse<LogLevel>(logLevel, ignoreCase: true, out var parsedLevel))
{
    builder.Logging.SetMinimumLevel(parsedLevel);
}

builder.Services.PostConfigure<HostFilteringOptions>(options =>
{
    options.AllowedHosts = ["localhost", "127.0.0.1"];
});

builder.Services.AddSingleton<IValidateOptions<PlateOptions>, PlateOptionsValidator>();
builder.Services.AddOptions<PlateOptions>()
    .Configure<IConfiguration>((options, config) =>
    {
        options.ApiKey = config["XAI_API_KEY"] ?? "";
        options.Model = config["GROK_MODEL"] ?? "";
        options.BaseUrl = config["XAI_BASE_URL"] ?? "";
        options.DbPath = string.IsNullOrWhiteSpace(config["PLATE_DB_PATH"])
            ? "/data/plate.db"
            : config["PLATE_DB_PATH"]!;
    })
    .ValidateOnStart();
builder.Services.AddSingleton<IPendingMigrations, NoPendingMigrations>();
ApiDocs.Add(builder);

var app = builder.Build();

var plate = app.Services.GetRequiredService<IOptions<PlateOptions>>().Value;
app.Logger.LogInformation(string.IsNullOrWhiteSpace(plate.ApiKey) ? "xAI key missing" : "xAI key present");

try
{
    SqliteDatabase.OpenAndCheck(plate.DbPath);
}
catch (Exception ex)
{
    app.Logger.LogError("PLATE_DB_PATH check failed. {Message}", ex.Message);
    throw;
}

app.Use(async (context, next) =>
{
    var requestId = context.Request.Headers["X-Request-Id"].ToString();
    if (string.IsNullOrWhiteSpace(requestId))
    {
        requestId = Guid.NewGuid().ToString("N");
    }

    context.Response.Headers["X-Request-Id"] = requestId;
    var logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("Plate.Request");
    using (logger.BeginScope(new Dictionary<string, object> { ["requestId"] = requestId }))
    {
        var start = Stopwatch.GetTimestamp();
        await next().ConfigureAwait(false);
        var elapsedMs = Stopwatch.GetElapsedTime(start).TotalMilliseconds;
        var route = (context.GetEndpoint() as RouteEndpoint)?.RoutePattern.RawText ?? context.Request.Path.Value;
        logger.LogInformation(
            "request {Method} {Route} {Status} {DurationMs}",
            context.Request.Method,
            route,
            context.Response.StatusCode,
            elapsedMs);
    }
});

ApiDocs.Map(app);

app.MapGet("/health/live", () => Results.Ok())
    .WithName("GetLive")
    .WithTags("Health")
    .WithSummary("Process is up.");
app.MapGet("/health/ready", (IOptions<PlateOptions> options, IPendingMigrations migrations, ILogger<Program> logger) =>
{
    var grok = options.Value.GrokConfigured;
    try
    {
        SqliteDatabase.OpenAndCheck(options.Value.DbPath);
    }
    catch (Exception ex)
    {
        logger.LogError("PLATE_DB_PATH check failed. {Message}", ex.Message);
        return Results.Json(new ReadyResponse(false, grok), statusCode: StatusCodes.Status503ServiceUnavailable);
    }

    if (migrations.Pending().Count > 0)
    {
        return Results.Json(new ReadyResponse(false, grok), statusCode: StatusCodes.Status503ServiceUnavailable);
    }

    return Results.Ok(new ReadyResponse(true, grok));
})
    .WithName("GetReady")
    .WithTags("Health")
    .WithSummary("SQLite is open and no migration is pending. grok is true only when the key and the model are both set.");

app.Run();

internal sealed record ReadyResponse(bool Db, bool Grok);

public partial class Program;
