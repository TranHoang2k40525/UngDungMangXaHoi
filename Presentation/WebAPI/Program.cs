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
using Microsoft.OpenApi.Models;
using UngDungMangXaHoi.Application.Interfaces;

var builder = WebApplication.CreateBuilder(args);

// Load .env file vào environment variables (cho Environment.GetEnvironmentVariable)
// TraversePath() sẽ tìm .env từ thư mục hiện tại lên thư mục cha
try
{
    Env.TraversePath().Load();
    Console.WriteLine("Loaded .env file successfully");
}
catch (Exception)
{
    Console.WriteLine("No .env file found, using appsettings.json only");
}

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.AddEndpointsApiExplorer();

// 2. Add Swagger Gen (Đã gộp code của bạn và code bảo mật)
builder.Services.AddSwaggerGen(options =>
{
    // --- Phần của bạn (Giữ nguyên) ---
    // Dùng full name để tránh trùng tên Schema khi có class lồng nhau
    options.CustomSchemaIds(type => (type.FullName ?? type.Name).Replace("+", "."));

    // --- Phần thêm mới: Cấu hình nút Authorize (Ổ khóa) ---
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "UngDungMangXaHoi API", Version = "v1" });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "Vui lòng nhập token (chỉ cần paste chuỗi token, không cần chữ Bearer)",
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        BearerFormat = "JWT",
        Scheme = "Bearer"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] { }
        }
    });
});

// ======================================
// Database Configuration (ƯU TIÊN Environment Variables → appsettings.json)
// ======================================
// ASP.NET Core tự động merge env vars vào Configuration:
// - Env var: ConnectionStrings__DefaultConnection → Configuration["ConnectionStrings:DefaultConnection"]
// - Docker Compose set qua environment, dotnet run dùng appsettings.json
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

if (string.IsNullOrEmpty(connectionString))
{
    throw new InvalidOperationException("Database connection string not found! Check appsettings.json or environment variables.");
}

Console.WriteLine($"[DB CONFIG] Using connection: {connectionString.Substring(0, Math.Min(50, connectionString.Length))}...");

builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlServer(connectionString));

// JWT Authentication - ƯU TIÊN .env, fallback appsettings.json
var jwtAccessSecret = Environment.GetEnvironmentVariable("JWT_ACCESS_SECRET")
    ?? builder.Configuration["JwtSettings:AccessSecret"];

var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER")
    ?? builder.Configuration["JwtSettings:Issuer"];

var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE")
    ?? builder.Configuration["JwtSettings:Audience"];

if (string.IsNullOrEmpty(jwtAccessSecret))
{
    throw new InvalidOperationException("JWT AccessSecret not found! Check appsettings.json or JWT_ACCESS_SECRET env var.");
}

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
                if (!string.IsNullOrEmpty(accessToken) && 
                    (path.StartsWithSegments("/hubs") || path.StartsWithSegments("/hub")))
                {
                    context.Token = accessToken;
                }
                // Nếu không có trong query, thử lấy từ header
                else if (string.IsNullOrEmpty(accessToken))
                {
                    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();
                    if (authHeader != null && authHeader.StartsWith("Bearer "))
                    {
                        context.Token = authHeader.Substring("Bearer ".Length).Trim();
                    }
                }

                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("UserOnly", policy => policy.RequireAssertion(context => context.User.HasClaim(c=>c.Type == "account_type" && (c.Value == "User"  || c.Value == "Business"))));
    options.AddPolicy("BusinessOnly", policy => policy.RequireClaim("account_type", "Business"));
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
builder.Services.AddScoped<IBlockRepository, BlockRepository>();
builder.Services.AddScoped<IConversationRepository, ConversationRepository>();
builder.Services.AddScoped<IMessageRepository, MessageRepository>();
builder.Services.AddScoped<ISearchHistoryRepository, SearchHistoryRepository>();

// Group Chat Repositories
builder.Services.AddScoped<IGroupConversationRepository, GroupConversationRepository>();
builder.Services.AddScoped<IGroupMessageRepository, GroupMessageRepository>(); // ✅ Thêm GroupMessageRepository
builder.Services.AddScoped<IGroupMessageRestrictionRepository, GroupMessageRestrictionRepository>();

// ✅ Content Moderation Repository
builder.Services.AddScoped<IContentModerationRepository>(provider =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    return new ContentModerationRepository(connectionString!);
});

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
builder.Services.AddScoped<IBusinessUpgradeService, BusinessUpgradeService>();
// Application layer services (refactor: register new application services)
builder.Services.AddScoped<UngDungMangXaHoi.Application.Services.PostsService>();
builder.Services.AddScoped<UngDungMangXaHoi.Application.Services.UserService>();
builder.Services.AddScoped<UngDungMangXaHoi.Application.Services.AdminService>();
builder.Services.AddHttpClient<IMoMoPaymentService, MoMoPaymentService>();

