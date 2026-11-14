using Microsoft.Extensions.Options;

namespace Plate.Api;

internal sealed class PlateOptionsValidator(IHostEnvironment environment) : IValidateOptions<PlateOptions>
{
    public ValidateOptionsResult Validate(string? name, PlateOptions options)
    {
        var url = string.IsNullOrWhiteSpace(options.BaseUrl)
            ? "https://api.x.ai/v1"
            : options.BaseUrl.Trim();

        var https = Uri.TryCreate(url, UriKind.Absolute, out var uri) && uri.Scheme == Uri.UriSchemeHttps;
        var relaxed = environment.IsDevelopment() || environment.IsEnvironment("Test");
        if (!https && !relaxed)
        {
            return ValidateOptionsResult.Fail(
                "XAI_BASE_URL must be an absolute https URL outside Development and Test.");
        }

        if (!Uri.TryCreate(url, UriKind.Absolute, out _))
        {
            return ValidateOptionsResult.Fail("XAI_BASE_URL must be an absolute URL.");
        }

        return ValidateOptionsResult.Success;
    }
}
