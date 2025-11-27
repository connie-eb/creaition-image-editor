export interface EditorState {
  activeTool: string;
  brushColor: string;
  brushWidth: number;
  isDrawingMode: boolean;
  zoomLevel: number;
  // 文本属性
  textColor?: string;
  fontSize?: number;
  fontWeight?: number;
  fontSlant?: number;
  // 形状属性
  shapeFillColor?: string;
  shapeStrokeColor?: string;
  shapeStrokeWidth?: number;
  // 滤镜属性
  brightness?: number;
  contrast?: number;
  saturation?: number;
  history: {
    undo: string[];
    redo: string[];
  };
}

export interface AIGenerationRequest {
  prompt: string;
  model: AIModel;
  parameters: AIParameters;
  inputImage?: string; // base64 for img2img
  maskImage?: string; // base64 for inpainting
}

export interface AIGenerationResponse {
  id: string;
  image: string; // base64
  prompt: string;
  model: AIModel;
  parameters: AIParameters;
  timestamp: Date;
  status: 'success' | 'error' | 'loading';
}

export interface AIParameters {
  steps?: number;
  guidanceScale?: number;
  width: number;
  height: number;
  seed?: number;
}

export type AIModel = 'stable-diffusion' | 'qwen-image-edit' | 'google-imagen';

export interface GenerationHistory {
  id: string;
  prompt: string;
  image: string;
  model: AIModel;
  timestamp: Date;
  favorite: boolean;
}

export interface AIState {
  currentPrompt: string;
  selectedModel: AIModel;
  parameters: AIParameters;
  isGenerating: boolean;
  progress: number;
  currentGeneration: AIGenerationResponse | null;
  history: GenerationHistory[];
  error: string | null;
}
