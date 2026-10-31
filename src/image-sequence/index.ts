/*
 * The image-sequence engine: a scroll-scrubbed canvas animation made of a
 * numbered series of frames. See README.md in this folder for the asset layout
 * and a usage walkthrough.
 *
 * React layer: `useImageSequence` + `useScrollProgress` + `CanvasSequence`.
 * Framework-free layer (also usable without React): the `create*` factories.
 */
export { CanvasSequence, type CanvasSequenceProps } from './CanvasSequence'
export { watchCanvasSize } from './core/canvasSize'
export { devFallback } from './core/devFallback'
export { createFrameLoader } from './core/frameLoader'
export { constantProgress, createScrollProgress } from './core/scrollProgress'
export { buildFrameUrl, progressToFrameIndex, resolveSource } from './core/sequenceMath'
export { readiness, type Readiness, type ReadinessOutcome } from './core/readiness'
export { createSequenceRenderer } from './core/sequenceRenderer'
export {
  chooseTier,
  loaderOptionsForTier,
  readDeviceSignals,
  sourceForTier,
  type DeviceSignals,
  type SequenceTier,
  type TierSources,
} from './core/tiers'
export { drawCoverImage, fitRect, type DrawCoverOptions, type FitRect } from './drawCoverImage'
export type {
  ElementTarget,
  FitMode,
  FocalPoint,
  FrameLoader,
  FrameLoaderOptions,
  FrameSize,
  ImageSequence,
  ImageSequenceSource,
  PreloadMode,
  ProgressRange,
  ProgressSource,
  ResolvedImageSequenceSource,
  ScrollProgressOptions,
  SequenceFallback,
  SequenceFallbackInfo,
  SequenceFrame,
  SequenceRenderer,
  SequenceRendererOptions,
  SequenceState,
  SequenceStatus,
} from './imageSequence.types'
export { useImageSequence, useSequenceState } from './useImageSequence'
export { useScrollProgress } from './useScrollProgress'
