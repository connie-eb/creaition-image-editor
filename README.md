# Creaition Image Editor

A modern, AI-powered image editing application built with Angular, featuring a comprehensive set of drawing tools, shape tools, text editing, filters, and AI image generation capabilities.

## Table of Contents

- [Features](#features)
- [Setup Instructions](#setup-instructions)
- [API Configuration](#api-configuration)
- [Design Decisions](#design-decisions)
- [Challenges Faced](#challenges-faced)
- [Project Structure](#project-structure)
- [Development](#development)

## Features

### Drawing Tools
- **Brush Tool**: Draw with customizable color and width
- **Eraser Tool**: Erase content using canvas background color (white)

### Shape Tools
- **Rectangle**: Draw rectangles with real-time preview
- **Circle**: Draw circles with real-time preview
- Both shapes support customizable fill color, stroke color, and stroke width

### Text Tool
- Add text to canvas with inline text input
- Customizable text properties:
  - Color
  - Font size (8-72px)
  - Font weight (60, 80, 120)
  - Font slant (Normal/Italic)
- Uses strokeWeight font family with variable font support

### Filters
- **Brightness**: Adjust image brightness (0-200%)
- **Contrast**: Adjust image contrast (0-200%)
- **Saturation**: Adjust image saturation (0-200%)
- Real-time preview using CSS filters

### AI Image Generation
- Integration with Hugging Face API
- Support for multiple AI models:
  - Stable Diffusion XL
  - Stable Diffusion 2.1
  - Google Imagen
- Advanced parameters:
  - Steps
  - Guidance scale
  - Seed (optional)
- Generation history with favorites
- Progress tracking

### UI Features
- Responsive design (desktop and mobile)
- Floating panels with smooth animations
- Scrollable properties panel
- Fixed footer at viewport bottom
- Adaptive canvas sizing

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Angular CLI (v19.2.19 or higher)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd <repository-name>
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Edit `src/environments/environment.ts` and add your API tokens:
   ```typescript
   export const environment = {
     production: false,
     aiApis: {
       huggingFace: {
         token: 'your-huggingface-token-here'
       },
       google: {
         projectId: 'your-google-cloud-project-id',
         accessToken: 'your-google-access-token'
       }
     }
   };
   ```

4. **Configure proxy (for development)**
   
   Edit `proxy.conf.json` and update the Authorization header:
   ```json
   {
     "/api/huggingface": {
       "target": "https://api-inference.huggingface.co",
       "secure": true,
       "changeOrigin": true,
       "pathRewrite": {
         "^/api/huggingface": ""
       },
       "headers": {
         "Authorization": "Bearer your-huggingface-token-here"
       }
     }
   }
   ```

5. **Start the development server**
   ```bash
   ng serve
   ```

6. **Open your browser**
   
   Navigate to `http://localhost:4200`

### Building for Production

```bash
ng build --configuration production
```

The build artifacts will be stored in the `dist/` directory.

## API Configuration

### Hugging Face API

1. **Get your API token**
   - Sign up at [Hugging Face](https://huggingface.co/)
   - Go to Settings → Access Tokens
   - Create a new token with read permissions

2. **Update environment.ts**
   ```typescript
   huggingFace: {
     token: 'hf_your_actual_token_here'
   }
   ```

3. **Update proxy.conf.json** (for development)
   ```json
   "headers": {
     "Authorization": "Bearer hf_your_actual_token_here"
   }
   ```

4. **Available Models**
   - Stable Diffusion XL: `stabilityai/stable-diffusion-xl-base-1.0`
   - Stable Diffusion 2.1: `stabilityai/stable-diffusion-2-1`

### Google Imagen API (Optional)

1. **Set up Google Cloud Project**
   - Create a project in Google Cloud Console
   - Enable the Imagen API
   - Create service account and get access token

2. **Update environment.ts**
   ```typescript
   google: {
     projectId: 'your-project-id',
     accessToken: 'your-access-token'
   }
   ```

### Error Handling

The application handles various API errors:
- **401**: Authentication failed
- **403**: Access forbidden
- **404**: API endpoint not found
- **410**: API endpoint no longer available
- **429**: Rate limit exceeded
- **500**: Server error
- **503**: Service unavailable

## Design Decisions

### Creaition Design System

The application follows the Creaition design system principles:

- **Color System**: Primary grey, secondary grey, white, and black
- **Typography**: Custom strokeWeight variable font with weight (60-120) and slant (0-12deg) variations
- **Border Radius**: 
  - Buttons: 50px (pill-shaped)
  - Cards: 1rem
  - Inputs: 0px (sharp corners)
- **Spacing**: Consistent padding and margins using rem units

### Component Architecture

**Standalone Components**: All components are standalone for better tree-shaking and modularity:
- `ImageEditorComponent`: Main editor container
- `ToolbarComponent`: Tool selection and category navigation
- `PropertiesPanelComponent`: Property configuration panel
- `AIPanelComponent`: AI image generation interface

**State Management**: 
- Uses RxJS BehaviorSubject for reactive state management
- EditorState interface defines the application state structure
- State is passed down through components and updated via events

### Canvas Implementation

- **Fixed Height**: Canvas has fixed height (600px desktop, 400px mobile) for consistent layout
- **Responsive Width**: Canvas width adapts to available space
- **High DPI Support**: Canvas resolution scales with device pixel ratio for crisp rendering
- **ResizeObserver**: Automatically adjusts canvas size when container changes

### Layout Strategy

- **Flexbox Layout**: Uses flexbox for responsive layout
- **Fixed Footer**: Footer always visible at viewport bottom
- **Floating Panels**: Properties and AI panels have floating effects with shadows
- **Scrollable Content**: Properties panel content is scrollable with custom scrollbar styling

### Tool Implementation

- **Event-Driven**: Tools respond to mouse/touch events
- **State Preservation**: Shape tools save canvas state for real-time preview
- **Coordinate System**: Proper coordinate transformation for canvas operations
- **Text Input**: Inline text input positioned at click coordinates

## Challenges Faced

### 1. Canvas Resizing and Coordinate System

**Challenge**: Canvas needed to adapt to different screen sizes while maintaining drawing accuracy.

**Solution**: 
- Implemented ResizeObserver to monitor container size changes
- Used device pixel ratio for high-DPI displays
- Proper coordinate transformation between screen and canvas coordinates
- Fixed canvas height with responsive width

### 2. Shape Preview with State Management

**Challenge**: Real-time shape preview required saving and restoring canvas state without flickering.

**Solution**:
- Save canvas ImageData before starting shape drawing
- Restore saved state on each mouse move for preview
- Only commit final shape on mouse release
- Handle negative width/height for drawing in any direction

### 3. Text Input Positioning

**Challenge**: Text input box needed to appear at exact click position on canvas.

**Solution**:
- Calculate coordinates relative to canvas wrapper
- Account for padding and container offsets
- Use absolute positioning with proper z-index
- Handle coordinate conversion between canvas and screen space

### 4. Properties Panel Scrolling

**Challenge**: Properties panel content overflowed but scrolling didn't work properly.

**Solution**:
- Added `min-height: 0` to flex containers
- Set proper `overflow-y: auto` on content area
- Used `flex: 1 1 auto` for proper flex behavior
- Added `align-self: stretch` to ensure proper height

### 5. Footer Positioning

**Challenge**: Footer needed to stay at viewport bottom regardless of content.

**Solution**:
- Changed container from `min-height: 100vh` to `height: 100vh`
- Added `overflow: hidden` to prevent scrolling
- Used flexbox with `flex: 1` for main content area
- Ensured all nested containers have proper `min-height: 0`

### 6. API Error Handling (410 Gone)

**Challenge**: Hugging Face API endpoints became unavailable (410 Gone error).

**Solution**:
- Updated API endpoints to current available models
- Added specific 410 error handling with user-friendly messages
- Improved retry logic to skip retries for 4xx errors
- Updated model names in UI to reflect current endpoints

### 7. Filter Implementation

**Challenge**: Filters needed real-time preview without permanently modifying canvas.

**Solution**:
- Used CSS filters for real-time preview
- Separate method for applying filters permanently to canvas
- Pixel manipulation for brightness, contrast, and saturation
- Reset filter values after permanent application

### 8. Mobile Responsiveness

**Challenge**: Application needed to work well on mobile devices with touch support.

**Solution**:
- Added touch event handlers alongside mouse events
- Responsive breakpoints at 768px
- Mobile-specific modal styles for panels
- Adjusted canvas height for mobile (400px)
- Touch-friendly button sizes and spacing

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── ai-panel/          # AI image generation panel
│   │   ├── image-editor/      # Main editor component
│   │   ├── properties-panel/  # Properties configuration panel
│   │   └── toolbar/           # Toolbar with tool selection
│   ├── models/
│   │   └── image-editor.model.ts  # TypeScript interfaces
│   ├── services/
│   │   └── ai-image.service.ts    # AI API service
│   └── utils/
│       └── truncate.pipe.ts       # Text truncation pipe
├── environments/
│   └── environment.ts             # Environment configuration
└── styles.scss                    # Global styles
```

## Development

### Running Tests

```bash
ng test
```

### Code Scaffolding

Generate a new component:
```bash
ng generate component component-name
```

### Key Technologies

- **Angular 19**: Framework
- **TypeScript**: Language
- **RxJS**: Reactive programming
- **SCSS**: Styling
- **Canvas API**: Drawing operations
- **Hugging Face API**: AI image generation

### Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

This project is private and proprietary.
