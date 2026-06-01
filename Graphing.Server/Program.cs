
using Graphing.Server.Data;
using Graphing.Server.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;

namespace Graphing.Server
{
    public class Program
    {
        public static void Main(string[] args)
        {
            Console.WriteLine("Starting Graphing.Server...");

            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container.

            var connectionString = builder.Configuration.GetConnectionString("ApplicationDbContextConnection");
            builder.Services.AddDbContextFactory<ApplicationDbContext>(options => options.UseSqlite(connectionString));

            builder.Services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            }).AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new
                TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = builder.Configuration["Jwt:Issuer"],
                    ValidAudience = builder.Configuration["Jwt:Audience"],
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]))
                };
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var accessToken = context.Request.Query["access_token"];
                        return Task.CompletedTask;
                    }
                };
            });
            builder.Services.AddSwaggerGen(option =>
            {
                option.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    In = ParameterLocation.Header,
                    Description = "Please enter a valid token",
                    Name = "Authorization",
                    Type = SecuritySchemeType.Http,
                    BearerFormat = "JWT",
                    Scheme = "Bearer"
                });
                option.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type=ReferenceType.SecurityScheme,
                                Id="Bearer"
                            }
                        },
                        new string[]{ }
                    }
                });
                option.SwaggerDoc("v1", new OpenApiInfo { Title = "Graphing WebAPI", Version = "v1" });

                //option.ExampleFilters();
            });

            builder.Services.AddAuthorization();
            builder.Services.AddIdentityApiEndpoints<ApplicationUser>().AddRoles<IdentityRole>().AddEntityFrameworkStores<ApplicationDbContext>();

            builder.Services.AddControllers();
            // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
            builder.Services.AddEndpointsApiExplorer();

            var app = builder.Build();

            app.Use(async (context, next) =>
            {
                context.Response.Headers.Add("Cross-Origin-Embedder-Policy", "require-corp");
                context.Response.Headers.Add("Cross-Origin-Opener-Policy", "same-origin");
                await next();
            });

            app.UseDefaultFiles();
            app.UseStaticFiles();

            using (var scope = app.Services.CreateScope())
            {
                var services = scope.ServiceProvider;
                var dbFactory = services.GetRequiredService<IDbContextFactory<ApplicationDbContext>>();
                using var db = dbFactory.CreateDbContext();

                // FIRST: Apply migrations to create tables
                if (app.Environment.IsDevelopment() ||
                    Environment.GetEnvironmentVariable("APPLY_MIGRATIONS")?.ToLower() == "true")
                {
                    Console.WriteLine("Applying database migrations...");
                    db.Database.Migrate();
                    Console.WriteLine("Migrations applied successfully.");
                }

                // SECOND: Seed data based on environment
                var environmentName = app.Environment.EnvironmentName;
                Console.WriteLine($"Current environment: {environmentName}");
                Console.WriteLine("Using PRODUCTION database seeder...");
                SeedData.Initialize(services);
                Console.WriteLine("Database seeding completed.");
            }

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            app.UseHttpsRedirection();

            app.UseAuthentication();
            app.UseAuthorization();


            app.MapControllers();

            app.MapFallbackToFile("/index.html");

            app.Run();
        }
    }
}
