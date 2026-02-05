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
            thumbVertical: document.getElementById('debug-thumb-vertical'),
            fingersCurled: document.getElementById('debug-fingers-curled'),
            questionTimer: document.getElementById('debug-question-timer'),
            musicResponse: document.getElementById('debug-music-response'),
            currentRoute: document.getElementById('debug-current-route'),
            mlClass: document.getElementById('debug-ml-class'),
            taskDuration: document.getElementById('debug-task-duration'),
            fps: document.getElementById('debug-fps')
        };

        // Initialize probability bars
        this.initProbabilityDisplay();

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
        if (this.elements.holdDuration) {
            const hold = gestureHoldStart ? Date.now() - gestureHoldStart : 0;
            this.elements.holdDuration.textContent = `${hold}ms`;
        }

        // Thumb vertical
        if (this.elements.thumbVertical) {
            this.elements.thumbVertical.textContent = debugGeo?.thumbVertical
                ? debugGeo.thumbVertical.toFixed(3)
                : '-';
        }

        // Fingers curled
        if (this.elements.fingersCurled) {
            this.elements.fingersCurled.textContent = debugGeo?.fingersCurled
                ? `YES (${debugGeo.curledCount}/4)`
                : `NO (${debugGeo?.curledCount || 0}/4)`;
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
