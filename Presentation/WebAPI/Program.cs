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

var builder = WebApplication.CreateBuilder(args);

// ======================================
// 1️⃣ Load biến môi trường từ file .env
// ======================================
Env.TraversePath().Load();

// ======================================
// 2️⃣ Add Controllers & Swagger
// ======================================
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Serialize Enum dạng string thay vì số
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.CustomSchemaIds(type => (type.FullName ?? type.Name).Replace("+", "."));
});

// ======================================
// 3️⃣ Database Configuration (ưu tiên .env)
// ======================================
var sqlServer = Environment.GetEnvironmentVariable("DB_HOST") ?? "localhost";
var sqlPort = Environment.GetEnvironmentVariable("DB_PORT") ?? "1433";
var sqlUser = Environment.GetEnvironmentVariable("DB_USER") ?? "sa";
var sqlPass = Environment.GetEnvironmentVariable("DB_PASSWORD") ?? "123456789";
var sqlDb = Environment.GetEnvironmentVariable("DB_NAME") ?? "ungdungmangxahoiv_2";
var sqlTrust = Environment.GetEnvironmentVariable("SQLSERVER_TRUST_CERT") ?? "true";

var connectionString =
    $"Server={sqlServer},{sqlPort};Database={sqlDb};User Id={sqlUser};Password={sqlPass};TrustServerCertificate={sqlTrust};";

Console.WriteLine($"[DB CONFIG] ✅ Server: {sqlServer}:{sqlPort}, Database: {sqlDb}");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));

// ======================================
// 4️⃣ JWT Authentication Configuration
// ======================================
var jwtAccessSecret =
    Environment.GetEnvironmentVariable("JWT_ACCESS_SECRET") ??
    builder.Configuration["JwtSettings:AccessSecret"] ??
    "kkwefihewofjevwljflwljgjewjwjegljlwflwflew";

var jwtIssuer =
    Environment.GetEnvironmentVariable("JWT_ISSUER") ??
    builder.Configuration["JwtSettings:Issuer"] ??
    "UngDungMangXaHoi";

var jwtAudience =
    Environment.GetEnvironmentVariable("JWT_AUDIENCE") ??
    builder.Configuration["JwtSettings:Audience"] ??
    "UngDungMangXaHoi";

Console.WriteLine($"[JWT AUTH] ✅ AccessSecret length: {jwtAccessSecret.Length}");
Console.WriteLine($"[JWT AUTH] ✅ Issuer: {jwtIssuer}, Audience: {jwtAudience}");

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

// ======================================
// 5️⃣ Đăng ký Repository
// ======================================
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IAccountRepository, AccountRepository>();
builder.Services.AddScoped<IAdminRepository, AdminRepository>();
builder.Services.AddScoped<IOTPRepository, OTPRepository>();
builder.Services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
builder.Services.AddScoped<ILoginHistoryRepository, LoginHistoryRepository>();
builder.Services.AddScoped<IPostRepository, PostRepository>();
builder.Services.AddScoped<IStoryRepository, StoryRepository>();

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

// ======================================
// 7️⃣ Cloudinary Service (ưu tiên .env)
// ======================================
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
// 8️⃣ Use Case Layer
// ======================================
builder.Services.AddScoped<RegisterUser>();
builder.Services.AddScoped<LoginUser>();
builder.Services.AddScoped<UpdateProfile>();

// ======================================
// 9️⃣ CORS
// ======================================
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// ======================================
// 🔟 Build App
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

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(assetsPath),
    RequestPath = "/Assets"
});

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
