## Dev-only Dockerfile for UngDungMangXaHoi WebAPI
## Purpose: run the WebAPI in a development container with hot-reload (dotnet watch).

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS dev
WORKDIR /src

# Copy solution and project files first to leverage Docker layer caching for NuGet restore
COPY UngDungMangXaHoi.sln ./
COPY Application/*.csproj Application/
COPY Domain/*.csproj Domain/
COPY Infrastructure/*.csproj Infrastructure/
COPY Presentation/WebAPI/*.csproj Presentation/WebAPI/

WORKDIR /src/Presentation/WebAPI
RUN dotnet restore "UngDungMangXaHoi.WebAPI.csproj"

# Copy full source for watch/run
WORKDIR /src
COPY . .
WORKDIR /src/Presentation/WebAPI

# Dev-specific environment
ENV ASPNETCORE_URLS=http://+:5297
ENV ASPNETCORE_ENVIRONMENT=Development
# Use polling watcher to be compatible with mounted volumes on Windows/WSL/Docker Desktop
ENV DOTNET_USE_POLLING_FILE_WATCHER=1
EXPOSE 5297

# Start the dev server with hot-reload. Intended to be run with the repo mounted as a volume
CMD ["dotnet", "watch", "run", "--project", "UngDungMangXaHoi.WebAPI.csproj", "--urls", "http://+:5297"]
