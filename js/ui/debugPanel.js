/**
 * Debug Panel Module
 * Handles debug information display
 */

import { appState } from '../core/state.js';
import { EventBus } from '../core/eventBus.js';
import { CONFIG } from '../config/config.js';

class DebugPanel {
    constructor() {
        this.elements = {};
        this.isVisible = CONFIG.showDebugPanel;
    }

    /**
     * Initialize debug panel elements
     */
    initialize() {
        this.elements = {
            panel: document.getElementById('debug-panel'),
            probabilities: document.getElementById('debug-probabilities'),
            bufferVotes: document.getElementById('debug-buffer-votes'),
            gestureActive: document.getElementById('debug-gesture-active'),
            handDetected: document.getElementById('debug-hand-detected'),
            currentGesture: document.getElementById('debug-current-gesture'),
            holdDuration: document.getElementById('debug-hold-duration'),
            questionTimer: document.getElementById('debug-question-timer'),
            musicResponse: document.getElementById('debug-music-response'),
            currentRoute: document.getElementById('debug-current-route'),
            mlClass: document.getElementById('debug-ml-class'),
            taskDuration: document.getElementById('debug-task-duration'),
            fps: document.getElementById('debug-fps')
        };

        // Initialize probability bars
        this.initProbabilityDisplay();

        // Initialize gesture bars
        this.initGestureBars();

        // Subscribe to state changes
        this.subscribeToEvents();

        return true;
    }

    /**
     * Initialize probability bar display
     */
    initProbabilityDisplay() {
        if (!this.elements.probabilities) return;

        const labels = ['Class 1 (Idle)', 'Class 2 (Detection)', 'Class 3 (Task)', 'Class 4 (Interruption)'];
        let html = '';

        for (let i = 0; i < 4; i++) {
            html += `
                <div class="prob-bar">
                    <span class="prob-label">${labels[i]}</span>
                    <div class="prob-track">
                        <div class="prob-fill" id="prob-fill-${i}"></div>
                    </div>
                    <span class="prob-value" id="prob-value-${i}">0%</span>
                </div>
            `;
        }

        this.elements.probabilities.innerHTML = html;
    }

    /**
     * Subscribe to relevant events
     */
    subscribeToEvents() {
        EventBus.on('route:change', (data) => {
            this.updateElement('currentRoute', data.current);
        });

        EventBus.on('state:currentClass', (data) => {
            this.updateElement('mlClass', data.newValue ? `Class ${data.newValue}` : '-');
        });

        EventBus.on('state:taskDuration', (data) => {
            this.updateElement('taskDuration', `${data.newValue}s`);
        });

        EventBus.on('state:musicResponse', (data) => {
            this.updateElement('musicResponse', data.newValue || '-');
        });
    }

    /**
     * Update a single debug element
     */
    updateElement(key, value) {
        if (this.elements[key]) {
            this.elements[key].textContent = value;
        }
    }

    /**
     * Update state model probabilities
     */
    updateProbabilities(predictions) {
        if (!predictions) return;

        const currentClass = appState.get('currentClass');

        for (let i = 0; i < predictions.length; i++) {
            const prob = predictions[i].probability;
            const fillEl = document.getElementById(`prob-fill-${i}`);
            const valueEl = document.getElementById(`prob-value-${i}`);

            if (fillEl && valueEl) {
                fillEl.style.width = `${prob * 100}%`;
                fillEl.className = `prob-fill ${i === (currentClass - 1) ? 'active' : ''}`;
                valueEl.textContent = `${(prob * 100).toFixed(0)}%`;
            }
        }
    }

    /**
     * Update buffer votes display
     */
    updateBufferVotes(voteCounts, bufferLength) {
        if (!this.elements.bufferVotes || !voteCounts) return;

        const parts = [];
        for (let c = 1; c <= 4; c++) {
            if (voteCounts[c]) {
                const pct = ((voteCounts[c] / bufferLength) * 100).toFixed(0);
                parts.push(`C${c}: ${voteCounts[c]}/${bufferLength} (${pct}%)`);
            }
        }

        this.elements.bufferVotes.textContent = parts.join(' | ') || '-';
    }

    /**
     * Initialize gesture probability bars
     */
    initGestureBars() {
        const container = document.getElementById('debug-gesture-bars');
        if (!container) return;

        container.innerHTML = `
            <div class="prob-bar">
                <span class="prob-label">Thumb Y (up/down)</span>
                <div class="prob-track">
                    <div class="prob-fill" id="gesture-thumb-bar" style="background: #6b7280;"></div>
                </div>
                <span class="prob-value" id="gesture-thumb-value">0</span>
            </div>
            <div class="prob-bar">
                <span class="prob-label">Fingers Curled</span>
                <div class="prob-track">
                    <div class="prob-fill" id="gesture-curl-bar"></div>
                </div>
                <span class="prob-value" id="gesture-curl-value">0/4</span>
            </div>
            <div class="prob-bar">
                <span class="prob-label">Hold Progress</span>
                <div class="prob-track">
                    <div class="prob-fill" id="gesture-hold-bar" style="background: #f59e0b;"></div>
                </div>
                <span class="prob-value" id="gesture-hold-value">0%</span>
            </div>
        `;
    }

