using System;

namespace UngDungMangXaHoi.Domain.Entities
{
    public enum FriendshipStatus
    {
        Pending = 0,
        Accepted = 1,
        Declined = 2,
        Blocked = 3
    }

    public class Friendship
    {
        public Guid Id { get; set; }
        public Guid RequesterId { get; set; }
        public Guid AddresseeId { get; set; }
        public FriendshipStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        // Navigation properties
        public virtual User Requester { get; set; }
        public virtual User Addressee { get; set; }

        public Friendship()
        {
            Id = Guid.NewGuid();
            CreatedAt = DateTime.UtcNow;
            UpdatedAt = DateTime.UtcNow;
            Status = FriendshipStatus.Pending;
        }

        public Friendship(Guid requesterId, Guid addresseeId) : this()
        {
            RequesterId = requesterId;
            AddresseeId = addresseeId;
        }

        public void Accept()
        {
            Status = FriendshipStatus.Accepted;
            UpdatedAt = DateTime.UtcNow;
        }

        public void Decline()
        {
            Status = FriendshipStatus.Declined;
            UpdatedAt = DateTime.UtcNow;
        }

        public void Block()
        {
            Status = FriendshipStatus.Blocked;
            UpdatedAt = DateTime.UtcNow;
        }

        public void Unblock()
        {
            Status = FriendshipStatus.Accepted;
            UpdatedAt = DateTime.UtcNow;
        }
    }
}

