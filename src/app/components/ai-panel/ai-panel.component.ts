import { Component, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

import { AIImageService } from '../../services/ai-image.service';
import { AIGenerationRequest, AIModel, AIParameters } from '../../models/image-editor.model';
import { TruncatePipe } from '../../utils/truncate.pipe';

@Component({
  selector: 'app-ai-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TruncatePipe],
  templateUrl: './ai-panel.component.html',
  styleUrls: ['./ai-panel.component.scss']
})
export class AIPanelComponent implements OnDestroy {
  @Output() close = new EventEmitter<void>();
  @Output() imageGenerated = new EventEmitter<string>(); // base64 image

  public aiForm: FormGroup;
  public isGenerating = false;
  public progress = 0;
  public error: string | null = null;
  public showAdvanced = false;
  public generationHistory: any[] = [];

  private subscriptions: Subscription[] = [];

  public models: { id: AIModel; name: string; description: string }[] = [
    { id: 'stable-diffusion', name: 'Stable Diffusion XL', description: 'High quality text to image generation' },
    { id: 'qwen-image-edit', name: 'Stable Diffusion 2.1', description: 'Image editing and manipulation' },
    { id: 'google-imagen', name: 'Google Imagen', description: 'High quality image generation' }
  ];

  public promptSuggestions = [
    'A beautiful landscape with mountains and lakes, digital art',
    'A futuristic cityscape at night, cyberpunk style',
    'A cute cartoon character in a magical forest',
    'An abstract geometric pattern with vibrant colors',
    'A portrait of a person in renaissance painting style'
  ];

  constructor(
    private fb: FormBuilder,
    private aiService: AIImageService
  ) {
    this.aiForm = this.createForm();

    // 订阅AI服务状态
    this.subscriptions.push(
      this.aiService.generating$.subscribe(generating => {
        this.isGenerating = generating;
      }),
      this.aiService.progress$.subscribe(progress => {
        this.progress = progress;
      }),
      this.aiService.error$.subscribe(error => {
        this.error = error;
      }),
      this.aiService.history$.subscribe(history => {
        this.generationHistory = history;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private createForm(): FormGroup {
    return this.fb.group({
      prompt: ['', [Validators.required, Validators.minLength(5)]],
      model: ['stable-diffusion', Validators.required],
      width: [512, [Validators.min(64), Validators.max(1024)]],
      height: [512, [Validators.min(64), Validators.max(1024)]],
      steps: [20, [Validators.min(1), Validators.max(50)]],
      guidanceScale: [7.5, [Validators.min(1), Validators.max(20)]],
      seed: [null]
    });
  }

  onGenerate(): void {
    if (this.aiForm.valid && !this.isGenerating) {
      const formValue = this.aiForm.value;

      const request: AIGenerationRequest = {
        prompt: formValue.prompt,
        model: formValue.model,
        parameters: {
          width: formValue.width,
          height: formValue.height,
          steps: formValue.steps,
          guidanceScale: formValue.guidanceScale,
          seed: formValue.seed
        }
      };

      this.aiService.generateImage(request).subscribe({
        next: (response) => {
          if (response.image) {
            this.imageGenerated.emit(response.image);
            this.close.emit(); // 生成成功后关闭面板
          }
        },
        error: (error) => {
          console.error('Generation failed:', error);
        }
      });
    }
  }

  onUseSuggestion(suggestion: string): void {
    this.aiForm.patchValue({ prompt: suggestion });
  }

  onRetry(): void {
    this.error = null;
    this.aiService.clearError();
    this.onGenerate();
  }

  onUseHistoryImage(imageData: string): void {
    this.imageGenerated.emit(imageData);
    this.close.emit();
  }

  onToggleFavorite(item: any): void {
    this.aiService.toggleFavorite(item.id);
  }

  onDeleteHistory(item: any): void {
    this.aiService.deleteFromHistory(item.id);
  }

  closePanel(): void {
    this.close.emit();
  }

  get canGenerate(): boolean {
    return this.aiForm.valid && !this.isGenerating;
  }
}
