/**
 * State Detector Module
 * Handles Teachable Machine model for state classification
 */

import { CONFIG, CLASSES } from '../config/config.js';
import { appState } from '../core/state.js';
import { EventBus } from '../core/eventBus.js';

class StateDetector {
    constructor() {
        this.model = null;
        this.webcam = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the state detection model
     */
    async initialize() {
        try {
            console.log('Loading state detection model...');
            
            this.model = await tmImage.load(
                CONFIG.stateModelURL + 'model.json',
                CONFIG.stateModelURL + 'metadata.json'
            );

            console.log('State model loaded:', this.model.getTotalClasses(), 'classes');
            this.isInitialized = true;
            appState.set('stateModel', this.model);

            EventBus.emit('ml:stateModelLoaded', { classes: this.model.getTotalClasses() });
            return true;
        } catch (error) {
            console.error('Failed to load state model:', error);
            EventBus.emit('ml:stateModelError', { error });
            return false;
        }
    }

    /**
     * Setup webcam for detection
     */
    async setupWebcam() {
        try {
            this.webcam = new tmImage.Webcam(
                CONFIG.webcamWidth,
                CONFIG.webcamHeight,
                CONFIG.flipWebcam
            );

            await this.webcam.setup();
            await this.webcam.play();

            appState.set('webcam', this.webcam);
            EventBus.emit('ml:webcamReady', { webcam: this.webcam });

            return this.webcam;
        } catch (error) {
            console.error('Failed to setup webcam:', error);
            EventBus.emit('ml:webcamError', { error });
            throw error;
        }
    }

    /**
     * Stop webcam
     */
    stopWebcam() {
        if (this.webcam) {
            this.webcam.stop();
            this.webcam = null;
            appState.set('webcam', null);
        }
    }

    /**
     * Get webcam canvas for display/processing
     */
    getWebcamCanvas() {
        return this.webcam?.canvas;
    }

    /**
     * Update webcam frame
     */
    updateFrame() {
        if (this.webcam) {
            this.webcam.update();
        }
    }

    /**
     * Run prediction on current frame
     */
    async predict() {
        if (!this.model || !this.webcam) {
            return null;
        }

        const predictions = await this.model.predict(this.webcam.canvas);
        return predictions;
    }

    /**
     * Get the active class from predictions
     */
    getActiveClass(predictions) {
        let maxIndex = 0;
        let maxConfidence = 0;

        for (let i = 0; i < predictions.length; i++) {
            if (predictions[i].probability > maxConfidence) {
                maxConfidence = predictions[i].probability;
                maxIndex = i;
            }
        }

        // Return null if confidence is too low
        if (maxConfidence < CONFIG.minConfidenceThreshold) {
            return null;
        }

        return maxIndex + 1; // Classes are 1-indexed
    }

    /**
     * Process prediction buffer and determine majority class
     */
    processPredictionBuffer(predictions) {
        const now = Date.now();
        const classNum = this.getActiveClass(predictions);
        
        // Vote for current class or status quo
        const vote = classNum !== null ? classNum : (appState.get('currentClass') || 1);
        
        const buffer = appState.get('predictionBuffer');
        buffer.push(vote);
        
        if (buffer.length > CONFIG.predictionBufferSize) {
            buffer.shift();
        }
        
        appState.set('predictionBuffer', buffer);

        // Count votes
        const voteCounts = {};
        for (const v of buffer) {
            voteCounts[v] = (voteCounts[v] || 0) + 1;
        }

        // Find majority
        let majorityClass = appState.get('currentClass');
        let majorityCount = 0;
        
        for (const [cls, count] of Object.entries(voteCounts)) {
            if (count > majorityCount) {
                majorityCount = count;
                majorityClass = parseInt(cls);
            }
        }

        const majorityRatio = majorityCount / buffer.length;

        // Check for state change
        const currentClass = appState.get('currentClass');
        const lastClassChange = appState.get('lastClassChange');

        if (majorityClass !== currentClass 
            && majorityRatio >= CONFIG.majorityThreshold
            && (now - lastClassChange) > CONFIG.stateDebounceMs) {
            
            return {
                newClass: majorityClass,
                oldClass: currentClass,
                confidence: majorityRatio,
                voteCounts
            };
        }

        return {
            newClass: null,
            currentClass,
            confidence: majorityRatio,
            voteCounts
        };
    }

    /**
     * Get class info by number
     */
    getClassInfo(classNum) {
        return CLASSES[classNum] || null;
    }

    /**
     * Check if model is ready
     */
    isReady() {
        return this.isInitialized && this.model !== null;
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.stopWebcam();
        this.model = null;
        this.isInitialized = false;
    }
}

// Export singleton instance
export const stateDetector = new StateDetector();
export default stateDetector;
