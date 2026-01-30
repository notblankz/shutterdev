// (vibe coded - claude)

const STANDARD_RATIOS = {
  // Landscape
  '3:2': 3/2,
  '4:3': 4/3,
  '16:9': 16/9,
  '2:1': 2/1,

  // Portrait
  '2:3': 2/3,
  '3:4': 3/4,
  '9:16': 9/16,
  '1:2': 1/2,

  // Square
  '1:1': 1/1,
}

export function normalizeAspectRatio(width, height) {
  const ratio = width / height

  // Tighter bounds for standard photography ratios
  const MIN_RATIO = 0.5
  const MAX_RATIO = 2.0

  // Clamp to realistic bounds
  const clampedRatio = Math.min(Math.max(ratio, MIN_RATIO), MAX_RATIO)

  // Snap to nearest standard ratio to prevent micro-variations
  const standardRatioValues = Object.values(STANDARD_RATIOS)
  const nearestStandard = standardRatioValues.reduce((prev, curr) => {
    return Math.abs(curr - clampedRatio) < Math.abs(prev - clampedRatio) ? curr : prev
  })

  // Only snap if very close (within 5% tolerance)
  // This prevents actual 3:2 from being treated as 4:3
  const tolerance = 0.05
  if (Math.abs(nearestStandard - clampedRatio) / clampedRatio < tolerance) {
    return nearestStandard
  }

  return clampedRatio
}

export function getNormalizedDimensions(width, height) {
  const normalizedRatio = normalizeAspectRatio(width, height)

  // Determine if landscape or portrait based on normalized ratio
  if (normalizedRatio >= 1) {
    // Landscape: width is longest edge (640px from backend)
    return {
      width: width,
      height: Math.round(width / normalizedRatio)
    }
  } else {
    // Portrait: height is longest edge (640px from backend)
    return {
      width: Math.round(height * normalizedRatio),
      height: height
    }
  }
}

export function getAspectRatioLabel(ratio) {
  for (const [label, value] of Object.entries(STANDARD_RATIOS)) {
    if (Math.abs(value - ratio) < 0.01) {
      return label
    }
  }
  return 'Custom'
}
