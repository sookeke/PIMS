using AutoMapper;
using Entity = Pims.Dal.Entities;
using Model = Pims.Api.Areas.Admin.Models.User;

namespace Pims.Api.Areas.Admin.Profiles.User
{
    /// <summary>
    /// RoleProfile class, provides a way to configure automapper to convert roles.
    /// </summary>
    public class RoleProfile : Profile
    {
        #region Constructors
        public RoleProfile()
        {
            CreateMap<Entity.Role, Model.RoleModel>()
                .ForMember(dest => dest.Description, opt => opt.MapFrom(src => src.Description))
                .IncludeBase<Entity.LookupEntity, Pims.Api.Models.CodeModel>();

            CreateMap<Entity.UserRole, Model.RoleModel>()
                .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.RoleId));

            CreateMap<Model.RoleModel, Entity.Role>();

            CreateMap<Model.RoleModel, Entity.UserRole>()
                .ForMember(dest => dest.User, opt => opt.Ignore())
                .ForMember(dest => dest.UserId, opt => opt.Ignore())
                .ForMember(dest => dest.Role, opt => opt.Ignore())
                .ForMember(dest => dest.RoleId, opt => opt.MapFrom(src => src.Id));
        }
        #endregion
    }
}