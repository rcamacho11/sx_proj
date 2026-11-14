namespace Plate.Api;

internal sealed class PlateOptions
{
    public string ApiKey { get; set; } = "";

    public string Model { get; set; } = "";

    public string BaseUrl { get; set; } = "";

    public string DbPath { get; set; } = "/data/plate.db";

    public bool GrokConfigured =>
        !string.IsNullOrWhiteSpace(ApiKey) && !string.IsNullOrWhiteSpace(Model);
}
