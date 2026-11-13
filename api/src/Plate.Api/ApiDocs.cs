using Microsoft.OpenApi;

namespace Plate.Api;

internal static class ApiDocs
{
    public const string Flag = "PLATE_API_DOCS";

    public static bool IsEnabled(IHostEnvironment environment, IConfiguration configuration) =>
        environment.IsDevelopment()
        && string.Equals(configuration[Flag], "true", StringComparison.Ordinal);

    public static void Add(WebApplicationBuilder builder)
    {
        if (!IsEnabled(builder.Environment, builder.Configuration))
        {
            return;
        }

        builder.Services.AddOpenApi(options =>
        {
            options.AddDocumentTransformer((document, _, _) =>
            {
                document.Info = new OpenApiInfo
                {
                    Title = "Plate",
                    Version = "v1",
                    Description = "Development document for the Plate API. The production server does not serve this document.",
                };
                return Task.CompletedTask;
            });
        });
    }

    public static void Map(WebApplication app)
    {
        if (!IsEnabled(app.Environment, app.Configuration))
        {
            return;
        }

        app.Logger.LogInformation("API docs enabled at /docs");
        app.MapOpenApi();
        app.UseSwaggerUI(options =>
        {
            options.RoutePrefix = "docs";
            options.SwaggerEndpoint("/openapi/v1.json", "Plate");
            options.DocumentTitle = "Plate API";
        });
    }
}
