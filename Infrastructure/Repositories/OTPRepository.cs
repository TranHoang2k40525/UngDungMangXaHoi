using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Infrastructure.Persistence;

namespace UngDungMangXaHoi.Infrastructure.Repositories
{
    public class OTPRepository : IOTPRepository
    {
        private readonly AppDbContext _context;

        public OTPRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<OTP> AddAsync(OTP otp)
        {
            _context.OTPs.Add(otp);
            await _context.SaveChangesAsync();
            return otp;
        }

        public async Task<OTP?> GetByAccountIdAsync(int accountId, string purpose)
        {
            return await _context.OTPs
                .FirstOrDefaultAsync(o => o.account_id == accountId && o.purpose == purpose && !o.used && o.expires_at > DateTimeOffset.UtcNow);
        }

        public async Task<OTP?> GetVerifiedOtpAsync(int accountId, string purpose)
        {
            // Lấy OTP đã verify (used = true) và chưa hết hạn
            return await _context.OTPs
                .FirstOrDefaultAsync(o => o.account_id == accountId && o.purpose == purpose && o.used && o.expires_at > DateTimeOffset.UtcNow);
        }

        public async Task UpdateAsync(OTP otp)
        {
            _context.OTPs.Update(otp);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(int otpId)
        {
            var otp = await _context.OTPs.FindAsync(otpId);
            if (otp != null)
            {
                _context.OTPs.Remove(otp);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<int> GetFailedAttemptsAsync(int accountId, string purpose)
        {
            return await _context.OTPs
                .CountAsync(o => o.account_id == accountId && o.purpose == purpose && o.created_at > DateTimeOffset.UtcNow.AddMinutes(-2));
        }
    }
}