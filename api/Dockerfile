FROM mcr.microsoft.com/dotnet/sdk:10.0@sha256:fe0fd4e93bd2fbb47c883b7a6369e5c8d3db8bf01cdc5981f6ee35fbdf3ff4fb AS build
WORKDIR /src
COPY global.json ./
COPY api/Directory.Build.props api/Directory.Packages.props api/
COPY api/src/Plate.Api/ api/src/Plate.Api/
RUN dotnet restore api/src/Plate.Api/Plate.Api.csproj --locked-mode \
    && dotnet publish api/src/Plate.Api/Plate.Api.csproj -c Release -o /out --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0@sha256:bfd912c83295ce66d4b706ebb8541b9f14259b0e76fbb88b2751f58ce2399d2e
USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /data/backups \
    && chown -R app:app /data
WORKDIR /app
COPY --from=build --chown=app:app /out ./
USER app
ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    PLATE_DB_PATH=/data/plate.db
EXPOSE 8080
ENTRYPOINT ["dotnet", "Plate.Api.dll"]
