import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { EditorState } from '../../models/image-editor.model';
import { ToolbarComponent } from '../toolbar/toolbar.component';
import { PropertiesPanelComponent } from '../properties-panel/properties-panel.component';
import { AIPanelComponent } from '../ai-panel/ai-panel.component';

@Component({
  selector: 'app-image-editor',
  standalone: true,
  imports: [CommonModule, ToolbarComponent, PropertiesPanelComponent, AIPanelComponent],
  templateUrl: './image-editor.component.html',
  styleUrls: ['./image-editor.component.scss']
})
export class ImageEditorComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('editorContainer') editorContainer!: ElementRef;
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('textInput') textInput!: ElementRef<HTMLInputElement>;

  private ctx: CanvasRenderingContext2D | null = null;
  private stateSubject = new BehaviorSubject<EditorState>(this.getInitialState());
  public state$ = this.stateSubject.asObservable();

  // 响应式布局
  public isMobile = window.innerWidth < 768;
  public showPropertiesPanel = !this.isMobile;
  public showAIPanel = false; // 这个现在由 Toolbar 管理

  // 画布状态
  public isDrawing = false;
  public lastX = 0;
  public lastY = 0;
  
  // 形状绘制状态
  private startX = 0;
  private startY = 0;
  private isShapeDrawing = false;
  private savedImageData: ImageData | null = null;
  
  // 文本状态
  public textInputActive = false;
  public textInputX = 0;
  public textInputY = 0;
  private textInputValue = '';
  
  // 滤镜状态
  public filterBrightness = 100;
  public filterContrast = 100;
  public filterSaturation = 100;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.handleResize();
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  ngAfterViewInit(): void {
    this.initializeCanvas();
    
    // 监听容器大小变化
    const resizeObserver = new ResizeObserver(() => {
      this.resizeCanvas();
    });
    
    const canvasWrapper = this.canvas.nativeElement.parentElement;
    if (canvasWrapper) {
      resizeObserver.observe(canvasWrapper);
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.handleResize.bind(this));
  }

  private getInitialState(): EditorState {
    return {
      activeTool: 'brush',
      brushColor: '#000000',
      brushWidth: 5,
      isDrawingMode: true,
      zoomLevel: 1,
      textColor: '#000000',
      fontSize: 16,
      fontWeight: 60,
      fontSlant: 0,
      shapeFillColor: '#000000',
      shapeStrokeColor: '#000000',
      shapeStrokeWidth: 2,
      brightness: 100,
      contrast: 100,
      saturation: 100,
      history: {
        undo: [],
        redo: []
      }
    };
  }

  private initializeCanvas(): void {
    const canvas = this.canvas.nativeElement;
    this.ctx = canvas.getContext('2d');

    if (this.ctx) {
      // 自适应画布大小
      this.resizeCanvas();
      
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, canvas.width, canvas.height);
      this.ctx.strokeStyle = this.stateSubject.value.brushColor;
      this.ctx.lineWidth = this.stateSubject.value.brushWidth;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
    }

    this.setupEventListeners();
  }

  private resizeCanvas(): void {
    const canvas = this.canvas.nativeElement;
    const wrapper = canvas.parentElement;
    
    if (!wrapper || !this.ctx) return;

    // 获取容器的可用空间
    const containerWidth = wrapper.clientWidth;
    const containerHeight = wrapper.clientHeight;
    
    if (containerWidth <= 0 || containerHeight <= 0) return;
    
    // 设置画布实际尺寸（考虑设备像素比以获得清晰显示）
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = containerWidth;
    const displayHeight = containerHeight;
    
    // 保存当前画布内容（如果已初始化）
    let imageData: ImageData | null = null;
    if (canvas.width > 0 && canvas.height > 0) {
      try {
        imageData = this.ctx.getImageData(0, 0, canvas.width / dpr, canvas.height / dpr);
      } catch (e) {
        // 如果获取失败，忽略
      }
    }
    
    // 设置新的画布尺寸
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    
    // 缩放上下文以匹配设备像素比
    this.ctx.scale(dpr, dpr);
    
    // 填充白色背景
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, displayWidth, displayHeight);
    
    // 如果有之前的画布内容，尝试恢复（简化版：只恢复背景色）
    // 注意：完整的图像缩放恢复比较复杂，这里只做基本处理
    
    // 恢复画笔设置
    this.ctx.strokeStyle = this.stateSubject.value.brushColor;
    this.ctx.fillStyle = this.stateSubject.value.brushColor;
    this.ctx.lineWidth = this.stateSubject.value.brushWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  private setupEventListeners(): void {
    const canvas = this.canvas.nativeElement;

    canvas.addEventListener('mousedown', this.startDrawing.bind(this));
    canvas.addEventListener('mousemove', this.draw.bind(this));
    canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
    canvas.addEventListener('mouseout', this.stopDrawing.bind(this));

    // 触摸事件支持
    canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    canvas.addEventListener('touchend', this.stopDrawing.bind(this));
  }

  private startDrawing(e: MouseEvent): void {
    if (!this.ctx) return;

    const rect = this.canvas.nativeElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const currentTool = this.stateSubject.value.activeTool;

    // 文本工具特殊处理
    if (currentTool === 'text') {
      this.startTextInput(x, y);
      return;
    }

    // 形状工具需要保存当前画布状态
    if (currentTool === 'rectangle' || currentTool === 'circle') {
      this.saveCanvasState();
      this.isShapeDrawing = true;
      this.startX = x;
      this.startY = y;
      this.lastX = x;
      this.lastY = y;
      return;
    }

    // 画笔和橡皮擦
    this.isDrawing = true;
    this.lastX = x;
    this.lastY = y;
  }

  private handleTouchStart(e: TouchEvent): void {
    if (!this.ctx) return;

    e.preventDefault();
    const rect = this.canvas.nativeElement.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const currentTool = this.stateSubject.value.activeTool;

    // 文本工具特殊处理
    if (currentTool === 'text') {
      this.startTextInput(x, y);
      return;
    }

    // 形状工具
    if (currentTool === 'rectangle' || currentTool === 'circle') {
      this.saveCanvasState();
      this.isShapeDrawing = true;
      this.startX = x;
      this.startY = y;
      this.lastX = x;
      this.lastY = y;
      return;
    }

    // 画笔和橡皮擦
    this.isDrawing = true;
    this.lastX = x;
    this.lastY = y;
  }

  private handleTouchMove(e: TouchEvent): void {
    if (!this.ctx) return;

    e.preventDefault();
    const rect = this.canvas.nativeElement.getBoundingClientRect();
    const touch = e.touches[0];
    const currentX = touch.clientX - rect.left;
    const currentY = touch.clientY - rect.top;
    const currentTool = this.stateSubject.value.activeTool;

    // 形状工具实时预览
    if (this.isShapeDrawing && (currentTool === 'rectangle' || currentTool === 'circle')) {
      this.lastX = currentX;
      this.lastY = currentY;
      this.drawShapePreview(currentX, currentY);
      return;
    }

    // 画笔和橡皮擦
    if (this.isDrawing) {
      this.drawOnCanvas(this.lastX, this.lastY, currentX, currentY);
      this.lastX = currentX;
      this.lastY = currentY;
    }
  }

  private draw(e: MouseEvent): void {
    if (!this.ctx) return;

    const rect = this.canvas.nativeElement.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    const currentTool = this.stateSubject.value.activeTool;

    // 形状工具实时预览
    if (this.isShapeDrawing && (currentTool === 'rectangle' || currentTool === 'circle')) {
      this.lastX = currentX;
      this.lastY = currentY;
      this.drawShapePreview(currentX, currentY);
      return;
    }

    // 画笔和橡皮擦
    if (this.isDrawing) {
      this.drawOnCanvas(this.lastX, this.lastY, currentX, currentY);
      this.lastX = currentX;
      this.lastY = currentY;
    }
  }

  private drawOnCanvas(startX: number, startY: number, endX: number, endY: number): void {
    if (!this.ctx) return;

    const currentTool = this.stateSubject.value.activeTool;
    const state = this.stateSubject.value;

    // 橡皮擦工具 - 使用画布背景色（白色）绘制
    if (currentTool === 'eraser') {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.strokeStyle = '#ffffff'; // 画布背景色
      this.ctx.lineWidth = state.brushWidth;
    } else {
      // 画笔工具
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.strokeStyle = state.brushColor;
      this.ctx.lineWidth = state.brushWidth;
    }

    this.ctx.beginPath();
    this.ctx.moveTo(startX, startY);
    this.ctx.lineTo(endX, endY);
    this.ctx.stroke();
  }

  private stopDrawing(): void {
    const currentTool = this.stateSubject.value.activeTool;

    // 形状工具完成绘制
    if (this.isShapeDrawing && (currentTool === 'rectangle' || currentTool === 'circle')) {
      this.finishShapeDrawing();
      this.isShapeDrawing = false;
      return;
    }

    this.isDrawing = false;
  }

  // 保存画布状态（用于形状预览）
  private saveCanvasState(): void {
    if (!this.ctx) return;
    const canvas = this.canvas.nativeElement;
    this.savedImageData = this.ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  // 恢复画布状态
  private restoreCanvasState(): void {
    if (!this.ctx || !this.savedImageData) return;
    this.ctx.putImageData(this.savedImageData, 0, 0);
  }

  // 绘制形状预览
  private drawShapePreview(currentX: number, currentY: number): void {
    if (!this.ctx || !this.savedImageData) return;

    // 恢复保存的状态
    this.restoreCanvasState();

    const state = this.stateSubject.value;
    const width = currentX - this.startX;
    const height = currentY - this.startY;

    // 使用形状属性，如果没有则使用画笔属性
    const strokeColor = state.shapeStrokeColor || state.brushColor;
    const fillColor = state.shapeFillColor || state.brushColor;
    const strokeWidth = state.shapeStrokeWidth || state.brushWidth;

    this.ctx.strokeStyle = strokeColor;
    this.ctx.lineWidth = strokeWidth;
    this.ctx.fillStyle = fillColor;
    this.ctx.globalCompositeOperation = 'source-over';

    if (this.stateSubject.value.activeTool === 'rectangle') {
      // 确保宽度和高度至少为1，以便形状可见
      const rectWidth = Math.abs(width) || 1;
      const rectHeight = Math.abs(height) || 1;
      const rectX = width < 0 ? currentX : this.startX;
      const rectY = height < 0 ? currentY : this.startY;
      
      this.ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
      this.ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
    } else if (this.stateSubject.value.activeTool === 'circle') {
      const centerX = this.startX + width / 2;
      const centerY = this.startY + height / 2;
      const radiusX = Math.abs(width) / 2;
      const radiusY = Math.abs(height) / 2;
      const radius = Math.max(radiusX, radiusY, 1); // 确保半径至少为1

      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      this.ctx.fill();
      this.ctx.stroke();
    }
  }

  // 完成形状绘制
  private finishShapeDrawing(): void {
    if (!this.ctx || !this.savedImageData) return;

    // 恢复保存的状态
    this.restoreCanvasState();

    const state = this.stateSubject.value;
    const width = this.lastX - this.startX;
    const height = this.lastY - this.startY;

    // 使用形状属性，如果没有则使用画笔属性
    const strokeColor = state.shapeStrokeColor || state.brushColor;
    const fillColor = state.shapeFillColor || state.brushColor;
    const strokeWidth = state.shapeStrokeWidth || state.brushWidth;

    this.ctx.strokeStyle = strokeColor;
    this.ctx.lineWidth = strokeWidth;
    this.ctx.fillStyle = fillColor;
    this.ctx.globalCompositeOperation = 'source-over';

    if (state.activeTool === 'rectangle') {
      // 确保宽度和高度至少为1，以便形状可见
      const rectWidth = Math.abs(width) || 1;
      const rectHeight = Math.abs(height) || 1;
      const rectX = width < 0 ? this.lastX : this.startX;
      const rectY = height < 0 ? this.lastY : this.startY;
      
      this.ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
      this.ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
    } else if (state.activeTool === 'circle') {
      const centerX = this.startX + width / 2;
      const centerY = this.startY + height / 2;
      const radiusX = Math.abs(width) / 2;
      const radiusY = Math.abs(height) / 2;
      const radius = Math.max(radiusX, radiusY, 1); // 确保半径至少为1

      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      this.ctx.fill();
      this.ctx.stroke();
    }

    this.savedImageData = null;
  }

  // 开始文本输入
  private startTextInput(x: number, y: number): void {
    if (!this.ctx) return;

    const canvas = this.canvas.nativeElement;
    const canvasWrapper = canvas.parentElement;
    if (!canvasWrapper) {
      console.error('Canvas wrapper not found');
      return;
    }

    // 获取canvas相对于wrapper的位置
    const canvasRect = canvas.getBoundingClientRect();
    const wrapperRect = canvasWrapper.getBoundingClientRect();
    
    // 计算相对于wrapper的位置
    // x和y已经是相对于canvas的坐标，需要加上canvas相对于wrapper的偏移
    const canvasOffsetX = canvasRect.left - wrapperRect.left;
    const canvasOffsetY = canvasRect.top - wrapperRect.top;
    
    this.textInputX = x + canvasOffsetX;
    this.textInputY = y + canvasOffsetY;
    this.textInputActive = true;
    this.textInputValue = '';

    // 强制更新视图
    this.cdr.detectChanges();

    console.log('Text input started at:', { x: this.textInputX, y: this.textInputY, active: this.textInputActive });

    // 等待DOM更新后聚焦输入框
    setTimeout(() => {
      if (this.textInput && this.textInput.nativeElement) {
        this.textInput.nativeElement.focus();
        this.textInput.nativeElement.select();
        console.log('Text input focused');
      } else {
        console.error('Text input element not found');
      }
    }, 100);
  }

  // 完成文本输入
  public finishTextInput(): void {
    if (!this.ctx || !this.textInput) return;

    const text = this.textInput.nativeElement.value.trim();
    if (text) {
      // 将wrapper坐标转换回画布坐标
      const canvas = this.canvas.nativeElement;
      const canvasWrapper = canvas.parentElement;
      if (!canvasWrapper) return;

      const canvasRect = canvas.getBoundingClientRect();
      const wrapperRect = canvasWrapper.getBoundingClientRect();
      
      // 计算相对于canvas的坐标
      const canvasOffsetX = canvasRect.left - wrapperRect.left;
      const canvasOffsetY = canvasRect.top - wrapperRect.top;
      
      const canvasX = this.textInputX - canvasOffsetX;
      const canvasY = this.textInputY - canvasOffsetY;

      const state = this.stateSubject.value;
      const fontSize = state.fontSize || 16;
      const textColor = state.textColor || state.brushColor;
      const fontWeight = state.fontWeight || 60;
      const fontSlant = state.fontSlant || 0;
      
      // 设置字体
      // 使用 strokeWeight 字体，支持字体变体
      const fontFamily = 'strokeWeight, Arial, sans-serif';
      const fontStyle = fontSlant > 0 ? 'oblique' : 'normal';
      
      this.ctx.fillStyle = textColor;
      this.ctx.font = `${fontStyle} ${fontSize}px ${fontFamily}`;
      
      // 设置字体变体（如果支持）
      // 使用类型断言，因为fontVariationSettings可能不在类型定义中
      if ('fontVariationSettings' in this.ctx) {
        (this.ctx as any).fontVariationSettings = `'wght' ${fontWeight}, 'slnt' ${fontSlant}`;
      }
      
      // 调整y坐标，因为fillText的y是基线位置
      // 先测量文本以获取正确的高度
      const metrics = this.ctx.measureText(text);
      const textHeight = metrics.actualBoundingBoxAscent || fontSize;
      const adjustedY = canvasY + textHeight;
      
      this.ctx.fillText(text, canvasX, adjustedY);
    }

    this.textInputActive = false;
    this.textInputValue = '';
  }

  // 取消文本输入
  public cancelTextInput(): void {
    this.textInputActive = false;
    this.textInputValue = '';
  }

  // 获取文本字体大小（用于输入框样式）
  public getTextFontSize(): number {
    const state = this.stateSubject.value;
    return state.fontSize || 16;
  }

  // 获取文本颜色（用于输入框样式）
  public getTextColor(): string {
    const state = this.stateSubject.value;
    return state.textColor || state.brushColor || '#000000';
  }

  // 获取文本字重（用于输入框样式）
  public getTextFontWeight(): string {
    const state = this.stateSubject.value;
    const weight = state.fontWeight || 60;
    // 将字体变体重转换为CSS字重
    if (weight <= 60) return '300';
    if (weight <= 80) return '400';
    return '600';
  }

  // 获取文本字体样式（用于输入框样式）
  public getTextFontStyle(): string {
    const state = this.stateSubject.value;
    return state.fontSlant && state.fontSlant > 0 ? 'italic' : 'normal';
  }

  private handleResize(): void {
    this.isMobile = window.innerWidth < 768;
    this.showPropertiesPanel = !this.isMobile;
    
    // 重新调整画布大小
    setTimeout(() => {
      this.resizeCanvas();
    }, 100);
  }

  // 公共方法
  public togglePropertiesPanel(): void {
    this.showPropertiesPanel = !this.showPropertiesPanel;
  }

  public onToolSelected(tool: string): void {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({
      ...currentState,
      activeTool: tool
    });

    // 更新画布上下文设置
    if (this.ctx) {
      if (tool === 'eraser') {
        // 橡皮擦使用白色（画布背景色）
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.strokeStyle = '#ffffff';
      } else {
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.strokeStyle = currentState.brushColor;
        this.ctx.fillStyle = currentState.brushColor;
      }
    }
  }

  public onPropertyChange(property: string, value: any): void {
    const currentState = this.stateSubject.value;
    const newState = {
      ...currentState,
      [property]: value
    };

    this.stateSubject.next(newState);

    // 更新画布上下文
    if (this.ctx) {
      if (property === 'brushColor') {
        this.ctx.strokeStyle = value;
        this.ctx.fillStyle = value;
      } else if (property === 'brushWidth') {
        this.ctx.lineWidth = value;
      } else if (property === 'brightness' || property === 'contrast' || property === 'saturation') {
        // 更新滤镜值（使用CSS滤镜进行实时预览）
        if (property === 'brightness') {
          this.filterBrightness = value;
        } else if (property === 'contrast') {
          this.filterContrast = value;
        } else if (property === 'saturation') {
          this.filterSaturation = value;
        }
        // 注意：CSS滤镜只是预览，实际应用需要调用applyFiltersToCanvas()
      } else if (property === 'textColor') {
        // 文本颜色更新
        this.ctx.fillStyle = value;
      } else if (property === 'fontSize') {
        // 字体大小更新（用于下次文本输入）
      } else if (property === 'shapeFillColor' || property === 'shapeStrokeColor') {
        // 形状颜色更新（用于下次形状绘制）
        if (property === 'shapeFillColor') {
          this.ctx.fillStyle = value;
        } else {
          this.ctx.strokeStyle = value;
        }
      } else if (property === 'shapeStrokeWidth') {
        // 形状描边宽度更新
        this.ctx.lineWidth = value;
      }
    }
  }

  public getImageAsBase64(): string {
    return this.canvas.nativeElement.toDataURL('image/png');
  }

  public loadImage(imageData: string): void {
    const img = new Image();
    img.onload = () => {
      if (this.ctx) {
        const canvas = this.canvas.nativeElement;
        this.ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
    };
    img.src = imageData;
  }

  public clearCanvas(): void {
    if (this.ctx) {
      const canvas = this.canvas.nativeElement;
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  // 获取CSS滤镜样式（用于实时预览）
  public getFilterStyle(): string {
    return `brightness(${this.filterBrightness}%) contrast(${this.filterContrast}%) saturate(${this.filterSaturation}%)`;
  }

  // 应用滤镜效果到画布（永久应用）
  public applyFiltersToCanvas(): void {
    if (!this.ctx) return;

    const canvas = this.canvas.nativeElement;
    const imageData = this.ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // 应用亮度、对比度和饱和度
    const brightness = this.filterBrightness / 100;
    const contrast = this.filterContrast / 100;
    const saturation = this.filterSaturation / 100;

    for (let i = 0; i < data.length; i += 4) {
      // 获取RGB值
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // 应用亮度
      r = r * brightness;
      g = g * brightness;
      b = b * brightness;

      // 应用对比度
      const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
      r = Math.max(0, Math.min(255, factor * (r - 128) + 128));
      g = Math.max(0, Math.min(255, factor * (g - 128) + 128));
      b = Math.max(0, Math.min(255, factor * (b - 128) + 128));

      // 应用饱和度
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = Math.max(0, Math.min(255, gray + (r - gray) * saturation));
      g = Math.max(0, Math.min(255, gray + (g - gray) * saturation));
      b = Math.max(0, Math.min(255, gray + (b - gray) * saturation));

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }

    this.ctx.putImageData(imageData, 0, 0);
    
    // 重置滤镜值（因为已经应用到画布）
    this.filterBrightness = 100;
    this.filterContrast = 100;
    this.filterSaturation = 100;
  }

  // 应用滤镜（用于filter工具）
  public applyFilter(brightness: number, contrast: number, saturation: number): void {
    this.filterBrightness = brightness;
    this.filterContrast = contrast;
    this.filterSaturation = saturation;
    this.applyFiltersToCanvas();
  }
}
