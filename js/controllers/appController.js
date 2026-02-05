/**
 * Application Controller Module
 * Main controller that orchestrates all modules
 * 
 * Flow Chart Implementation:
 * 0. IDLE → 1. Person Arrives → 2. Task Begins → branches to:
 *    - 5. Session Ends (task off)
 *    - 5. Interruption Scenario (person leaves, water on)
 *    - 7. Long Task Scenario (>20s) → 4. Music Playing
 *    - 6. Return After Absence (person returns from interruption)
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

// =============================================================================
// FLOW STATES (matching flowchart)
// =============================================================================
const FLOW_STATE = {
    IDLE: 'idle',                           // 0. Idle State - No person
    PERSON_ARRIVED: 'person_arrived',       // 1. Person Arrives at Sink - Say HI
    TASK_ACTIVE: 'task_active',             // 2. Task Begins - Silent observation
    LONG_TASK: 'long_task',                 // 7. Long Task Scenario - Ask music
    MUSIC_PLAYING: 'music_playing',         // 4. Music Playing - Dance
    INTERRUPTION: 'interruption',           // 5. Interruption Scenario - Worried
    RETURN_AFTER_ABSENCE: 'return_after',   // 6. Return After Absence - Relief
    SESSION_ENDS: 'session_ends'            // 5. Session Ends - Goodbye
};

// Timing thresholds (from flowchart)
const TIMING = {
    INACTIVITY_TIMEOUT: 2000,       // 2 sec without activity → sleep
    LONG_TASK_THRESHOLD: 20000,     // 20 sec for long task scenario
    MUSIC_COOLDOWN: 300000,         // 5 min before asking music again
    GESTURE_TIMEOUT: 25000,         // 25 sec to respond to music question
    WORRY_DELAY: 10000,             // 10-15 sec before showing worry
    SUDDEN_WAVE_CHECK: 5000,        // 5 sec sudden wave start check
    RELIEF_DURATION: 3000,          // 3 sec to show relief message
    GOODBYE_DURATION: 5000          // 5 sec to show goodbye
};

class AppController {
    constructor() {
        this.isInitialized = false;
        this.animationFrameId = null;
        
        // Flow state machine
        this.flowState = FLOW_STATE.IDLE;
        this.previousFlowState = null;
        
        // Timing trackers
        this.personArrivedTime = null;
        this.taskStartTime = null;
        this.interruptionStartTime = null;
        this.lastMusicAskTime = null;
        this.inactivityStartTime = null;
        
        // Flags
        this.musicAsked = false;
        this.musicResponse = null;
        this.gestureDetectionActive = false;
        this.gestureStartTime = null;
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

            // Initialize to IDLE state
            this.transitionTo(FLOW_STATE.IDLE);

            // Start prediction loop
            this.runPredictionLoop();

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
        this.resetAllState();

        // Navigate to idle
        router.navigate('idle');

        console.log('Detection stopped');
    }

    /**
     * Reset all tracking state
     */
    resetAllState() {
        this.flowState = FLOW_STATE.IDLE;
        this.previousFlowState = null;
        this.personArrivedTime = null;
        this.taskStartTime = null;
        this.interruptionStartTime = null;
        this.inactivityStartTime = null;
        this.musicAsked = false;
        this.musicResponse = null;
        this.gestureDetectionActive = false;
        this.gestureStartTime = null;
        
        appState.resetMusicFlow();
        appState.resetTaskTracking();
        audioManager.stop();
    }

    /**
     * Transition to a new flow state
     */
    transitionTo(newState) {
        if (newState === this.flowState) return;

        console.log(`Flow: ${this.flowState} → ${newState}`);
        this.previousFlowState = this.flowState;
        this.flowState = newState;

        // Handle state entry actions
        this.onStateEnter(newState);

        // Navigate to corresponding route
        const route = this.getRouteForFlowState(newState);
        if (route) {
            router.navigate(route);
        }

        // Update debug
        debugPanel.updateElement('mlClass', newState);
    }

    /**
     * Actions to perform when entering a state
     */
    onStateEnter(state) {
        const now = Date.now();

        switch (state) {
            case FLOW_STATE.IDLE:
                this.resetAllState();
                this.flowState = FLOW_STATE.IDLE; // Keep after reset
                break;

            case FLOW_STATE.PERSON_ARRIVED:
                // 1. Person Arrives - Say HI, start tracking
                this.personArrivedTime = now;
                this.inactivityStartTime = now;
                console.log('Wama says HI');
                break;

            case FLOW_STATE.TASK_ACTIVE:
                // 2. Task Begins - Start timing
                if (!this.taskStartTime) {
                    this.taskStartTime = now;
                }
                console.log('Task started - Wama observing');
                break;

            case FLOW_STATE.LONG_TASK:
                // 7. Long Task - Ask music question
                if (this.canAskMusic()) {
                    this.gestureDetectionActive = true;
                    this.gestureStartTime = now;
                    this.lastMusicAskTime = now;
                    this.musicAsked = true;
                    console.log('Long task - Wama asks: Want some music?');
                }
                break;

            case FLOW_STATE.MUSIC_PLAYING:
                // 4. Music Playing - Dance
                this.musicResponse = 'yes';
                this.gestureDetectionActive = false;
                console.log('Music playing - Wama dances');
                break;

            case FLOW_STATE.INTERRUPTION:
                // 5. Interruption - Person left, water still on
                this.interruptionStartTime = now;
                console.log('Interruption - Wama worried');
                break;

            case FLOW_STATE.RETURN_AFTER_ABSENCE:
                // 6. Return After Absence - Relief
                console.log('Person returned - Wama relieved: Oh, you\'re back!');
                // After showing relief, go back to task
                setTimeout(() => {
                    if (this.flowState === FLOW_STATE.RETURN_AFTER_ABSENCE) {
                        this.transitionTo(FLOW_STATE.TASK_ACTIVE);
                    }
                }, TIMING.RELIEF_DURATION);
                break;

            case FLOW_STATE.SESSION_ENDS:
                // 5. Session Ends - Goodbye
                console.log('Session ends - Wama says goodbye');
                // After goodbye, return to idle
                setTimeout(() => {
                    if (this.flowState === FLOW_STATE.SESSION_ENDS) {
                        this.transitionTo(FLOW_STATE.IDLE);
                    }
                }, TIMING.GOODBYE_DURATION);
                break;
        }
    }

    /**
     * Get route for flow state
     */
    getRouteForFlowState(state) {
        const stateRouteMap = {
            [FLOW_STATE.IDLE]: 'idle',
            [FLOW_STATE.PERSON_ARRIVED]: 'hello',
            [FLOW_STATE.TASK_ACTIVE]: 'working',
            [FLOW_STATE.LONG_TASK]: 'askmusic',
            [FLOW_STATE.MUSIC_PLAYING]: 'musicplaying',
            [FLOW_STATE.INTERRUPTION]: 'worried',
            [FLOW_STATE.RETURN_AFTER_ABSENCE]: 'youreback',
            [FLOW_STATE.SESSION_ENDS]: 'bye'
        };
        return stateRouteMap[state];
    }

    /**
     * Check if we can ask about music (cooldown)
     */
    canAskMusic() {
        if (!this.lastMusicAskTime) return true;
        return (Date.now() - this.lastMusicAskTime) > TIMING.MUSIC_COOLDOWN;
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

            // Get ML detection results
            const mlClass = result.newClass || appState.get('currentClass');
            if (result.newClass !== null) {
                appState.set('currentClass', result.newClass);
                appState.set('lastClassChange', now);
            }

            // Process flow state machine based on ML class
            this.processFlowStateMachine(mlClass, now);
        }

        // Process gesture detection if active
        if (this.gestureDetectionActive) {
            await this.processGestureDetection(now);
        }

        // Update debug
        debugPanel.updateGestureInfo();

        // Track FPS
        this.updateFPS(now);

        // Request next frame
        this.animationFrameId = requestAnimationFrame(() => this.runPredictionLoop());
    }

    /**
     * Process flow state machine based on ML class detection
     * 
     * ML Classes:
     * 1 = Idle (no person, no water)
     * 2 = Detection (person present, no water)
     * 3 = Task (person present, water on)
     * 4 = Interruption (no person, water on)
     */
    processFlowStateMachine(mlClass, now) {
        const personPresent = (mlClass === 2 || mlClass === 3);
        const waterOn = (mlClass === 3 || mlClass === 4);

        switch (this.flowState) {
            // =================================================================
            // 0. IDLE STATE - Waiting for person
            // =================================================================
            case FLOW_STATE.IDLE:
                // Person Present? → YES → Go to PERSON_ARRIVED
                if (personPresent) {
                    this.transitionTo(FLOW_STATE.PERSON_ARRIVED);
                }
                break;

            // =================================================================
            // 1. PERSON ARRIVED - Said HI, waiting for tap
            // =================================================================
            case FLOW_STATE.PERSON_ARRIVED:
                // Tap is on? → YES → Go to TASK_ACTIVE
                if (waterOn && personPresent) {
                    this.transitionTo(FLOW_STATE.TASK_ACTIVE);
                }
                // Person left without turning on tap?
                else if (!personPresent) {
                    // Check 2 sec inactivity timeout
                    if (now - this.inactivityStartTime > TIMING.INACTIVITY_TIMEOUT) {
                        // Wama full asleep animation → back to IDLE
                        this.transitionTo(FLOW_STATE.IDLE);
                    }
                }
                // Person still here, tap not on yet - keep waiting
                else {
                    this.inactivityStartTime = now; // Reset inactivity timer
                }
                break;

            // =================================================================
            // 2. TASK ACTIVE - Working, observing
            // =================================================================
            case FLOW_STATE.TASK_ACTIVE:
                // Person leaves but water still on? → INTERRUPTION
                if (!personPresent && waterOn) {
                    this.transitionTo(FLOW_STATE.INTERRUPTION);
                }
                // Task off (water off)? → SESSION_ENDS
                else if (!waterOn) {
                    this.transitionTo(FLOW_STATE.SESSION_ENDS);
                }
                // Still working - check for long task
                else if (personPresent && waterOn) {
                    const taskDuration = now - this.taskStartTime;
                    appState.set('taskDuration', Math.floor(taskDuration / 1000));
                    debugPanel.updateElement('taskDuration', `${Math.floor(taskDuration / 1000)}s`);

                    // Task > 20s? → LONG_TASK (ask music)
                    if (taskDuration > TIMING.LONG_TASK_THRESHOLD && !this.musicAsked && this.canAskMusic()) {
                        this.transitionTo(FLOW_STATE.LONG_TASK);
                    }
                }
                break;

            // =================================================================
            // 7. LONG TASK - Asking about music
            // =================================================================
            case FLOW_STATE.LONG_TASK:
                // Person leaves but water still on? → INTERRUPTION
                if (!personPresent && waterOn) {
                    this.gestureDetectionActive = false;
                    this.transitionTo(FLOW_STATE.INTERRUPTION);
                }
                // Task off? → SESSION_ENDS
                else if (!waterOn) {
                    this.gestureDetectionActive = false;
                    this.transitionTo(FLOW_STATE.SESSION_ENDS);
                }
                // Check gesture timeout (25 seconds)
                else if (this.gestureStartTime && (now - this.gestureStartTime > TIMING.GESTURE_TIMEOUT)) {
                    console.log('Gesture timeout - no response');
                    this.gestureDetectionActive = false;
                    this.musicResponse = 'timeout';
                    this.transitionTo(FLOW_STATE.TASK_ACTIVE);
                }
                // Update countdown
                else {
                    const remaining = Math.ceil((TIMING.GESTURE_TIMEOUT - (now - this.gestureStartTime)) / 1000);
                    debugPanel.updateQuestionTimer(remaining);
                }
                break;

            // =================================================================
            // 4. MUSIC PLAYING - Dancing
            // =================================================================
            case FLOW_STATE.MUSIC_PLAYING:
                // Person leaves but water still on? → INTERRUPTION
                if (!personPresent && waterOn) {
                    audioManager.pause(); // Pause music during interruption
                    this.transitionTo(FLOW_STATE.INTERRUPTION);
                }
                // Task off? → SESSION_ENDS
                else if (!waterOn) {
                    audioManager.stop();
                    this.transitionTo(FLOW_STATE.SESSION_ENDS);
                }
                // Keep playing, update task duration
                else {
                    const taskDuration = now - this.taskStartTime;
                    appState.set('taskDuration', Math.floor(taskDuration / 1000));
                }
                break;

            // =================================================================
            // 5. INTERRUPTION - Worried (water on, person gone)
            // =================================================================
            case FLOW_STATE.INTERRUPTION:
                // Person returns? → RETURN_AFTER_ABSENCE
                if (personPresent) {
                    this.transitionTo(FLOW_STATE.RETURN_AFTER_ABSENCE);
                }
                // Water turned off remotely? → SESSION_ENDS
                else if (!waterOn) {
                    this.transitionTo(FLOW_STATE.SESSION_ENDS);
                }
                // Still worried - update worry duration
                else {
                    const worryDuration = now - this.interruptionStartTime;
                    debugPanel.updateElement('taskDuration', `Worried: ${Math.floor(worryDuration / 1000)}s`);
                }
                break;

            // =================================================================
            // 6. RETURN AFTER ABSENCE - Relief
            // =================================================================
            case FLOW_STATE.RETURN_AFTER_ABSENCE:
                // Auto-transitions to TASK_ACTIVE after timeout
                // But check if person leaves again
                if (!personPresent && waterOn) {
                    this.transitionTo(FLOW_STATE.INTERRUPTION);
                }
                else if (!waterOn) {
                    this.transitionTo(FLOW_STATE.SESSION_ENDS);
                }
                break;

            // =================================================================
            // 5. SESSION ENDS - Goodbye
            // =================================================================
            case FLOW_STATE.SESSION_ENDS:
                // Auto-transitions to IDLE after timeout
                // But if person starts again, go back
                if (personPresent && waterOn) {
                    this.transitionTo(FLOW_STATE.TASK_ACTIVE);
                }
                break;
        }
    }

    /**
     * Process gesture detection for music question
     */
    async processGestureDetection(now) {
        const webcam = appState.get('webcam');
        if (!webcam) return;

        // Send frame to MediaPipe
        await gestureDetector.processFrame(webcam.canvas);

        // Check for hand landmarks
        if (appState.get('handLandmarks')) {
            const result = gestureDetector.detectGesture();
            const holdResult = gestureDetector.handleGestureResult(result);

            if (holdResult && !holdResult.pending) {
                // Gesture confirmed!
                this.handleGestureResponse(holdResult.gesture);
            }
        } else {
            gestureDetector.resetHold();
        }
    }

    /**
     * Handle confirmed gesture response
     */
    handleGestureResponse(gesture) {
        console.log(`Gesture confirmed: ${gesture}`);
        this.gestureDetectionActive = false;

        if (gesture === GESTURES.YES) {
            // Thumbs up → Play music
            this.transitionTo(FLOW_STATE.MUSIC_PLAYING);
        } else if (gesture === GESTURES.NO) {
            // Thumbs down → Back to working without music
            this.musicResponse = 'no';
            this.transitionTo(FLOW_STATE.TASK_ACTIVE);
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
