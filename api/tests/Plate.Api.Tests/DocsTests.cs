using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Plate.Api.Tests;

public sealed class DocsTests : IDisposable
{
    private readonly string _directory = Path.Combine(Path.GetTempPath(), "plate-tests", Guid.NewGuid().ToString("N"));

    public DocsTests()
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
    public async Task test_docs_return_404_when_environment_is_production()
    {
        using var factory = Create(builder => builder.UseEnvironment("Production"));
        using var client = factory.CreateClient();

        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/docs")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/openapi/v1.json")).StatusCode);
    }

    [Fact]
    public async Task test_docs_return_404_when_production_sets_the_docs_flag()
    {
        using var factory = Create(builder =>
        {
            builder.UseEnvironment("Production");
            builder.UseSetting(ApiDocs.Flag, "true");
        });
        using var client = factory.CreateClient();

        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/docs")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/openapi/v1.json")).StatusCode);
    }

    [Fact]
    public async Task test_docs_return_404_when_development_omits_the_docs_flag()
    {
        using var factory = Create(builder => builder.UseEnvironment("Development"));
        using var client = factory.CreateClient();

        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/docs")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/openapi/v1.json")).StatusCode);
    }

    [Fact]
    public async Task test_docs_return_swagger_ui_when_development_sets_the_docs_flag()
    {
        using var factory = Create(builder =>
        {
            builder.UseEnvironment("Development");
            builder.UseSetting(ApiDocs.Flag, "true");
            builder.UseSetting("XAI_API_KEY", "test-key");
        });
        using var client = factory.CreateClient();

        var ui = await client.GetAsync("/docs");
        var uiText = await ui.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, ui.StatusCode);
        Assert.Contains("swagger", uiText, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("test-key", uiText, StringComparison.Ordinal);

        var document = await client.GetAsync("/openapi/v1.json");
        var documentText = await document.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, document.StatusCode);
        Assert.Contains("/health/ready", documentText, StringComparison.Ordinal);
        Assert.DoesNotContain("test-key", documentText, StringComparison.Ordinal);
        var json = JsonSerializer.Deserialize<JsonElement>(documentText);
        Assert.Equal("Plate", json.GetProperty("info").GetProperty("title").GetString());
    }

    private WebApplicationFactory<Program> Create(Action<IWebHostBuilder>? configure = null)
    {
        return new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseSetting("PLATE_DB_PATH", Path.Combine(_directory, "plate.db"));
            builder.UseSetting("XAI_API_KEY", "");
            builder.UseSetting("GROK_MODEL", "");
            builder.UseSetting("XAI_BASE_URL", "");
            builder.UseSetting(ApiDocs.Flag, "false");
            configure?.Invoke(builder);
        });
    }
}
