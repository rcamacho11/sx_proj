using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Plate.Api.Tests;

public sealed class HealthTests : IDisposable
{
    private readonly string _directory = Path.Combine(Path.GetTempPath(), "plate-tests", Guid.NewGuid().ToString("N"));

    public HealthTests()
    {
        Directory.CreateDirectory(_directory);
    }

    public void Dispose()
    {
        if (Directory.Exists(_directory))
        {
            Directory.Delete(_directory, recursive: true);
        }
    }

    [Fact]
    public async Task test_live_returns_200_when_process_is_up()
    {
        using var factory = Create();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/health/live");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task test_ready_returns_db_true_and_grok_false_when_key_and_model_missing()
    {
        using var factory = Create();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/health/ready");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("db").GetBoolean());
        Assert.False(body.GetProperty("grok").GetBoolean());
    }

    [Fact]
    public async Task test_ready_returns_grok_true_when_key_and_model_are_set()
    {
        using var factory = Create(builder =>
        {
            builder.UseSetting("XAI_API_KEY", "test-key");
            builder.UseSetting("GROK_MODEL", "grok-test");
        });
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/health/ready");
        var text = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = JsonSerializer.Deserialize<JsonElement>(text);
        Assert.True(body.GetProperty("db").GetBoolean());
        Assert.True(body.GetProperty("grok").GetBoolean());
        Assert.DoesNotContain("test-key", text, StringComparison.Ordinal);
    }

    [Fact]
    public async Task test_startup_accepts_empty_base_url_when_environment_is_production()
    {
        using var factory = Create(builder => builder.UseEnvironment("Production"));
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/health/ready");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public void test_host_stops_when_sqlite_path_cannot_be_opened()
    {
        var blocked = Path.Combine(_directory, "not-a-directory");
        File.WriteAllText(blocked, "x");
        using var factory = Create(builder =>
        {
            builder.UseSetting("PLATE_DB_PATH", Path.Combine(blocked, "plate.db"));
        });

        var ex = Record.Exception(() => factory.CreateClient());

        Assert.NotNull(ex);
        Assert.Contains("PLATE_DB_PATH", ex.ToString(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task test_ready_returns_503_when_a_migration_is_pending()
    {
        using var factory = Create(builder =>
        {
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IPendingMigrations>();
                services.AddSingleton<IPendingMigrations>(new PendingMigration());
            });
        });
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/health/ready");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(body.GetProperty("db").GetBoolean());
    }

    [Fact]
    public void test_startup_rejects_non_https_base_url_when_environment_is_production()
    {
        using var factory = Create(builder =>
        {
            builder.UseEnvironment("Production");
            builder.UseSetting("XAI_BASE_URL", "http://insecure.example");
        });

        var ex = Record.Exception(() => factory.CreateClient());

        Assert.NotNull(ex);
        Assert.Contains("XAI_BASE_URL", ex.ToString(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task test_request_returns_400_when_host_is_not_allowed()
    {
        using var factory = Create();
        using var client = factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, "/health/live");
        request.Headers.TryAddWithoutValidation("Host", "evil.example");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private WebApplicationFactory<Program> Create(Action<IWebHostBuilder>? configure = null)
    {
        return new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseSetting("PLATE_DB_PATH", Path.Combine(_directory, "plate.db"));
            builder.UseSetting("XAI_API_KEY", "");
            builder.UseSetting("GROK_MODEL", "");
            builder.UseSetting("XAI_BASE_URL", "");
            configure?.Invoke(builder);
        });
    }

    private sealed class PendingMigration : IPendingMigrations
    {
        public IReadOnlyList<string> Pending() => ["001_init"];
    }
}
