/**
 * Animation Manager Module
 * Handles Lottie animations and SVG loading
 */

import { EventBus } from '../core/eventBus.js';
import { appState } from '../core/state.js';
import { CONFIG } from '../config/config.js';

class AnimationManager {
    constructor() {
        this.currentAnimation = null;
        this.bgAnimation = null;
        this.cornerAnimation = null;
        this.containers = {
            main: null,
            bg: null,
            center: null,
            corner: null
        };
    }

    /**
     * Initialize animation containers
     */
    initialize() {
        this.containers.main = document.getElementById('lottie-container');
        this.containers.bg = document.getElementById('bg-lottie');
        
        return this.containers.main !== null;
    }

    /**
     * Load and play animation for a route
     */
    async loadAnimation(routeConfig) {
        // Clear existing animations
        this.clearAnimations();

        // Handle different animation types
        if (routeConfig.centerSvg && routeConfig.cornerLottie) {
            await this.loadMusicPlayingAnimation(routeConfig);
        } else if (routeConfig.lottie) {
            await this.loadMainAnimation(routeConfig.lottie);
        }

        // Load background animation if specified
        if (routeConfig.bgLottie) {
            await this.loadBgAnimation(routeConfig.bgLottie);
        }
    }

    /**
     * Load main Lottie animation or SVG
     */
    async loadMainAnimation(lottieConfig) {
        if (!this.containers.main) return;

        const delay = lottieConfig.delay || CONFIG.lottieDefaultDelay;

        // Handle SVG files
        if (lottieConfig.isSvg || lottieConfig.path.endsWith('.svg')) {
            const img = document.createElement('img');
            img.src = lottieConfig.path;
            img.alt = '';
            img.className = 'lottie-svg';
            this.containers.main.appendChild(img);
            
            // Trigger animation after delay
            setTimeout(() => {
                img.classList.add('visible');
            }, delay);
            
            return;
        }

        // Handle Lottie JSON
        this.currentAnimation = lottie.loadAnimation({
            container: this.containers.main,
            renderer: 'svg',
            loop: lottieConfig.loop || false,
            autoplay: false,
            path: lottieConfig.path
        });

        this.currentAnimation.addEventListener('DOMLoaded', () => {
            this.currentAnimation.goToAndStop(0, true);
            
            setTimeout(() => {
                this.currentAnimation.play();
            }, delay);
        });

        appState.set('currentAnimation', this.currentAnimation);
        EventBus.emit('animation:loaded', { type: 'main' });
    }

    /**
     * Load background Lottie animation (e.g., waves)
     */
    async loadBgAnimation(path) {
        if (!this.containers.bg) return;

        this.bgAnimation = lottie.loadAnimation({
            container: this.containers.bg,
            renderer: 'svg',
            loop: true,
            autoplay: true,
            path: path,
            rendererSettings: {
                preserveAspectRatio: 'xMidYMid slice'
            }
        });

        this.bgAnimation.addEventListener('DOMLoaded', () => {
            this.containers.bg.classList.add('waves-ready');
        });

        EventBus.emit('animation:loaded', { type: 'background' });
    }

    /**
     * Load music playing animation (center SVG + corner Lottie)
     */
    async loadMusicPlayingAnimation(routeConfig) {
        const centerContainer = document.getElementById('center-container');
        const cornerContainer = document.getElementById('corner-lottie');

        if (!centerContainer || !cornerContainer) {
            // Wait for DOM to be ready
            await new Promise(resolve => setTimeout(resolve, 100));
            return this.loadMusicPlayingAnimation(routeConfig);
        }

        // Clear any existing content to prevent duplicates
        centerContainer.innerHTML = '';

        // Create wrapper for center content
        const wrapper = document.createElement('div');
        wrapper.className = 'center-content';

        // Add center SVG
        const img = document.createElement('img');
        img.src = routeConfig.centerSvg;
        img.alt = '';
        img.className = 'center-svg';
        wrapper.appendChild(img);

        // Create a new corner lottie container inside wrapper
        const newCorner = document.createElement('div');
        newCorner.id = 'corner-lottie-inner';
        newCorner.className = 'corner-lottie-inner';
        wrapper.appendChild(newCorner);
        
        centerContainer.appendChild(wrapper);

        // Load corner Lottie animation
        if (routeConfig.cornerLottie) {
            this.cornerAnimation = lottie.loadAnimation({
                container: newCorner,
                renderer: 'svg',
                loop: true,
                autoplay: true,
                path: routeConfig.cornerLottie
            });
        }

        EventBus.emit('animation:loaded', { type: 'musicplaying' });
    }

    /**
     * Clear all current animations
     */
    clearAnimations() {
        // Destroy main animation
        if (this.currentAnimation) {
            this.currentAnimation.destroy();
            this.currentAnimation = null;
        }

        // Destroy background animation
        if (this.bgAnimation) {
            this.bgAnimation.destroy();
            this.bgAnimation = null;
        }

        // Destroy corner animation
        if (this.cornerAnimation) {
            this.cornerAnimation.destroy();
            this.cornerAnimation = null;
        }

        // Clear containers
        if (this.containers.main) {
            this.containers.main.innerHTML = '';
        }

        if (this.containers.bg) {
            this.containers.bg.innerHTML = '';
            this.containers.bg.classList.remove('waves-ready');
        }

        appState.set('currentAnimation', null);
    }

    /**
     * Pause all animations
     */
    pause() {
        if (this.currentAnimation) {
            this.currentAnimation.pause();
        }
        if (this.bgAnimation) {
            this.bgAnimation.pause();
        }
        if (this.cornerAnimation) {
            this.cornerAnimation.pause();
        }
    }

    /**
     * Resume all animations
     */
    resume() {
        if (this.currentAnimation) {
            this.currentAnimation.play();
        }
        if (this.bgAnimation) {
            this.bgAnimation.play();
        }
        if (this.cornerAnimation) {
            this.cornerAnimation.play();
        }
    }

    /**
     * Cleanup all resources
     */
    cleanup() {
        this.clearAnimations();
        this.containers = {
            main: null,
            bg: null,
            center: null,
            corner: null
        };
    }
}

// Export singleton instance
export const animationManager = new AnimationManager();
export default animationManager;
