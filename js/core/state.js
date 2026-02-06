/**
 * Application State Module
 * Centralized state management
 */

import { EventBus } from './eventBus.js';

class AppState {
    constructor() {
        this.state = {
            // ML Models
            stateModel: null,
            handsDetector: null,
            webcam: null,
            isRunning: false,
            detectionStartedOnce: false,

            // State detection
            currentClass: null,
            lastClassChange: 0,
            predictionBuffer: [],

            // Task tracking
            taskStartTime: null,
            taskDuration: 0,
            isLongTask: false,

            // Music question flow
            musicQuestionAsked: false,
            musicQuestionAnswered: false,
            musicQuestionStartTime: null,
            gestureDetectionActive: false,

            // Hand tracking (MediaPipe)
            handLandmarks: null,
            handedness: null,

            // Gesture hold validation
            gestureHoldStart: null,
            currentGesture: null,
            confirmedGesture: null,
            musicResponse: null,

            // Debug data
            debugGeo: { thumbVertical: 0, fingersCurled: false },

            // FPS tracking
            frameCount: 0,
            lastFpsUpdate: 0,
            currentFps: 0,

            // UI State
            currentRoute: null,
            currentAnimation: null,

            // Debug modes
            gestureTestMode: false
        };
    }

    /**
     * Get a state value
     * @param {string} key - State key (supports dot notation)
     */
    get(key) {
        if (key.includes('.')) {
            return key.split('.').reduce((obj, k) => obj?.[k], this.state);
        }
        return this.state[key];
    }

    /**
     * Set a state value
     * @param {string} key - State key
     * @param {any} value - New value
     */
    set(key, value) {
        const oldValue = this.state[key];
        this.state[key] = value;

        // Emit state change event
        EventBus.emit('state:change', { key, oldValue, newValue: value });
        EventBus.emit(`state:${key}`, { oldValue, newValue: value });
    }

    /**
     * Update multiple state values at once
     * @param {Object} updates - Object with key-value pairs
     */
    update(updates) {
        Object.entries(updates).forEach(([key, value]) => {
            this.set(key, value);
        });
    }

    /**
     * Reset state to initial values
     */
    reset() {
        this.state = {
            stateModel: null,
            handsDetector: null,
            webcam: null,
            isRunning: false,
            currentClass: null,
            lastClassChange: 0,
            predictionBuffer: [],
            taskStartTime: null,
            taskDuration: 0,
            isLongTask: false,
            musicQuestionAsked: false,
            musicQuestionAnswered: false,
            musicQuestionStartTime: null,
            gestureDetectionActive: false,
            handLandmarks: null,
            handedness: null,
            gestureHoldStart: null,
            currentGesture: null,
            confirmedGesture: null,
            musicResponse: null,
            debugGeo: { thumbVertical: 0, fingersCurled: false },
            frameCount: 0,
            lastFpsUpdate: 0,
            currentFps: 0,
            currentRoute: null,
            currentAnimation: null
        };

        EventBus.emit('state:reset');
    }

    /**
     * Reset music flow related state
     */
    resetMusicFlow() {
        this.update({
            musicQuestionAsked: false,
            musicQuestionAnswered: false,
            musicQuestionStartTime: null,
            gestureDetectionActive: false,
            gestureHoldStart: null,
            currentGesture: null,
            confirmedGesture: null,
            musicResponse: null,
            handLandmarks: null
        });

        EventBus.emit('state:musicFlowReset');
    }

    /**
     * Reset task tracking state
     */
    resetTaskTracking() {
        this.update({
            taskStartTime: null,
            taskDuration: 0,
            isLongTask: false
        });

        EventBus.emit('state:taskReset');
    }

    /**
     * Get all state (for debugging)
     */
    getAll() {
        return { ...this.state };
    }
}

// Export singleton instance
export const appState = new AppState();
export default appState;
