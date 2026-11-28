/**
 * Shared directional question transition used by JUPEB and JAMB past-question viewers.
 * Keep the movement distance and opacity states identical across programmes.
 */
export const QUESTION_SLIDE_VARIANTS = {
  enter: (direction: number) => ({ x: direction * 60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction * -60, opacity: 0 }),
};
