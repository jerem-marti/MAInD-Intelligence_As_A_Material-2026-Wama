# MAInD Wama - Smart Sink Companion

A merged project combining ML-powered state detection with beautiful Lottie animations for an interactive sink companion experience.

## Project Structure

```
MAInD-Wama/
├── index.html                 # Single Page Application entry point
├── README.md                  # This file
│
├── css/                       # Stylesheets (separated by concern)
│   ├── main.css              # Core styles and layout
│   ├── pages.css             # Page-specific styles
│   ├── animations.css        # CSS animations and keyframes
│   └── debug.css             # Debug panel styles
│
├── js/                        # JavaScript modules
│   ├── main.js               # Application entry point
│   │
│   ├── config/               # Configuration files
│   │   ├── config.js         # Application settings
│   │   └── routes.js         # Route definitions
│   │
│   ├── core/                 # Core modules
│   │   ├── router.js         # Hash-based SPA router
│   │   ├── eventBus.js       # Event communication system
│   │   └── state.js          # Centralized state management
│   │
│   ├── ml/                   # Machine Learning modules
│   │   ├── stateDetector.js  # Teachable Machine state detection
│   │   └── gestureDetector.js # MediaPipe hands gesture detection
│   │
│   ├── ui/                   # UI modules
│   │   ├── pageRenderer.js   # Page template rendering
│   │   ├── animationManager.js # Lottie animation management
│   │   ├── audioManager.js   # Audio playback management
│   │   └── debugPanel.js     # Debug information display
│   │
│   └── controllers/          # Controllers
│       └── appController.js  # Main application controller
│
├── models/                    # ML models
│   └── state-model/          # Teachable Machine model
│       ├── model.json
│       └── metadata.json
│
├── assets/                    # Static assets
│   ├── animations/           # Lottie JSON and SVG files
│   │   ├── hello.json
│   │   ├── bye.json
│   │   ├── working.json
│   │   ├── Waves.json
│   │   ├── music-note.json
│   │   ├── worker.svg
│   │   ├── worried.svg
│   │   ├── youreback.svg
│   │   ├── jukebox.svg
│   │   └── dancing.svg
│   │
│   └── audio/                # Audio files
│       ├── music.mp3
│       ├── hello.mp3
│       ├── bye.mp3
│       └── worried.mp3
│
└── images/                    # Image assets (if any)
```

## Architecture

### Separation of Concerns (SoC)

The codebase is organized following key software engineering principles:

1. **Modular Programming**: Each module has a single responsibility
2. **Single Responsibility Principle (SRP)**: Classes and modules handle one specific concern
3. **Code Splitting**: Logical separation into config, core, ML, UI, and controllers

### Hash Router

The application uses a simple hash-based router for SPA navigation:

- Routes are defined in `js/config/routes.js`
- Navigation uses URL hash (`#hello`, `#working`, etc.)
- The router emits events on route changes
- Page content is rendered dynamically without page reloads

### Event-Driven Architecture

Components communicate through a central `EventBus`:

- Decouples modules from each other
- Enables loose coupling between ML and UI
- Makes adding new features easier

### State Management

Centralized state in `js/core/state.js`:

- Single source of truth for app state
- Emits events on state changes
- Enables reactive UI updates

## Routes / States

| Route | Description | ML Class |
|-------|-------------|----------|
| `#idle` | Waiting for detection | Class 1 |
| `#hello` | Person detected | Class 2 |
| `#howareyou` | Greeting continuation | Class 2 |
| `#working` | Person at sink with water | Class 3 |
| `#askmusic` | Asking if user wants music | Class 3 |
| `#musicplaying` | Music is playing | Class 3 |
| `#worried` | Water running, no person | Class 4 |
| `#youreback` | Person returned after absence | Class 2 |
| `#bye` | Session ending | Class 1 |
| `#sessionfinished` | Session complete | Class 1 |

## Setup

1. Copy ML models from `teachable-machine-test-01/models/` to `MAInD-Wama/models/`
2. Copy animation files from `wama-animation/` to `MAInD-Wama/assets/animations/`
3. Add audio files to `MAInD-Wama/assets/audio/`
4. Serve with a local server (required for ES modules and ML models)

## Development

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve

# Using VS Code Live Server extension
# Right-click index.html > "Open with Live Server"
```

## Technologies

- **TensorFlow.js** - ML model inference
- **Teachable Machine** - State classification model
- **MediaPipe Hands** - Gesture recognition
- **Lottie** - Vector animations
- **ES Modules** - Modern JavaScript modules

## Future Improvements

The logic layer is designed to be easily modified:

1. Route-to-class mapping can be customized in `js/config/config.js`
2. New routes can be added in `js/config/routes.js`
3. ML behavior can be adjusted in `js/controllers/appController.js`
4. Animations can be swapped by updating route configurations
