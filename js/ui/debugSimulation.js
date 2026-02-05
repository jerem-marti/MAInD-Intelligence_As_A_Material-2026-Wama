/**
 * Debug Simulation Module
 * Allows manual override of ML class and gesture detection for testing flows
 */

import { appState } from '../core/state.js';
import { EventBus } from '../core/eventBus.js';
import { CONFIG, GESTURES } from '../config/config.js';

class DebugSimulation {
    constructor() {
        this.enabled = false;
        this.simulatedClass = null;
        this.simulatedGesture = null;
        this.gestureHoldStart = null;
    }

    /**
     * Toggle simulation mode
     */
    toggleSimulation(enabled) {
        this.enabled = enabled;
        console.log(`🎮 Simulation mode: ${enabled ? 'ENABLED' : 'DISABLED'}`);
        
        if (!enabled) {
            this.simulatedClass = null;
            this.simulatedGesture = null;
            this.gestureHoldStart = null;
        }
        
        // Update button styles
        document.querySelectorAll('.sim-btn').forEach(btn => {
            btn.style.opacity = enabled ? '1' : '0.5';
            btn.style.pointerEvents = enabled ? 'auto' : 'none';
        });

        EventBus.emit('simulation:toggle', { enabled });
    }

    /**
     * Set simulated ML class
     */
    setClass(classNum) {
        if (!this.enabled) {
            console.warn('Enable simulation mode first!');
            return;
        }

        this.simulatedClass = classNum;
        console.log(`🎮 Simulated class set to: ${classNum}`);
        
        // Immediately update the app state
        appState.set('currentClass', classNum);
        appState.set('lastClassChange', Date.now());
        
        // Clear prediction buffer and fill with new class
        const buffer = [];
        for (let i = 0; i < CONFIG.predictionBufferSize; i++) {
            buffer.push(classNum);
        }
        appState.set('predictionBuffer', buffer);

        EventBus.emit('simulation:classChange', { classNum });
    }

    /**
     * Set simulated gesture (and trigger confirmation after hold duration)
     */
    setGesture(gesture) {
        if (!this.enabled) {
            console.warn('Enable simulation mode first!');
            return;
        }

        this.simulatedGesture = gesture;
        console.log(`🎮 Simulated gesture: ${gesture || 'none'}`);

        if (gesture) {
            // Set up gesture state
            appState.set('handLandmarks', true); // Fake hand detected
            appState.set('currentGesture', gesture);
            appState.set('gestureHoldStart', Date.now());
            
            // Auto-confirm after hold duration
            setTimeout(() => {
                if (this.simulatedGesture === gesture && this.enabled) {
                    console.log(`🎮 Gesture confirmed: ${gesture}`);
                    appState.set('confirmedGesture', gesture);
                    EventBus.emit('simulation:gestureConfirmed', { gesture });
                }
            }, CONFIG.gestureHoldDuration + 100);
        } else {
            // Clear gesture state
            appState.set('handLandmarks', null);
            appState.set('currentGesture', null);
            appState.set('gestureHoldStart', null);
            appState.set('confirmedGesture', null);
        }

        EventBus.emit('simulation:gestureChange', { gesture });
    }

    /**
     * Check if simulation is active
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Get simulated class (or null if not simulating)
     */
    getSimulatedClass() {
        return this.enabled ? this.simulatedClass : null;
    }

    /**
     * Get simulated gesture (or null if not simulating)
     */
    getSimulatedGesture() {
        return this.enabled ? this.simulatedGesture : null;
    }
}

// Export singleton instance
export const debugSimulation = new DebugSimulation();

// Make it globally accessible for onclick handlers
window.debugSimulation = debugSimulation;

export default debugSimulation;
