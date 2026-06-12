/**
 * 统一 API 请求客户端
 * 所有接口请求使用此 axios 实例，baseURL 指向后端服务端口
 */
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3005',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;

/**
 * 获取完整的 API URL（用于 fetch 流式请求等场景）
 */
export function getApiUrl(path: string): string {
  return `http://localhost:3005${path}`;
}
