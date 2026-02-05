/**
 * Application Controller Module
 * Main controller that orchestrates all modules
 */

import { CONFIG, GESTURES } from '../config/config.js';
import { ROUTES } from '../config/routes.js';
import { router } from '../core/router.js';
import { EventBus } from '../core/eventBus.js';
import { appState } from '../core/state.js';
import { stateDetector } from '../ml/stateDetector.js';
import { gestureDetector } from '../ml/gestureDetector.js';
import { pageRenderer } from '../ui/pageRenderer.js';
import { animationManager } from '../ui/animationManager.js';
import { audioManager } from '../ui/audioManager.js';
import { debugPanel } from '../ui/debugPanel.js';

class AppController {
    constructor() {
        this.isInitialized = false;
        this.animationFrameId = null;
    }

    /**
     * Initialize the entire application
     */
    async initialize() {
        console.log('Initializing MAInD Wama...');

        try {
            // Initialize UI components
            pageRenderer.initialize();
            animationManager.initialize();
            audioManager.initialize();
            debugPanel.initialize();

            // Setup event listeners
            this.setupEventListeners();

            // Handle initial route
            const { name, config } = router.getCurrentRoute();
            await this.handleRouteChange(name, config);

            this.isInitialized = true;
            console.log('MAInD Wama initialized successfully');

            return true;
        } catch (error) {
            console.error('Failed to initialize application:', error);
            pageRenderer.showError('Failed to initialize application');
            return false;
        }
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Route changes
        router.onRouteChange(async (routeName, config) => {
            await this.handleRouteChange(routeName, config);
        });

        // Detection start request
        EventBus.on('detection:start', () => {
            this.startDetection();
        });

        // Detection stop request
        EventBus.on('detection:stop', () => {
            this.stopDetection();
        });

        // ML class changes
        EventBus.on('ml:classChanged', (data) => {
            this.handleClassChange(data.newClass, data.oldClass);
        });

        // Gesture confirmed
        EventBus.on('gesture:confirmed', (data) => {
            this.handleGestureConfirmed(data.gesture);
        });
    }

    /**
     * Handle route change
     */
    async handleRouteChange(routeName, config) {
        console.log(`Route changed to: ${routeName}`);

        // Render page
        pageRenderer.render(routeName, config);

        // Load animations
        await animationManager.loadAnimation(config);

        // Play audio
        audioManager.playForRoute(config);

        // Update debug
        debugPanel.updateElement('currentRoute', routeName);
    }

    /**
     * Start ML detection
     */
    async startDetection() {
        console.log('Starting detection...');

        try {
            // Initialize ML models
            await Promise.all([
                stateDetector.initialize(),
                gestureDetector.initialize()
            ]);

            // Setup webcam
            await stateDetector.setupWebcam();

            // Start running
            appState.set('isRunning', true);
            appState.set('lastFpsUpdate', Date.now());

            // Start prediction loop
            this.runPredictionLoop();

            // Navigate to hello
            router.navigate('hello');

            console.log('Detection started');
        } catch (error) {
            console.error('Failed to start detection:', error);
            appState.set('isRunning', false);
        }
    }

    /**
     * Stop ML detection
     */
    stopDetection() {
        console.log('Stopping detection...');

        appState.set('isRunning', false);

        // Cancel animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Cleanup
        stateDetector.cleanup();
        gestureDetector.cleanup();
        appState.resetMusicFlow();
        appState.resetTaskTracking();

        // Navigate to idle
        router.navigate('idle');

        console.log('Detection stopped');
    }

    /**
     * Main prediction loop
     */
    async runPredictionLoop() {
        if (!appState.get('isRunning')) return;

        const now = Date.now();

        // Update webcam frame
        stateDetector.updateFrame();

        // Run state prediction
        const predictions = await stateDetector.predict();
        if (predictions) {
            const result = stateDetector.processPredictionBuffer(predictions);

            // Update debug display
            debugPanel.updateProbabilities(predictions);
            debugPanel.updateBufferVotes(result.voteCounts, appState.get('predictionBuffer').length);

            // Handle class change
            if (result.newClass !== null) {
                appState.set('currentClass', result.newClass);
                appState.set('lastClassChange', now);
                this.handleClassChange(result.newClass, result.oldClass);
            }
        }

        // Update task tracking
        this.updateTaskState();

        // Run gesture detection if active
        if (appState.get('gestureDetectionActive') && !appState.get('confirmedGesture')) {
            const webcam = appState.get('webcam');
            if (webcam) {
                await gestureDetector.processFrame(webcam.canvas);
            }
        }

        // Handle music question flow
        const currentClass = appState.get('currentClass');
        if (currentClass === 3 && appState.get('isLongTask') && !appState.get('musicQuestionAnswered')) {
            this.handleMusicQuestionFlow(now);
        }

        // Update gesture debug
        debugPanel.updateGestureInfo();

        // Track FPS
        this.updateFPS(now);

        // Request next frame
        this.animationFrameId = requestAnimationFrame(() => this.runPredictionLoop());
    }