// Dịch vụ chạy nền để dọn Story hết hạn
builder.Services.AddHostedService<ExpiredStoriesCleanupService>();
builder.Services.AddScoped<VideoTranscodeService>();
builder.Services.AddScoped<ReactionService>();
builder.Services.AddScoped<ShareService>();
builder.Services.AddScoped<NotificationManagementService>();
builder.Services.AddScoped<CommentService>();
builder.Services.AddScoped<SearchService>();
builder.Services.AddScoped<MessageService>();
builder.Services.AddScoped<UserFollowService>();
builder.Services.AddScoped<BusinessPostInjectionService>();
builder.Services.AddScoped<UserPostPrioritizationService>();
builder.Services.AddScoped<IRealTimeNotificationService, UngDungMangXaHoi.Presentation.WebAPI.Hubs.SignalRNotificationService>();
// Group Chat Services
builder.Services.AddScoped<GroupChatService>();
builder.Services.AddScoped<GroupMessageService>(); //  Message service cho GROUP CHAT
// SignalR Service for broadcasting
builder.Services.AddScoped<UngDungMangXaHoi.WebAPI.Services.ISignalRService, UngDungMangXaHoi.WebAPI.Services.SignalRService>();
// Dich vu cho bash user new
builder.Services.AddScoped<IDashboardRepository, DashBoardRepository>();
// External Services
builder.Services.AddScoped<CloudinaryService>(provider =>
{
    var cloudName = Environment.GetEnvironmentVariable("CLOUDINARY_CLOUD_NAME")
                    ?? builder.Configuration["Cloudinary:CloudName"];
    var apiKey = Environment.GetEnvironmentVariable("CLOUDINARY_API_KEY")
                 ?? builder.Configuration["Cloudinary:ApiKey"];
    var apiSecret = Environment.GetEnvironmentVariable("CLOUDINARY_API_SECRET")
                    ?? builder.Configuration["Cloudinary:ApiSecret"];

    if (string.IsNullOrEmpty(cloudName) || string.IsNullOrEmpty(apiKey) || string.IsNullOrEmpty(apiSecret))
    {
        throw new InvalidOperationException(" Cloudinary config not found! Check appsettings.json or CLOUDINARY_* env vars.");
    }

    Console.WriteLine($"[CLOUDINARY] Using cloud: {cloudName}");

    return new CloudinaryService(cloudName, apiKey, apiSecret);
});

// ✅ PhoBERT Moderation Service
var mlApiUrl = builder.Configuration["MLService:ApiUrl"] ?? "http://127.0.0.1:8000";
Console.WriteLine($"[ML SERVICE] Using API: {mlApiUrl}");

builder.Services.AddHttpClient<IContentModerationService, PhoBertModerationService>()
    .ConfigureHttpClient(client => client.Timeout = TimeSpan.FromSeconds(30))
    .AddTypedClient<IContentModerationService>(client => new PhoBertModerationService(client, mlApiUrl));

// Dang ky dich vu cho MoMo Payment
builder.Services.AddScoped<IMoMoPaymentService, MoMoPaymentService>();
//Quan ly danh cho admin
builder.Services.AddScoped<IDashBoardService, DashBoardService>();
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

        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials(); // Nếu dùng AllowAnyOrigin thì không dùng AllowCredential

    });
});

// ======================================
// Build App
// ======================================
var app = builder.Build();

// ======================================
// 🔹 Auto-migrate database on startup (Development only)
// ======================================
if (app.Environment.IsDevelopment())
{
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        try
        {
            Console.WriteLine("Checking for pending migrations...");
            db.Database.Migrate(); // Tự động tạo/cập nhật bảng nếu thiếu
            Console.WriteLine("Database is up to date!");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
        }
    }
}

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

// Serve uploaded images
var uploadsPath = Path.Combine(builder.Environment.ContentRootPath, "Uploads");
if (!Directory.Exists(uploadsPath))
{
    Directory.CreateDirectory(uploadsPath);
}

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsPath),
    RequestPath = "/uploads",
    ContentTypeProvider = contentTypeProvider,
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers["Cache-Control"] = "public, max-age=604800"; // 7 days
    }
});

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<UngDungMangXaHoi.Presentation.WebAPI.Hubs.NotificationHub>("/hubs/notifications");
app.MapHub<CommentHub>("/hubs/comments");

app.MapHub<MessageHub>("/hubs/messages");

app.MapHub<UngDungMangXaHoi.Presentation.WebAPI.Hubs.GroupChatHub>("/hubs/chat"); // Chat Hub cho Group Chat


app.Run();
