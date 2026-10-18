import type { Transition } from "motion/react";

/**
 * Shared motion configuration for AlgoLearn visualizers.
 * Designed for 60fps GPU acceleration by animating `transform` and `opacity` only.
 * Respects `prefers-reduced-motion`.
 */

export interface VisualizerMotionConfig {
  swapSpring: Transition;
  compareSpring: Transition;
  settleSpring: Transition;
  staggerDelay: number;
}

/**
 * Base spring configs
 */
export const springSwap: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 26,
  mass: 0.8,
};

export const springCompare: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 24,
  mass: 0.7,
};

export const springSettle: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 22,
  mass: 0.6,
};

export const reducedMotionTransition: Transition = {
  duration: 0.001,
  ease: "linear",
};

/**
 * Get dynamic motion transition scaled by playback speed and reduced-motion setting.
 */
export function getMotionConfig(reduced: boolean, speedMultiplier = 1): VisualizerMotionConfig {
  if (reduced) {
    return {
      swapSpring: reducedMotionTransition,
      compareSpring: reducedMotionTransition,
      settleSpring: reducedMotionTransition,
      staggerDelay: 0,
    };
  }

  // Adjust stiffness and damping according to speed multiplier for smooth 60fps spring feel
  const speed = Math.max(0.25, Math.min(4, speedMultiplier));
  const stiffnessFactor = Math.min(2.5, Math.max(0.7, Math.sqrt(speed)));

  return {
    swapSpring: {
      type: "spring",
      stiffness: Math.round(420 * stiffnessFactor),
      damping: Math.round(26 * (1 / Math.sqrt(stiffnessFactor))),
      mass: 0.8 / stiffnessFactor,
    },
    compareSpring: {
      type: "spring",
      stiffness: Math.round(380 * stiffnessFactor),
      damping: Math.round(24 * (1 / Math.sqrt(stiffnessFactor))),
      mass: 0.7 / stiffnessFactor,
    },
    settleSpring: {
      type: "spring",
      stiffness: Math.round(320 * stiffnessFactor),
      damping: Math.round(22 * (1 / Math.sqrt(stiffnessFactor))),
      mass: 0.6 / stiffnessFactor,
    },
    staggerDelay: 0.04 / speed,
  };
}
