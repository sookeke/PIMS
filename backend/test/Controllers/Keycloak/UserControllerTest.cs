using AutoMapper;
using Entity = Pims.Dal.Entities;
using Microsoft.AspNetCore.Mvc;
using Model = Pims.Api.Areas.Keycloak.Models.User;
using Moq;
using Pims.Api.Areas.Keycloak.Controllers;
using Pims.Api.Test.Helpers;
using Pims.Dal.Keycloak;
using Pims.Dal.Security;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;

namespace PimsApi.Test.Keycloak.Controllers
{
    [Trait("category", "unit")]
    [Trait("category", "api")]
    [Trait("area", "keycloak")]
    [Trait("group", "user")]
    public class UserControllerTest
    {
        #region Variables
        #endregion

        #region Constructors
        public UserControllerTest()
        {
        }
        #endregion

        #region Tests
        #region SyncUserAsync
        [Fact]
        public async void SyncUserAsync_Success()
        {
            // Arrange
            var helper = new TestHelper();
            var controller = helper.CreateController<UserController>(Permissions.AdminUsers);

            var mapper = helper.GetService<IMapper>();
            var service = helper.GetService<Mock<IPimsKeycloakService>>();
            var user = new Entity.User(Guid.NewGuid(), "test", "test@test.com");
            service.Setup(m => m.SyncUserAsync(It.IsAny<Guid>())).Returns(Task.FromResult(user));

            // Act
            var result = await controller.SyncUserAsync(user.Id);

            // Assert
            var actionResult = Assert.IsType<JsonResult>(result);
            Assert.Null(actionResult.StatusCode);
            var data = Assert.IsType<Model.UserModel>(actionResult.Value);
            Assert.Equal(mapper.Map<Model.UserModel>(user), data);
            service.Verify(m => m.SyncUserAsync(It.IsAny<Guid>()), Times.Once());
        }
        #endregion

        #region GetUsersAsync
        [Fact]
        public async void GetUsersAsync_Success()
        {
            // Arrange
            var helper = new TestHelper();
            var controller = helper.CreateController<UserController>(Permissions.AdminUsers);

            var mapper = helper.GetService<IMapper>();
            var service = helper.GetService<Mock<IPimsKeycloakService>>();
            var user = new Entity.User(Guid.NewGuid(), "test", "test@test.com");
            var users = new[] { user };
            service.Setup(m => m.GetUsersAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<string>())).Returns(Task.FromResult((IEnumerable<Entity.User>)users));

            // Act
            var result = await controller.GetUsersAsync(1, 10);

            // Assert
            var actionResult = Assert.IsType<JsonResult>(result);
            Assert.Null(actionResult.StatusCode);
            var data = Assert.IsType<Model.UserModel[]>(actionResult.Value);
            Assert.Equal(mapper.Map<Model.UserModel[]>(users), data);
            service.Verify(m => m.GetUsersAsync(1, 10, It.IsAny<string>()), Times.Once());
        }
        #endregion

        #region GetUserAsync
        [Fact]
        public async void GetUserAsync_Success()
        {
            // Arrange
            var helper = new TestHelper();
            var controller = helper.CreateController<UserController>(Permissions.AdminUsers);

            var mapper = helper.GetService<IMapper>();
            var service = helper.GetService<Mock<IPimsKeycloakService>>();
            var user = new Entity.User(Guid.NewGuid(), "test", "test@test.com");
            service.Setup(m => m.GetUserAsync(It.IsAny<Guid>())).Returns(Task.FromResult(user));

            // Act
            var result = await controller.GetUserAsync(user.Id);

            // Assert
            var actionResult = Assert.IsType<JsonResult>(result);
            Assert.Null(actionResult.StatusCode);
            var data = Assert.IsType<Model.UserModel>(actionResult.Value);
            Assert.Equal(mapper.Map<Model.UserModel>(user), data);
            service.Verify(m => m.GetUserAsync(It.IsAny<Guid>()), Times.Once());
        }
        #endregion

        #region UpdateUserAsync
        [Fact]
        public async void UpdateUserAsync_Success()
        {
            // Arrange
            var helper = new TestHelper();
            var controller = helper.CreateController<UserController>(Permissions.AdminUsers);

            var mapper = helper.GetService<IMapper>();
            var service = helper.GetService<Mock<IPimsKeycloakService>>();
            var user = new Entity.User(Guid.NewGuid(), "test", "test@test.com");
            service.Setup(m => m.UpdateUserAsync(It.IsAny<Entity.User>())).Returns(Task.FromResult(user));
            var model = mapper.Map<Model.Update.UserModel>(user);

            // Act
            var result = await controller.UpdateUserAsync(user.Id, model);

            // Assert
            var actionResult = Assert.IsType<JsonResult>(result);
            Assert.Null(actionResult.StatusCode);
            var data = Assert.IsType<Model.UserModel>(actionResult.Value);
            Assert.Equal(mapper.Map<Model.UserModel>(user), data);
            service.Verify(m => m.UpdateUserAsync(It.IsAny<Entity.User>()), Times.Once());
        }
        #endregion
        #endregion
    }
}