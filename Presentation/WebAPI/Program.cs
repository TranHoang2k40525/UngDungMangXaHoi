using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using DotNetEnv;
using UngDungMangXaHoi.Infrastructure.Persistence;
using UngDungMangXaHoi.Infrastructure.Repositories;
using UngDungMangXaHoi.Infrastructure.Services;
using UngDungMangXaHoi.Infrastructure.ExternalServices;
using UngDungMangXaHoi.Application.Services;
using UngDungMangXaHoi.Application.UseCases.Users;
using UngDungMangXaHoi.Domain.Interfaces;
using System.Text.Json.Serialization; // Thêm namespace này

var builder = WebApplication.CreateBuilder(args);

// Load .env as early as possible
Env.TraversePath().Load();

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()); // Thêm dòng này
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Database configuration
var configuredConn = builder.Configuration.GetConnectionString("DefaultConnection");
var envConn = Environment.GetEnvironmentVariable("DB_HOST");
var sqlServer = Environment.GetEnvironmentVariable("DB_HOST") ?? "localhost";
var sqlPort = Environment.GetEnvironmentVariable("DB_PORT") ?? "1433";
var sqlUser = Environment.GetEnvironmentVariable("DB_USER") ?? "sa";
var sqlPass = Environment.GetEnvironmentVariable("DB_PASSWORD") ?? "123456789";
var sqlDb = Environment.GetEnvironmentVariable("DB_NAME") ?? "ungdungmangxahoiv_2";
var sqlTrust = Environment.GetEnvironmentVariable("SQLSERVER_TRUST_CERT") ?? "true";

var connectionString = !string.IsNullOrWhiteSpace(configuredConn)
    ? configuredConn
    : !string.IsNullOrWhiteSpace(envConn)
        ? envConn
        : $"Server={sqlServer},{sqlPort};Database={sqlDb};User Id={sqlUser};Password={sqlPass};TrustServerCertificate={sqlTrust};";

builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlServer(connectionString));

// JWT Authentication
var jwtAccessSecret = Environment.GetEnvironmentVariable("JWT_ACCESS_SECRET") ?? "kkwefihewofjevwljflwljgjewjwjegljlwflwflew";
var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "UngDungMangXaHoi";
var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? "UngDungMangXaHoi";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtAccessSecret)),
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("UserOnly", policy => policy.RequireClaim("account_type", "User"));
    options.AddPolicy("AdminOnly", policy => policy.RequireClaim("account_type", "Admin"));
});

// Repositories
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IAccountRepository, AccountRepository>();
builder.Services.AddScoped<IOTPRepository, OTPRepository>();
builder.Services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
builder.Services.AddScoped<ILoginHistoryRepository, LoginHistoryRepository>();

// Services
builder.Services.AddScoped<IPasswordHasher, BCryptPasswordHasher>();
builder.Services.AddScoped<ITokenService, AuthService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<INotificationService, EmailService>();

// External Services
builder.Services.AddScoped<CloudinaryService>(provider =>
{
    var config = builder.Configuration.GetSection("Cloudinary");
    return new CloudinaryService(
        config["CloudName"] ?? "",
        config["ApiKey"] ?? "",
        config["ApiSecret"] ?? ""
    );
});

// Đăng ký JwtTokenService
builder.Services.AddScoped<JwtTokenService>();
// Use Cases
builder.Services.AddScoped<RegisterUser>();
builder.Services.AddScoped<LoginUser>();
builder.Services.AddScoped<UpdateProfile>();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// app.UseHttpsRedirection(); // Comment out for development
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();