    /**
     * Update gesture detection info
     */
    updateGestureInfo() {
        const gestureActive = appState.get('gestureDetectionActive');
        const handLandmarks = appState.get('handLandmarks');
        const currentGesture = appState.get('currentGesture');
        const gestureHoldStart = appState.get('gestureHoldStart');
        const debugGeo = appState.get('debugGeo');

        // Gesture active
        if (this.elements.gestureActive) {
            this.elements.gestureActive.textContent = gestureActive ? 'ON' : 'OFF';
            this.elements.gestureActive.className = `debug-value ${gestureActive ? 'active' : ''}`;
        }

        // Hand detected
        if (this.elements.handDetected) {
            this.elements.handDetected.textContent = handLandmarks ? 'YES' : 'NO';
            this.elements.handDetected.className = `debug-value ${handLandmarks ? 'active' : ''}`;
        }

        // Current gesture
        if (this.elements.currentGesture) {
            this.elements.currentGesture.textContent = currentGesture || '-';
        }

        // Hold duration
        const holdDuration = gestureHoldStart ? Date.now() - gestureHoldStart : 0;
        if (this.elements.holdDuration) {
            this.elements.holdDuration.textContent = `${holdDuration}ms`;
        }

        // Update gesture probability bars
        this.updateGestureBars(debugGeo, holdDuration, currentGesture);
    }

    /**
     * Update gesture probability bars
     */
    updateGestureBars(debugGeo, holdDuration, currentGesture) {
        // Thumb Y bar - range roughly -0.2 to +0.2, center at 50%
        const thumbBar = document.getElementById('gesture-thumb-bar');
        const thumbValue = document.getElementById('gesture-thumb-value');
        if (thumbBar && thumbValue && debugGeo) {
            const thumbY = debugGeo.thumbVertical || 0;
            // Convert to percentage (0.2 = 100%, -0.2 = 0%, 0 = 50%)
            const thumbPct = Math.max(0, Math.min(100, (thumbY + 0.2) / 0.4 * 100));
            thumbBar.style.width = `${thumbPct}%`;
            thumbBar.style.background = thumbY > 0.08 ? '#22c55e' : (thumbY < -0.08 ? '#ef4444' : '#6b7280');
            thumbValue.textContent = thumbY.toFixed(3);
        }

        // Fingers curled bar
        const curlBar = document.getElementById('gesture-curl-bar');
        const curlValue = document.getElementById('gesture-curl-value');
        if (curlBar && curlValue && debugGeo) {
            const curled = debugGeo.curledCount || 0;
            const curlPct = (curled / 4) * 100;
            curlBar.style.width = `${curlPct}%`;
            curlBar.style.background = curled >= 3 ? '#22c55e' : '#6b7280';
            curlValue.textContent = `${curled}/4`;
        }

        // Hold progress bar
        const holdBar = document.getElementById('gesture-hold-bar');
        const holdValue = document.getElementById('gesture-hold-value');
        if (holdBar && holdValue) {
            const holdRequired = CONFIG.gestureHoldDuration || 500;
            const holdPct = currentGesture ? Math.min(100, (holdDuration / holdRequired) * 100) : 0;
            holdBar.style.width = `${holdPct}%`;
            holdBar.style.background = holdPct >= 100 ? '#22c55e' : '#f59e0b';
            holdValue.textContent = `${Math.round(holdPct)}%`;
        }
    }

    /**
     * Update question timer
     */
    updateQuestionTimer(remaining) {
        if (this.elements.questionTimer) {
            this.elements.questionTimer.textContent = remaining ? `${remaining}s remaining` : '-';
        }
    }

    /**
     * Update FPS display
     */
    updateFPS(fps) {
        if (this.elements.fps) {
            this.elements.fps.textContent = `${fps} FPS`;
        }
    }

    /**
     * Show/hide debug panel
     */
    setVisible(visible) {
        this.isVisible = visible;
        if (this.elements.panel) {
            this.elements.panel.style.display = visible ? 'block' : 'none';
        }
    }

    /**
     * Toggle debug panel visibility
     */
    toggle() {
        this.setVisible(!this.isVisible);
        return this.isVisible;
    }
}

// Export singleton instance
export const debugPanel = new DebugPanel();
export default debugPanel;