    /**
     * Handle ML class change
     */
    handleClassChange(newClass, oldClass) {
        console.log(`Class change: ${oldClass} → ${newClass}`);

        // Determine route based on class and state
        const route = this.getRouteForClass(newClass, oldClass);
        
        if (route && route !== router.getCurrentRoute().name) {
            router.navigate(route);
        }

        // Reset states when leaving class 3
        if (oldClass === 3 && newClass !== 3) {
            appState.resetMusicFlow();
            appState.resetTaskTracking();
            audioManager.stop();
        }

        // Start task timer when entering class 3
        if (newClass === 3 && oldClass !== 3) {
            appState.set('taskStartTime', Date.now());
        }
    }

    /**
     * Determine route based on ML class
     */
    getRouteForClass(newClass, oldClass) {
        const taskDuration = appState.get('taskDuration');
        const musicResponse = appState.get('musicResponse');

        switch (newClass) {
            case 1:
                return 'idle';
            case 2:
                // If coming from class 4 (interruption), show "you're back"
                if (oldClass === 4) {
                    return 'youreback';
                }
                return 'hello';
            case 3:
                // Determine sub-state based on task duration
                if (taskDuration >= 20 && !appState.get('musicQuestionAnswered')) {
                    return 'askmusic';
                }
                if (musicResponse === 'yes') {
                    return 'musicplaying';
                }
                return 'working';
            case 4:
                return 'worried';
            default:
                return null;
        }
    }

    /**
     * Update task duration tracking
     */
    updateTaskState() {
        const currentClass = appState.get('currentClass');
        const taskStartTime = appState.get('taskStartTime');

        if (currentClass === 3 && taskStartTime) {
            const duration = Math.floor((Date.now() - taskStartTime) / 1000);
            appState.set('taskDuration', duration);
            debugPanel.updateElement('taskDuration', `${duration}s`);

            // Check for long task
            if (!appState.get('isLongTask') && duration >= CONFIG.longTaskThreshold) {
                appState.set('isLongTask', true);
                console.log('Task became long at', duration, 'seconds');
            }
        }
    }

    /**
     * Handle music question flow
     */
    handleMusicQuestionFlow(now) {
        // Show question
        if (!appState.get('musicQuestionAsked')) {
            appState.set('musicQuestionAsked', true);
            appState.set('musicQuestionStartTime', now);
            router.navigate('askmusic');
            console.log('Music question displayed');
            return;
        }

        const timeSinceQuestion = now - appState.get('musicQuestionStartTime');

        // Reading time countdown
        if (timeSinceQuestion < CONFIG.questionReadingTime) {
            const countdown = Math.ceil((CONFIG.questionReadingTime - timeSinceQuestion) / 1000);
            debugPanel.updateQuestionTimer(countdown);
            return;
        }

        // Enable gesture detection
        const gestureWindowTime = timeSinceQuestion - CONFIG.questionReadingTime;

        if (gestureWindowTime < CONFIG.gestureResponseWindow) {
            if (!appState.get('gestureDetectionActive')) {
                appState.set('gestureDetectionActive', true);
                console.log('Gesture detection enabled');
            }

            // Process gesture
            if (appState.get('handLandmarks')) {
                const result = gestureDetector.detectGesture();
                const holdResult = gestureDetector.handleGestureResult(result);

                if (holdResult && !holdResult.pending) {
                    this.handleGestureConfirmed(holdResult.gesture);
                }
            } else {
                gestureDetector.resetHold();
            }

            // Update timer
            const remaining = Math.ceil((CONFIG.gestureResponseWindow - gestureWindowTime) / 1000);
            debugPanel.updateQuestionTimer(remaining);
            return;
        }

        // Timeout
        console.log('Gesture detection timeout');
        appState.set('musicQuestionAnswered', true);
        appState.set('gestureDetectionActive', false);
        appState.set('musicResponse', 'timeout');
        router.navigate('working');
    }

    /**
     * Handle confirmed gesture
     */
    handleGestureConfirmed(gesture) {
        appState.set('confirmedGesture', gesture);
        appState.set('musicQuestionAnswered', true);
        appState.set('gestureDetectionActive', false);

        if (gesture === GESTURES.YES) {
            appState.set('musicResponse', 'yes');
            router.navigate('musicplaying');
            console.log('User confirmed: YES');
        } else if (gesture === GESTURES.NO) {
            appState.set('musicResponse', 'no');
            router.navigate('working');
            console.log('User confirmed: NO');
        }
    }

    /**
     * Update FPS counter
     */
    updateFPS(now) {
        const frameCount = appState.get('frameCount') + 1;
        appState.set('frameCount', frameCount);

        if (now - appState.get('lastFpsUpdate') >= 1000) {
            appState.set('currentFps', frameCount);
            appState.set('frameCount', 0);
            appState.set('lastFpsUpdate', now);
            debugPanel.updateFPS(frameCount);
        }
    }
}

// Export singleton instance
export const appController = new AppController();
export default appController;
