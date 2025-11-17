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
using UngDungMangXaHoi.WebAPI.Services;
using UngDungMangXaHoi.Application.UseCases.Users;
using UngDungMangXaHoi.Domain.Interfaces;
using System.Text.Json.Serialization;
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

// ======================================
// Database Configuration (ưu tiên appsettings.json, fallback .env)
// ======================================
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
        
        // Cấu hình cho SignalR - lấy token từ query string
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                
                // Nếu request đến SignalR hub và có token trong query
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }
                
                return Task.CompletedTask;
            }
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
builder.Services.AddScoped<IStoryRepository, StoryRepository>();
builder.Services.AddScoped<IReactionRepository, ReactionRepository>();
builder.Services.AddScoped<IShareRepository, ShareRepository>();
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
builder.Services.AddScoped<ICommentRepository, CommentRepository>();
// Group Chat Repositories
builder.Services.AddScoped<IGroupConversationRepository, GroupConversationRepository>();
builder.Services.AddScoped<IGroupMessageRepository, GroupMessageRepository>(); // ✅ Thêm GroupMessageRepository
builder.Services.AddScoped<IBlockRepository, BlockRepository>();
builder.Services.AddScoped<IGroupMessageRestrictionRepository, GroupMessageRestrictionRepository>();

// ======================================
// 6️⃣ Đăng ký Service
// ======================================
builder.Services.AddScoped<StoryService>();
builder.Services.AddScoped<IPasswordHasher, BCryptPasswordHasher>();
builder.Services.AddScoped<ITokenService, AuthService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<INotificationService, EmailService>();
builder.Services.AddScoped<UserProfileService>();
builder.Services.AddScoped<JwtTokenService>();

// Dịch vụ chạy nền để dọn Story hết hạn
builder.Services.AddHostedService<ExpiredStoriesCleanupService>();
builder.Services.AddScoped<VideoTranscodeService>();
builder.Services.AddScoped<ReactionService>();
builder.Services.AddScoped<ShareService>();
builder.Services.AddScoped<NotificationManagementService>();
builder.Services.AddScoped<CommentService>();
builder.Services.AddScoped<IRealTimeNotificationService, UngDungMangXaHoi.Presentation.WebAPI.Hubs.SignalRNotificationService>();
// Group Chat Services
builder.Services.AddScoped<GroupChatService>();
builder.Services.AddScoped<GroupMessageService>(); // ✅ Message service cho GROUP CHAT
// SignalR Service for broadcasting
builder.Services.AddScoped<UngDungMangXaHoi.WebAPI.Services.ISignalRService, UngDungMangXaHoi.WebAPI.Services.SignalRService>();

// External Services
builder.Services.AddScoped<CloudinaryService>(provider =>
{
    var cloudName = Environment.GetEnvironmentVariable("CLOUDINARY_CLOUD_NAME")
                    ?? builder.Configuration["Cloudinary:CloudName"]
                    ?? "";
    var apiKey = Environment.GetEnvironmentVariable("CLOUDINARY_API_KEY")
                 ?? builder.Configuration["Cloudinary:ApiKey"]
                 ?? "";
    var apiSecret = Environment.GetEnvironmentVariable("CLOUDINARY_API_SECRET")
                    ?? builder.Configuration["Cloudinary:ApiSecret"]
                    ?? "";

    Console.WriteLine($"[CLOUDINARY] ✅ Using cloud: {cloudName}");

    return new CloudinaryService(cloudName, apiKey, apiSecret);
});

// ======================================
//  Use Case Layer
// ======================================
builder.Services.AddScoped<RegisterUser>();
builder.Services.AddScoped<LoginUser>();
builder.Services.AddScoped<UpdateProfile>();

// ======================================
// CORS
// ======================================
// SignalR
builder.Services.AddSignalR();

// CORS - Cập nhật để hỗ trợ SignalR
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.WithOrigins(
                "http://localhost:3000", 
                "http://localhost:5173"
            )
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials(); // Quan trọng cho SignalR
    });
});

// ======================================
// Build App
// ======================================
var app = builder.Build();

// ======================================
// 🔹 Middleware Pipeline
// ======================================
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// app.UseHttpsRedirection(); // Bỏ qua trong dev

app.UseCors("AllowAll");

// Serve thư mục Assets (ảnh/video upload)
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
app.MapHub<UngDungMangXaHoi.Presentation.WebAPI.Hubs.GroupChatHub>("/hubs/chat"); // Chat Hub cho Group Chat

app.Run();
