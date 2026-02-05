/**
 * Event Bus Module
 * Central event system for module communication
 */

class EventBusClass {
    constructor() {
        this.events = new Map();
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(callback);

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Subscribe to an event once
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     */
    once(event, callback) {
        const unsubscribe = this.on(event, (...args) => {
            unsubscribe();
            callback(...args);
        });
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Event handler to remove
     */
    off(event, callback) {
        if (!this.events.has(event)) return;
        
        const callbacks = this.events.get(event);
        const index = callbacks.indexOf(callback);
        
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {any} data - Event data
     */
    emit(event, data) {
        if (!this.events.has(event)) return;

        this.events.get(event).forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event handler for "${event}":`, error);
            }
        });
    }

    /**
     * Remove all listeners for an event
     * @param {string} event - Event name (optional, removes all if not provided)
     */
    clear(event) {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
    }

    /**
     * Get list of events with listeners
     */
    getEvents() {
        return Array.from(this.events.keys());
    }
}

// Export singleton instance
export const EventBus = new EventBusClass();
export default EventBus;
