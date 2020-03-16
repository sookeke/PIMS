using System;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace Pims.Api.Helpers
{
    public interface IKeycloakRequestClient : IDisposable
    {
        Task<HttpResponseMessage> ProxySendAsync(HttpRequest request, string url, HttpMethod method = null, HttpContent content = null);
        Task<HttpResponseMessage> ProxyGetAsync(HttpRequest request, string url);
        Task<HttpResponseMessage> ProxyPostAsync(HttpRequest request, string url, HttpContent content);
        Task<HttpResponseMessage> ProxyPutAsync(HttpRequest request, string url, HttpContent content);
        Task<HttpResponseMessage> ProxyDeleteAsync(HttpRequest request, string url, HttpContent content);
        Task<HttpResponseMessage> RequestToken();
        Task<string> RequestAccessToken();
        Task<HttpResponseMessage> SendAsync(string url, HttpMethod method, HttpContent content = null);
        Task<HttpResponseMessage> GetAsync(string url);
        Task<HttpResponseMessage> PostAsync(string url, HttpContent content);
        Task<HttpResponseMessage> PutAsync(string url, HttpContent content);
        Task<HttpResponseMessage> DeleteAsync(string url, HttpContent content);
    }
}