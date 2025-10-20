using FluentValidation;
using UngDungMangXaHoi.Domain.Entities;

namespace UngDungMangXaHoi.Application.Validators
{
    /// <summary>
    /// Request model cho đăng ký tài khoản Admin
    /// Admin không cần Username (chỉ User mới có username)
    /// </summary>
    public class RegisterAdminRequest
    {
        public string FullName { get; set; } = null!;
        public DateTime DateOfBirth { get; set; }
        public string Email { get; set; } = null!;
        public string? Phone { get; set; }  // Optional - Admin có thể không có phone
        public string Password { get; set; } = null!;
        public Gender Gender { get; set; }
    }

    /// <summary>
    /// Validator cho RegisterAdminRequest
    /// Riêng cho Admin - không validate Username
    /// </summary>
    public class AdminValidator : AbstractValidator<RegisterAdminRequest>
    {
        public AdminValidator()
        {
            RuleFor(x => x.FullName)
                .NotEmpty().WithMessage("Họ và tên là bắt buộc.")
                .Length(2, 100).WithMessage("Họ và tên phải từ 2 đến 100 ký tự.");

            RuleFor(x => x.DateOfBirth)
                .NotEmpty().WithMessage("Ngày sinh là bắt buộc.")
                .LessThanOrEqualTo(DateTime.Today).WithMessage("Ngày sinh phải trong quá khứ.");

            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("Email là bắt buộc.")
                .EmailAddress().WithMessage("Định dạng email không hợp lệ.");

            RuleFor(x => x.Phone)
                .Matches(@"^\+?\d{10,15}$").WithMessage("Định dạng số điện thoại không hợp lệ.")
                .When(x => !string.IsNullOrWhiteSpace(x.Phone));  // Chỉ validate khi có giá trị

            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("Mật khẩu là bắt buộc.")
                .MinimumLength(8).WithMessage("Mật khẩu phải có ít nhất 8 ký tự.");

            RuleFor(x => x.Gender)
                .IsInEnum().WithMessage("Giới tính phải là 'Nam', 'Nữ', hoặc 'Khác'.");
        }
    }
}
