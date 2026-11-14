namespace Plate.Api;

// The data step replaces this with EF Core. An empty list means nothing is pending.
internal interface IPendingMigrations
{
    IReadOnlyList<string> Pending();
}

internal sealed class NoPendingMigrations : IPendingMigrations
{
    public IReadOnlyList<string> Pending() => [];
}
