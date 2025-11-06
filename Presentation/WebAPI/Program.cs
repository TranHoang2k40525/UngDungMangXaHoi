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
using Microsoft.Extensions.FileProviders;
using UngDungMangXaHoi.Presentation.WebAPI.Hubs;

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
builder.Services.AddSwaggerGen(options =>
{
    // Use full type name (replace '+' from nested types) to generate unique schema ids
    options.CustomSchemaIds(type => (type.FullName ?? type.Name).Replace("+", "."));
});

// Database configuration - ƯU TIÊN appsettings.json, fallback .env
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

// Chỉ dùng env vars nếu connection string không có trong appsettings.json
if (string.IsNullOrEmpty(connectionString))
{
    var sqlServer = Environment.GetEnvironmentVariable("DB_HOST") ?? "localhost";
    var sqlPort = Environment.GetEnvironmentVariable("DB_PORT") ?? "1433";
    var sqlUser = Environment.GetEnvironmentVariable("DB_USER") ?? "sa";
    var sqlPass = Environment.GetEnvironmentVariable("DB_PASSWORD") ?? "123456789";
    var sqlDb = Environment.GetEnvironmentVariable("DB_NAME") ?? "ungdungmangxahoiv_2";
    var sqlTrust = Environment.GetEnvironmentVariable("SQLSERVER_TRUST_CERT") ?? "true";
    connectionString = $"Server={sqlServer},{sqlPort};Database={sqlDb};User Id={sqlUser};Password={sqlPass};TrustServerCertificate={sqlTrust};";
    Console.WriteLine($"[DB CONFIG] Using ENV: Server: {sqlServer}:{sqlPort}, Database: {sqlDb}");
}
else
{
    Console.WriteLine($"[DB CONFIG] Using appsettings.json: {connectionString}");
}

builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlServer(connectionString));

// JWT Authentication - ƯU TIÊN .env, fallback appsettings.json
var jwtAccessSecret = Environment.GetEnvironmentVariable("JWT_ACCESS_SECRET") 
    ?? builder.Configuration["JwtSettings:AccessSecret"] 
    ?? "kkwefihewofjevwljflwljgjewjwjegljlwflwflew";
    
var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") 
    ?? builder.Configuration["JwtSettings:Issuer"] 
    ?? "UngDungMangXaHoi";
    
var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") 
    ?? builder.Configuration["JwtSettings:Audience"] 
    ?? "UngDungMangXaHoi";

Console.WriteLine($"[JWT AUTH] AccessSecret length: {jwtAccessSecret.Length}");
Console.WriteLine($"[JWT AUTH] Issuer: {jwtIssuer}, Audience: {jwtAudience}");

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
builder.Services.AddScoped<IAdminRepository, AdminRepository>();
builder.Services.AddScoped<IOTPRepository, OTPRepository>();
builder.Services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
builder.Services.AddScoped<ILoginHistoryRepository, LoginHistoryRepository>();
builder.Services.AddScoped<IPostRepository, PostRepository>();
builder.Services.AddScoped<IReactionRepository, ReactionRepository>();
builder.Services.AddScoped<IShareRepository, ShareRepository>();
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
builder.Services.AddScoped<ICommentRepository, CommentRepository>();

// Services
builder.Services.AddScoped<IPasswordHasher, BCryptPasswordHasher>();
builder.Services.AddScoped<ITokenService, AuthService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<INotificationService, EmailService>();
builder.Services.AddScoped<UserProfileService>();
builder.Services.AddScoped<VideoTranscodeService>();
builder.Services.AddScoped<ReactionService>();
builder.Services.AddScoped<ShareService>();
builder.Services.AddScoped<NotificationManagementService>();
builder.Services.AddScoped<CommentService>();
builder.Services.AddScoped<IRealTimeNotificationService, UngDungMangXaHoi.Presentation.WebAPI.Hubs.SignalRNotificationService>();

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

// SignalR
builder.Services.AddSignalR();

// CORS - Cập nhật để hỗ trợ SignalR
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://localhost:5173") // Thêm origin của frontend
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials(); // Quan trọng cho SignalR
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
// Serve static files from Assets folder (Images, Videos) with Range support and proper content types
var assetsPath = Path.Combine(Directory.GetCurrentDirectory(), "Assets");
if (!Directory.Exists(assetsPath))
{
    Directory.CreateDirectory(assetsPath);
}
var contentTypeProvider = new Microsoft.AspNetCore.StaticFiles.FileExtensionContentTypeProvider();
// Ensure common video types are mapped
contentTypeProvider.Mappings[".mp4"] = "video/mp4";
contentTypeProvider.Mappings[".m4v"] = "video/mp4";
contentTypeProvider.Mappings[".mov"] = "video/quicktime";
contentTypeProvider.Mappings[".webm"] = "video/webm";
contentTypeProvider.Mappings[".mkv"] = "video/x-matroska";

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(assetsPath),
    RequestPath = "/Assets",
    ContentTypeProvider = contentTypeProvider,
    ServeUnknownFileTypes = true,
    OnPrepareResponse = ctx =>
    {
        // Add Accept-Ranges and Cache-Control for smoother playback
        ctx.Context.Response.Headers["Accept-Ranges"] = "bytes";
        if (!ctx.Context.Response.Headers.ContainsKey("Cache-Control"))
        {
            ctx.Context.Response.Headers["Cache-Control"] = "public, max-age=31536000, immutable";
        }
    }
});
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<UngDungMangXaHoi.Presentation.WebAPI.Hubs.NotificationHub>("/hubs/notifications");
app.MapHub<CommentHub>("/hubs/comments");

app.Run();