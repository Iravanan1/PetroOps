export const AnimationFramework = {
  transitions: {
    base: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    slow: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
  },
  keyframes: `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideUpFade {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `,
  classes: {
    animateFadeIn: 'animate-[fadeIn_0.3s_ease-out]',
    animateSlideUp: 'animate-[slideUpFade_0.4s_ease-out]',
    hoverLift: 'transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md'
  }
};
