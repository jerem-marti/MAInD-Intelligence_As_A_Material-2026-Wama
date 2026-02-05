/**
 * Gesture Detector Module
 * Handles MediaPipe Hands for gesture recognition (thumbs up/down)
 */

import { CONFIG, GESTURES } from '../config/config.js';
import { appState } from '../core/state.js';
import { EventBus } from '../core/eventBus.js';

class GestureDetector {
    constructor() {
        this.hands = null;
        this.isInitialized = false;
    }

    /**
     * Initialize MediaPipe Hands detector
     */
    async initialize() {
        try {
            console.log('Initializing MediaPipe Hands...');

            this.hands = new Hands({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
                }
            });

            this.hands.setOptions({
                maxNumHands: 1,
                modelComplexity: CONFIG.handsModelComplexity,
                minDetectionConfidence: CONFIG.handsMinDetectionConfidence,
                minTrackingConfidence: CONFIG.handsMinTrackingConfidence
            });

            this.hands.onResults(this.onResults.bind(this));

            this.isInitialized = true;
            appState.set('handsDetector', this.hands);

            console.log('MediaPipe Hands initialized');
            EventBus.emit('ml:gestureDetectorReady');

            return this.hands;
        } catch (error) {
            console.error('Failed to initialize gesture detector:', error);
            EventBus.emit('ml:gestureDetectorError', { error });
            throw error;
        }
    }

    /**
     * Callback when MediaPipe Hands processes a frame
     */
    onResults(results) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            appState.set('handLandmarks', results.multiHandLandmarks[0]);
            appState.set('handedness', results.multiHandedness?.[0]?.label || null);
            EventBus.emit('gesture:handDetected', { landmarks: results.multiHandLandmarks[0] });
        } else {
            appState.set('handLandmarks', null);
            appState.set('handedness', null);
            EventBus.emit('gesture:noHand');
        }
    }

    /**
     * Send a frame to MediaPipe for processing
     */
    async processFrame(canvas) {
        if (!this.hands || !canvas) return;

        try {
            await this.hands.send({ image: canvas });
        } catch (error) {
            // Frame not ready, safe to skip
        }
    }

    /**
     * Detect thumbs up/down from hand landmarks using geometry
     * 
     * MediaPipe landmark indices:
     *   0=wrist, 4=thumb_tip
     *   5=index_mcp, 6=index_pip, 8=index_tip
     *   9=middle_mcp, 10=middle_pip, 12=middle_tip
     *   13=ring_mcp, 14=ring_pip, 16=ring_tip
     *   17=pinky_mcp, 18=pinky_pip, 20=pinky_tip
     */
    detectGesture() {
        const landmarks = appState.get('handLandmarks');

        if (!landmarks || landmarks.length !== 21) {
            appState.set('debugGeo', { thumbVertical: 0, fingersCurled: false, curledCount: 0 });
            return { gesture: null };
        }

        const thumbTip = landmarks[4];
        const palmCentre = landmarks[9]; // middle finger MCP

        const indexPIP = landmarks[6];
        const indexTip = landmarks[8];
        const middlePIP = landmarks[10];
        const middleTip = landmarks[12];
        const ringPIP = landmarks[14];
        const ringTip = landmarks[16];
        const pinkyPIP = landmarks[18];
        const pinkyTip = landmarks[20];

        // Positive = thumb ABOVE palm centre (up), negative = BELOW (down)
        const thumbVertical = palmCentre.y - thumbTip.y;

        // Finger curl: tip is below (larger y) its PIP joint
        const indexCurled = indexTip.y > indexPIP.y;
        const middleCurled = middleTip.y > middlePIP.y;
        const ringCurled = ringTip.y > ringPIP.y;
        const pinkyCurled = pinkyTip.y > pinkyPIP.y;

        const curledCount = [indexCurled, middleCurled, ringCurled, pinkyCurled]
            .filter(Boolean).length;
        const fingersCurled = curledCount >= 3;

        // Store debug info
        appState.set('debugGeo', { thumbVertical, fingersCurled, curledCount });

        // THUMBS UP: thumb well above palm centre + fingers curled
        if (thumbVertical > CONFIG.thumbExtensionThreshold && fingersCurled) {
            return { gesture: GESTURES.YES };
        }

        // THUMBS DOWN: thumb well below palm centre + fingers curled
        if (thumbVertical < -CONFIG.thumbExtensionThreshold && fingersCurled) {
            return { gesture: GESTURES.NO };
        }

        return { gesture: null };
    }

    /**
     * Handle gesture result with hold validation
     */
    handleGestureResult(result) {
        if (appState.get('confirmedGesture')) return;

        const { gesture } = result;

        // No gesture detected
        if (!gesture) {
            this.resetHold();
            return null;
        }

        // Gesture changed - reset hold timer
        if (gesture !== appState.get('currentGesture')) {
            appState.set('currentGesture', gesture);
            appState.set('gestureHoldStart', Date.now());
            console.log(`Gesture detected: ${gesture}, starting hold`);
            return null;
        }

        // Calculate hold duration
        const holdDuration = Date.now() - appState.get('gestureHoldStart');

        // Check if held long enough
        if (holdDuration >= CONFIG.gestureHoldDuration) {
            console.log(`Gesture confirmed: ${gesture} after ${holdDuration}ms`);
            return { gesture, holdDuration };
        }

        return { gesture, holdDuration, pending: true };
    }

    /**
     * Reset gesture hold tracking
     */
    resetHold() {
        appState.set('currentGesture', null);
        appState.set('gestureHoldStart', null);
    }

    /**
     * Check if detector is ready
     */
    isReady() {
        return this.isInitialized && this.hands !== null;
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.hands = null;
        this.isInitialized = false;
    }
}

// Export singleton instance
export const gestureDetector = new GestureDetector();
export default gestureDetector;
