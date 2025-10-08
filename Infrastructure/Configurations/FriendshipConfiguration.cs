using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class FriendshipConfiguration : IEntityTypeConfiguration<Friendship>
    {
        public void Configure(EntityTypeBuilder<Friendship> builder)
        {
            builder.HasKey(f => f.Id);

            builder.Property(f => f.RequesterId)
                .IsRequired();

            builder.Property(f => f.AddresseeId)
                .IsRequired();

            builder.Property(f => f.Status)
                .IsRequired()
                .HasConversion<int>();

            builder.Property(f => f.CreatedAt)
                .IsRequired();

            builder.Property(f => f.UpdatedAt)
                .IsRequired();

            // Indexes
            builder.HasIndex(f => f.RequesterId);
            builder.HasIndex(f => f.AddresseeId);
            builder.HasIndex(f => f.Status);
            builder.HasIndex(f => new { f.RequesterId, f.AddresseeId }).IsUnique();

            // Relationships
            builder.HasOne(f => f.Requester)
                .WithMany(u => u.SentFriendRequests)
                .HasForeignKey(f => f.RequesterId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(f => f.Addressee)
                .WithMany(u => u.ReceivedFriendRequests)
                .HasForeignKey(f => f.AddresseeId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}

