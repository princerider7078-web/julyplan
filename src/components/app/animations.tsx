'use client';
import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';

// Page/view transition — fade + slight slide
export function PageTransition({ children, viewKey }: { children: ReactNode; viewKey: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={viewKey}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// List item animation — stagger in
export function ListItemMotion({ children, index }: { children: ReactNode; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3), ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

// Button press micro-interaction
export const buttonMotion = {
  whileTap: { scale: 0.97 },
  whileHover: { scale: 1.02 },
  transition: { duration: 0.15 },
};

// Checkbox complete animation
export function CheckAnimation({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0.5 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
    >
      {children}
    </motion.div>
  );
}

// Streak milestone celebration
export function StreakCelebration({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 10 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Toast slide-in
export const toastMotion = {
  initial: { opacity: 0, x: 100 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 100 },
  transition: { duration: 0.25, ease: 'easeOut' },
};
