import * as React from 'react'
import { Box, Text } from '@anthropic/ink'
import { env } from '../../utils/env.js'

export type ClawdPose =
  | 'default'
  | 'arms-up' // both arms raised (used during jump)
  | 'look-left' // both pupils shifted left
  | 'look-right' // both pupils shifted right

type Props = {
  pose?: ClawdPose
}

// ORION pixel art — 5 rows, each letter 3 cols wide with 1-col spacing.
// Uses Unicode block-drawing chars for a pixel/3D look.
// Colors: gradient from Claude Blue (left) to warm amber (right).
//
// The "3D" effect comes from:
//   - Row 0: ▄ top highlights (lighter colors)
//   - Rows 1-3: █ solid body (main colors)
//   - Row 4: ▀ bottom shadow (darker colors)

// Color gradient across the 5 letters O-R-I-O-N
const COLORS = [
  'rgb(87,105,247)',  // O — Claude Blue
  'rgb(120,90,220)',  // R — violet
  'rgb(175,80,180)',  // I — magenta
  'rgb(215,119,87)',  // O — terra cotta (Claude Orange)
  'rgb(240,160,60)',  // N — warm amber
] as const satisfies readonly `rgb(${number},${number},${number})`[]

// Shadow colors (darker versions for 3D depth)
const SHADOW_COLORS = [
  'rgb(40,50,140)',   // O shadow
  'rgb(60,40,120)',   // R shadow
  'rgb(100,40,100)',  // I shadow
  'rgb(140,70,45)',   // O shadow
  'rgb(160,100,30)',  // N shadow
] as const satisfies readonly `rgb(${number},${number},${number})`[]

// Highlight colors (lighter top edge)
const HIGHLIGHT_COLORS = [
  'rgb(140,155,255)', // O highlight
  'rgb(170,140,255)', // R highlight
  'rgb(220,140,220)', // I highlight
  'rgb(255,170,130)', // O highlight
  'rgb(255,200,100)', // N highlight
] as const satisfies readonly `rgb(${number},${number},${number})`[]

// Pixel art layout for ORION (5 rows x 19 cols)
//
//   ▄██▄  ▄██▄  ▄█▄  ▄██▄  ▄█▄
//   █  █  █  █   █   █  █  █ █
//   █  █  ███    █   █  █  █ █
//   █  █  █ █    █   █  █  █ █
//   ▀██▀  █ █   █▀   ▀██▀  █ █

// Each row is an array of [char, color] tuples.
// Empty string color means space (no coloring needed).
type PixelRow = ReadonlyArray<readonly [string, string]>

const ROWS: readonly PixelRow[] = [
  // Row 0: top edge (▄ = top of letters)
  [
    ['▄', HIGHLIGHT_COLORS[0]], ['█', HIGHLIGHT_COLORS[0]], ['▄', HIGHLIGHT_COLORS[0]], [' ', ''],
    ['▄', HIGHLIGHT_COLORS[1]], ['█', HIGHLIGHT_COLORS[1]], ['▄', HIGHLIGHT_COLORS[1]], [' ', ''],
    ['▄', HIGHLIGHT_COLORS[2]], ['█', HIGHLIGHT_COLORS[2]], ['▄', HIGHLIGHT_COLORS[2]], [' ', ''],
    ['▄', HIGHLIGHT_COLORS[3]], ['█', HIGHLIGHT_COLORS[3]], ['▄', HIGHLIGHT_COLORS[3]], [' ', ''],
    ['▄', HIGHLIGHT_COLORS[4]], ['█', HIGHLIGHT_COLORS[4]], ['▄', HIGHLIGHT_COLORS[4]],
  ] as const,
  // Row 1: upper body (N: left + diagonal start)
  [
    ['█', COLORS[0]], [' ', ''], ['█', COLORS[0]], [' ', ''],
    ['█', COLORS[1]], [' ', ''], ['█', COLORS[1]], [' ', ''],
    ['█', COLORS[2]], [' ', ''], ['█', COLORS[2]], [' ', ''],
    ['█', COLORS[3]], [' ', ''], ['█', COLORS[3]], [' ', ''],
    ['█', COLORS[4]], ['█', COLORS[4]], [' ', ''],
  ] as const,
  // Row 2: middle body (R crossbar, N diagonal middle)
  [
    ['█', COLORS[0]], [' ', ''], ['█', COLORS[0]], [' ', ''],
    ['█', COLORS[1]], ['█', COLORS[1]], ['█', COLORS[1]], [' ', ''],
    ['█', COLORS[2]], [' ', ''], ['█', COLORS[2]], [' ', ''],
    ['█', COLORS[3]], [' ', ''], ['█', COLORS[3]], [' ', ''],
    ['█', COLORS[4]], [' ', ''], ['█', COLORS[4]],
  ] as const,
  // Row 3: lower body (R leg, I serif, N diagonal end)
  [
    ['█', COLORS[0]], [' ', ''], ['█', COLORS[0]], [' ', ''],
    ['█', COLORS[1]], [' ', ''], ['█', COLORS[1]], [' ', ''],
    ['█', COLORS[2]], [' ', ''], ['▀', COLORS[2]], [' ', ''],
    ['█', COLORS[3]], [' ', ''], ['█', COLORS[3]], [' ', ''],
    [' ', ''], ['█', COLORS[4]], ['█', COLORS[4]],
  ] as const,
  // Row 4: bottom edge (▀ = bottom of letters) + shadow
  [
    ['▀', SHADOW_COLORS[0]], ['█', SHADOW_COLORS[0]], ['▀', SHADOW_COLORS[0]], [' ', ''],
    ['▀', SHADOW_COLORS[1]], [' ', ''], ['█', SHADOW_COLORS[1]], [' ', ''],
    [' ', ''], ['▀', SHADOW_COLORS[2]], [' ', ''], [' ', ''],
    ['▀', SHADOW_COLORS[3]], ['█', SHADOW_COLORS[3]], ['▀', SHADOW_COLORS[3]], [' ', ''],
    ['▀', SHADOW_COLORS[4]], [' ', ''], ['█', SHADOW_COLORS[4]],
  ] as const,
] as const

export function Clawd({ pose = 'default' }: Props = {}): React.ReactNode {
  if (env.terminal === 'Apple_Terminal') {
    return <AppleTerminalClawd pose={pose} />
  }
  return (
    <Box flexDirection="column">
      {ROWS.map((row, rowIdx) => (
        <Text key={rowIdx}>
          {row.map(([ch, color], colIdx) =>
            ch === ' ' ? (
              <Text key={colIdx}> </Text>
            ) : (
              <Text key={colIdx} color={color as `rgb(${number},${number},${number})`}>{ch}</Text>
            )
          )}
        </Text>
      ))}
    </Box>
  )
}

function AppleTerminalClawd({ pose }: { pose: ClawdPose }): React.ReactNode {
  // Apple Terminal fallback — simpler rendering
  return (
    <Box flexDirection="column" alignItems="center">
      {ROWS.map((row, rowIdx) => (
        <Text key={rowIdx}>
          {row.map(([ch, color], colIdx) =>
            ch === ' ' ? (
              <Text key={colIdx}> </Text>
            ) : (
              <Text key={colIdx} color={color as `rgb(${number},${number},${number})`}>{ch}</Text>
            )
          )}
        </Text>
      ))}
    </Box>
  )
}
