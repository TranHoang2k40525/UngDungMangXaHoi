using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using UngDungMangXaHoi.Infrastructure.Persistence;
using UngDungMangXaHoi.Infrastructure.Repositories;
using UngDungMangXaHoi.Infrastructure.ExternalServices;
using UngDungMangXaHoi.Application.Services;
using UngDungMangXaHoi.Infrastructure.Services;
using UngDungMangXaHoi.Application.UseCases.Users;
using UngDungMangXaHoi.Application.UseCases.Posts;
using UngDungMangXaHoi.Application.UseCases.Comments;
using UngDungMangXaHoi.Domain.Interfaces;
using DotNetEnv;

var builder = WebApplication.CreateBuilder(args);

// Load .env as early as possible
Env.TraversePath().Load();

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Database: prefer appsettings ConnectionStrings:DefaultConnection, then env override, then composed
var configuredConn = builder.Configuration.GetConnectionString("DefaultConnection");
var envConn = Environment.GetEnvironmentVariable("CONNECTION_STRING");
var sqlServer = Environment.GetEnvironmentVariable("SQLSERVER_HOST") ?? "MSI";
var sqlUser = Environment.GetEnvironmentVariable("SQLSERVER_USER") ?? "sa";
var sqlPass = Environment.GetEnvironmentVariable("SQLSERVER_PASSWORD") ?? "";
var sqlDb = Environment.GetEnvironmentVariable("SQLSERVER_DATABASE") ?? "ungdungmangxahoi";
var sqlTrust = Environment.GetEnvironmentVariable("SQLSERVER_TRUST_CERT") ?? "true";

var connectionString = !string.IsNullOrWhiteSpace(configuredConn)
    ? configuredConn
    : !string.IsNullOrWhiteSpace(envConn)
        ? envConn
        : $"Server={sqlServer};Database={sqlDb};User Id={sqlUser};Password={sqlPass};TrustServerCertificate={sqlTrust};";

builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlServer(connectionString));

// JWT Authentication (support both Jwt and JwtSettings sections)
var jwtSection = builder.Configuration.GetSection("Jwt");
if (!jwtSection.Exists())
{
    jwtSection = builder.Configuration.GetSection("JwtSettings");
}
var secretKey = Environment.GetEnvironmentVariable("JWT_SECRET")
                 ?? jwtSection["Key"]
                 ?? jwtSection["SecretKey"]
                 ?? "YourSuperSecretKeyThatIsAtLeast32CharactersLong!";
var issuer = Environment.GetEnvironmentVariable("JWT_ISSUER")
             ?? jwtSection["Issuer"]
             ?? "UngDungMangXaHoi";
var audience = Environment.GetEnvironmentVariable("JWT_AUDIENCE")
               ?? jwtSection["Audience"]
               ?? "UngDungMangXaHoi";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(secretKey)),
            ValidateIssuer = true,
            ValidIssuer = issuer,
            ValidateAudience = true,
            ValidAudience = audience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

// Repositories
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IPostRepository, PostRepository>();
builder.Services.AddScoped<ICommentRepository, CommentRepository>();
builder.Services.AddScoped<IFriendshipRepository, FriendshipRepository>();

// Services
builder.Services.AddScoped<IPasswordHasher, BCryptPasswordHasher>();
builder.Services.AddScoped<ITokenService>(provider => 
    new AuthService(secretKey, issuer, audience));
builder.Services.AddScoped<INotificationService, NotificationService>();

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

// Use Cases
builder.Services.AddScoped<RegisterUser>();
builder.Services.AddScoped<LoginUser>();
builder.Services.AddScoped<UpdateProfile>();
builder.Services.AddScoped<CreatePost>();
builder.Services.AddScoped<GetFeed>();
builder.Services.AddScoped<DeletePost>();
builder.Services.AddScoped<AddComment>();
builder.Services.AddScoped<DeleteComment>();

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

app.UseHttpsRedirection();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Do not auto-create/migrate here to avoid altering existing schema

app.Run();
