/**
 * Hash Router Module
 * Simple SPA hash-based routing system
 */

import { ROUTES, DEFAULT_ROUTE } from '../config/routes.js';
import { EventBus } from './eventBus.js';

class Router {
    constructor() {
        this.currentRoute = null;
        this.previousRoute = null;
        this.listeners = [];
        
        // Bind hash change listener
        window.addEventListener('hashchange', () => this.handleRouteChange());
        
        // Handle initial route
        this.handleRouteChange();
    }

    /**
     * Get current route name from hash
     */
    getRouteFromHash() {
        const hash = window.location.hash.slice(1); // Remove #
        return hash || DEFAULT_ROUTE;
    }

    /**
     * Handle route change event
     */
    handleRouteChange() {
        const routeName = this.getRouteFromHash();
        const routeConfig = ROUTES[routeName];

        if (!routeConfig) {
            console.warn(`Route not found: ${routeName}, redirecting to default`);
            this.navigate(DEFAULT_ROUTE);
            return;
        }

        this.previousRoute = this.currentRoute;
        this.currentRoute = routeName;

        // Emit route change event
        EventBus.emit('route:change', {
            current: routeName,
            previous: this.previousRoute,
            config: routeConfig
        });

        // Notify listeners
        this.notifyListeners(routeName, routeConfig);
    }

    /**
     * Navigate to a specific route
     */
    navigate(routeName) {
        if (ROUTES[routeName]) {
            window.location.hash = routeName;
        } else {
            console.error(`Invalid route: ${routeName}`);
        }
    }

    /**
     * Get current route configuration
     */
    getCurrentRoute() {
        return {
            name: this.currentRoute,
            config: ROUTES[this.currentRoute]
        };
    }

    /**
     * Get previous route name
     */
    getPreviousRoute() {
        return this.previousRoute;
    }

    /**
     * Register a route change listener
     */
    onRouteChange(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    /**
     * Notify all listeners of route change
     */
    notifyListeners(routeName, config) {
        this.listeners.forEach(callback => {
            try {
                callback(routeName, config);
            } catch (error) {
                console.error('Route listener error:', error);
            }
        });
    }

    /**
     * Check if a route exists
     */
    routeExists(routeName) {
        return !!ROUTES[routeName];
    }

    /**
     * Get all available routes
     */
    getAvailableRoutes() {
        return Object.keys(ROUTES);
    }
}

// Export singleton instance
export const router = new Router();
export default router;
