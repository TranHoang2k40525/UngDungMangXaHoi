using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Domain.ValueObjects;

namespace UngDungMangXaHoi.Application.UseCases.Users
{
    public class LoginUser
    {
        private readonly IAccountRepository _accountRepository;
        private readonly IPasswordHasher _passwordHasher;
        private readonly ITokenService _tokenService;

        public LoginUser(IAccountRepository accountRepository, IPasswordHasher passwordHasher, ITokenService tokenService)
        {
            _accountRepository = accountRepository;
            _passwordHasher = passwordHasher;
            _tokenService = tokenService;
        }

        public async Task<(string AccessToken, string RefreshToken)?> ExecuteAsync(string emailOrPhone, string password)
        {
            Account? account = null;
            if (emailOrPhone.Contains("@"))
            {
                account = await _accountRepository.GetByEmailAsync(new Email(emailOrPhone));
            }
            else
            {
                account = await _accountRepository.GetByPhoneAsync(emailOrPhone);
            }

            if (account == null || !_passwordHasher.VerifyPassword(password, account.password_hash.Value))
            {
                return null;
            }

            return await _tokenService.GenerateTokensAsync(account);
        }
    }
}