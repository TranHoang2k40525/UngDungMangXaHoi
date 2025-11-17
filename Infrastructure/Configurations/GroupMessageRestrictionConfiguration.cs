using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Infrastructure.Configurations
{
    public class GroupMessageRestrictionConfiguration : IEntityTypeConfiguration<GroupMessageRestriction>
    {
     public void Configure(EntityTypeBuilder<GroupMessageRestriction> builder)
     {
         builder.ToTable("MessageRestrictions");
         builder.HasKey(mr => mr.restriction_id);
            
         builder.Property(mr => mr.restricted_user_id).IsRequired();
         builder.Property(mr => mr.restricting_user_id).IsRequired();
         builder.Property(mr => mr.created_at).HasColumnType("datetime");
            
         // Unique constraint
         builder.HasIndex(mr => new { mr.restricting_user_id, mr.restricted_user_id })
             .IsUnique();
            
         // Relationships
         builder.HasOne(mr => mr.RestrictedUser)
             .WithMany()
             .HasForeignKey(mr => mr.restricted_user_id)
             .OnDelete(DeleteBehavior.Restrict);
            
         builder.HasOne(mr => mr.RestrictingUser)
             .WithMany()
             .HasForeignKey(mr => mr.restricting_user_id)
             .OnDelete(DeleteBehavior.Restrict);
     }
    }
}
