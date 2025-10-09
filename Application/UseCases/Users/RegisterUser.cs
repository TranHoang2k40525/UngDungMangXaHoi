using System.Threading.Tasks;
using UngDungMangXaHoi.Domain.Entities;
using UngDungMangXaHoi.Domain.Interfaces;
using UngDungMangXaHoi.Domain.ValueObjects;
using UngDungMangXaHoi.Application.Validators; // { changed code }

namespace UngDungMangXaHoi.Application.UseCases.Users
{
    public class RegisterUser
    {
        private readonly IUserRepository _userRepository;
        private readonly IAccountRepository _accountRepository;
        private readonly IPasswordHasher _passwordHasher;

        public RegisterUser(IUserRepository userRepository, IAccountRepository accountRepository, IPasswordHasher passwordHasher)
        {
            _userRepository = userRepository;
            _accountRepository = accountRepository;
            _passwordHasher = passwordHasher;
        }

        public async Task<User> ExecuteAsync(RegisterUserRequest request)
        {
            var account = new Account
            {
                email = new Email(request.Email),
                phone = new PhoneNumber(request.Phone),
                password_hash = new PasswordHash(_passwordHasher.HashPassword(request.Password)),
                account_type = AccountType.User,
                status = "pending",
                created_at = DateTime.UtcNow,
                updated_at = DateTime.UtcNow
            };

            var user = new User
            {
                username = new UserName(request.Username),
                full_name = request.FullName,
                date_of_birth = request.DateOfBirth,
                gender = request.Gender,
                Account = account
            };

            await _accountRepository.AddAsync(account);
            return await _userRepository.AddAsync(user);
        }
    }
}