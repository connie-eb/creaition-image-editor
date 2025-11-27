import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError, timer } from 'rxjs';
import { catchError, delay, retryWhen, mergeMap, tap } from 'rxjs/operators';

import {
  AIGenerationRequest,
  AIGenerationResponse,
  AIModel,
  AIParameters,
  GenerationHistory
} from '../models/image-editor.model';

interface HuggingFaceResponse {
  generated_image: string;
}

interface GoogleImagenResponse {
  predictions: Array<{
    bytesBase64Encoded: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class AIImageService {
  private readonly API_ENDPOINTS = {
    'stable-diffusion': '/api/huggingface/models/stabilityai/stable-diffusion-xl-base-1.0',
    'qwen-image-edit': '/api/huggingface/models/stabilityai/stable-diffusion-2-1',
    'google-imagen': 'https://us-central1-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/us-central1/publishers/google/models/imagegeneration@006:predict'
  };

  private readonly storageKey = 'creaition-ai-history';

  // 状态管理
  private historySubject = new BehaviorSubject<GenerationHistory[]>(this.loadHistory());
  public history$ = this.historySubject.asObservable();

  private generatingSubject = new BehaviorSubject<boolean>(false);
  public generating$ = this.generatingSubject.asObservable();

  private progressSubject = new BehaviorSubject<number>(0);
  public progress$ = this.progressSubject.asObservable();

  private errorSubject = new BehaviorSubject<string | null>(null);
  public error$ = this.errorSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * 生成图像
   */
  generateImage(request: AIGenerationRequest): Observable<AIGenerationResponse> {
    this.generatingSubject.next(true);
    this.progressSubject.next(0);
    this.errorSubject.next(null);

    const endpoint = this.API_ENDPOINTS[request.model];
    const headers = this.getHeaders(request.model);
    const body = this.buildRequestBody(request);

    // 模拟进度更新（实际API可能不支持进度）
    const progressInterval = setInterval(() => {
      const currentProgress = this.progressSubject.value;
      if (currentProgress < 90) {
        this.progressSubject.next(currentProgress + 10);
      }
    }, 500);

    return this.http.post<any>(endpoint, body, { headers }).pipe(
      tap(() => {
        clearInterval(progressInterval);
        this.progressSubject.next(100);
      }),
      retryWhen(errors =>
        errors.pipe(
          mergeMap((error, index) => {
            // 对于4xx错误（客户端错误），不重试，直接抛出
            if (error.status && error.status >= 400 && error.status < 500) {
              return throwError(error);
            }
            // 指数退避重试，最多重试3次
            const retryAttempt = index + 1;
            if (retryAttempt > 3) {
              return throwError(error);
            }
            return timer(1000 * Math.pow(2, retryAttempt));
          })
        )
      ),
      catchError(error => this.handleError(error)),
      tap(response => this.handleSuccess(response, request))
    );
  }

  /**
   * 获取请求头
   */
  private getHeaders(model: AIModel): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    if (model === 'stable-diffusion' || model === 'qwen-image-edit') {
      // 从环境变量或配置中获取token
      const token = 'your-huggingface-token'; // 实际使用时应该从环境变量获取
      headers = headers.set('Authorization', `Bearer ${token}`);
    } else if (model === 'google-imagen') {
      const accessToken = 'your-google-access-token'; // 实际使用时应该从环境变量获取
      headers = headers.set('Authorization', `Bearer ${accessToken}`);
    }

    return headers;
  }

  /**
   * 构建请求体
   */
  private buildRequestBody(request: AIGenerationRequest): any {
    const baseBody = {
      prompt: request.prompt,
      width: request.parameters.width,
      height: request.parameters.height
    };

    switch (request.model) {
      case 'stable-diffusion':
        return {
          ...baseBody,
          steps: request.parameters.steps || 20,
          guidance_scale: request.parameters.guidanceScale || 7.5,
          seed: request.parameters.seed
        };

      case 'qwen-image-edit':
        return {
          ...baseBody,
          input_image: request.inputImage,
          mask_image: request.maskImage
        };

      case 'google-imagen':
        return {
          instances: [
            {
              prompt: request.prompt,
              image: {
                bytesBase64Encoded: request.inputImage
              }
            }
          ],
          parameters: {
            sampleCount: 1,
            aspectRatio: `${request.parameters.width}:${request.parameters.height}`,
            guidanceScale: request.parameters.guidanceScale || 7.5
          }
        };

      default:
        return baseBody;
    }
  }

  /**
   * 处理成功响应
   */
  private handleSuccess(response: any, request: AIGenerationRequest): void {
    const generatedImage = this.extractImageFromResponse(response, request.model);

    const generationResponse: AIGenerationResponse = {
      id: this.generateId(),
      image: generatedImage,
      prompt: request.prompt,
      model: request.model,
      parameters: request.parameters,
      timestamp: new Date(),
      status: 'success'
    };

    // 添加到历史记录
    const historyItem: GenerationHistory = {
      ...generationResponse,
      favorite: false
    };

    this.addToHistory(historyItem);
    this.generatingSubject.next(false);
    this.progressSubject.next(0);
  }

  /**
   * 从响应中提取图像
   */
  private extractImageFromResponse(response: any, model: AIModel): string {
    switch (model) {
      case 'stable-diffusion':
      case 'qwen-image-edit':
        return response.generated_image || response[0]?.generated_image;

      case 'google-imagen':
        return response.predictions?.[0]?.bytesBase64Encoded;

      default:
        throw new Error(`Unsupported model: ${model}`);
    }
  }

  /**
   * 错误处理
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    this.generatingSubject.next(false);
    this.progressSubject.next(0);

    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      // 客户端错误
      errorMessage = `Client error: ${error.error.message}`;
    } else {
      // 服务器错误
      switch (error.status) {
        case 401:
          errorMessage = 'Authentication failed. Please check your API token.';
          break;
        case 403:
          errorMessage = 'Access forbidden. Please check your permissions.';
          break;
        case 404:
          errorMessage = 'API endpoint not found. The model may have been moved or removed.';
          break;
        case 410:
          errorMessage = 'The API endpoint is no longer available. Please try a different model or check the API configuration.';
          break;
        case 429:
          errorMessage = 'Rate limit exceeded. Please try again later.';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
        case 503:
          errorMessage = 'Service temporarily unavailable. Please try again later.';
          break;
        default:
          errorMessage = `Server error: ${error.status} - ${error.message || 'Unknown error'}`;
      }
    }

    this.errorSubject.next(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  /**
   * 添加到历史记录
   */
  private addToHistory(item: GenerationHistory): void {
    const currentHistory = this.historySubject.value;
    const newHistory = [item, ...currentHistory].slice(0, 50); // 限制历史记录数量
    this.historySubject.next(newHistory);
    this.saveHistory(newHistory);
  }

  /**
   * 从本地存储加载历史记录
   */
  private loadHistory(): GenerationHistory[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * 保存历史记录到本地存储
   */
  private saveHistory(history: GenerationHistory[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 公共方法
   */

  // 清除错误
  clearError(): void {
    this.errorSubject.next(null);
  }

  // 切换收藏状态
  toggleFavorite(id: string): void {
    const history = this.historySubject.value.map(item =>
      item.id === id ? { ...item, favorite: !item.favorite } : item
    );
    this.historySubject.next(history);
    this.saveHistory(history);
  }

  // 删除历史记录
  deleteFromHistory(id: string): void {
    const history = this.historySubject.value.filter(item => item.id !== id);
    this.historySubject.next(history);
    this.saveHistory(history);
  }

  // 获取收藏的项目
  getFavorites(): GenerationHistory[] {
    return this.historySubject.value.filter(item => item.favorite);
  }

  // 清除所有历史记录
  clearHistory(): void {
    this.historySubject.next([]);
    localStorage.removeItem(this.storageKey);
  }
}
