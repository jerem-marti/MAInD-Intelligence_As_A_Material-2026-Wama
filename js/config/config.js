/**
 * Application Configuration
 * Centralized configuration for all modules
 */

export const CONFIG = {
    // ==========================================================================
    // ML Model Settings
    // ==========================================================================
    stateModelURL: './models/state-model/',

    // Webcam settings
    webcamWidth: 640,
    webcamHeight: 480,
    flipWebcam: true,

    // State detection settings
    stateDebounceMs: 300,
    predictionBufferSize: 10,
    majorityThreshold: 0.6,
    minConfidenceThreshold: 0.55,

    // ==========================================================================
    // MediaPipe Hands Settings
    // ==========================================================================
    handsModelComplexity: 1,
    handsMinDetectionConfidence: 0.7,
    handsMinTrackingConfidence: 0.5,

    // Geometric gesture thresholds
    thumbExtensionThreshold: 0.08,
    fingerCurlThreshold: 0.02,

    // Gesture hold
    gestureHoldDuration: 500,

    // ==========================================================================
    // Music Question Flow
    // ==========================================================================
    longTaskThreshold: 20,
    questionReadingTime: 2000,
    gestureResponseWindow: 8000,
    okMessageDuration: 3000,

    // ==========================================================================
    // Animation Settings
    // ==========================================================================
    lottieDefaultDelay: 1000,
    transitionDuration: 300,

    // ==========================================================================
    // Debug Settings
    // ==========================================================================
    debugEnabled: true,
    showDebugPanel: true
};

// Class definitions (mapped from state model labels)
export const CLASSES = {
    1: { name: "Idle", person: false, water: false },
    2: { name: "Detection", person: true, water: false },
    3: { name: "Task", person: true, water: true },
    4: { name: "Interruption", person: false, water: true }
};

// Gesture identifiers
export const GESTURES = {
    YES: "thumbs_up",
    NO: "thumbs_down",
    NONE: null
};

// Route to ML class mapping
export const ROUTE_CLASS_MAP = {
    'idle': 1,
    'hello': 2,
    'working': 3,
    'askmusic': 3,
    'musicplaying': 3,
    'worried': 4,
    'youreback': 2,
    'bye': 1,
    'sessionfinished': 1
};

export default CONFIG;
