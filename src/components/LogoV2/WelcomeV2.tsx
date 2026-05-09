import React from 'react'
import { Box, Text, useTheme } from '@anthropic/ink'
import { env } from '../../utils/env.js'

const WELCOME_V2_WIDTH = 58

// ORION color palette (same as Clawd.tsx)
const C = [
  'rgb(87,105,247)',   // O
  'rgb(120,90,220)',   // R
  'rgb(175,80,180)',   // I
  'rgb(215,119,87)',   // O
  'rgb(240,160,60)',   // N
] as const
const CH = [
  'rgb(140,155,255)',  // O highlight
  'rgb(170,140,255)',  // R highlight
  'rgb(220,140,220)',  // I highlight
  'rgb(255,170,130)',  // O highlight
  'rgb(255,200,100)',  // N highlight
] as const
const CS = [
  'rgb(40,50,140)',    // O shadow
  'rgb(60,40,120)',    // R shadow
  'rgb(100,40,100)',   // I shadow
  'rgb(140,70,45)',    // O shadow
  'rgb(160,100,30)',   // N shadow
] as const

type Rgb = `rgb(${number},${number},${number})`

// ORION inline renderer for the welcome screen
function OrionInline(): React.ReactNode {
  return (
    <Box flexDirection="column">
      <Text>
        <Text color={CH[0] as Rgb}>▄█▄</Text>
        <Text> </Text>
        <Text color={CH[1] as Rgb}>▄█▄</Text>
        <Text> </Text>
        <Text color={CH[2] as Rgb}>▄█▄</Text>
        <Text> </Text>
        <Text color={CH[3] as Rgb}>▄█▄</Text>
        <Text> </Text>
        <Text color={CH[4] as Rgb}>▄█▄</Text>
      </Text>
      <Text>
        <Text color={C[0] as Rgb}>█</Text>
        <Text> </Text>
        <Text color={C[0] as Rgb}>█</Text>
        <Text> </Text>
        <Text color={C[1] as Rgb}>█</Text>
        <Text> </Text>
        <Text color={C[1] as Rgb}>█</Text>
        <Text> </Text>
        <Text color={C[2] as Rgb}>█</Text>
        <Text> </Text>
        <Text color={C[2] as Rgb}>█</Text>
        <Text> </Text>
        <Text color={C[3] as Rgb}>█</Text>
        <Text> </Text>
        <Text color={C[3] as Rgb}>█</Text>
        <Text> </Text>
        <Text color={C[4] as Rgb}>██</Text>
      </Text>
      <Text>
        <Text color={C[0] as Rgb}>█</Text>
        <Text> </Text>
        <Text color={C[0] as Rgb}>█</Text>
        <Text> </Text>
        <Text color={C[1] as Rgb}>███</Text>
        <Text> </Text>
        <Text color={C[2] as Rgb}>█</Text>
        <Text> </Text>
        <Text color={C[2] as Rgb}>█</Text>
        <Text> </Text>
        <Text color={C[3] as Rgb}>█</Text>
        <Text> </Text>
        <Text color={C[3] as Rgb}>█</Text>
        <Text> </Text>
        <Text color={C[4] as Rgb}>█</Text>
        <Text> </Text>
        <Text color={C[4] as Rgb}>█</Text>
      </Text>
      <Text>
        <Text color={C[0] as Rgb}>█</Text>
        <Text> </Text>
        <Text color={C[0] as Rgb}>█</Text>
        <Text> </Text>
        <Text color={C[1] as Rgb}>█</Text>
        <Text> </Text>
        <Text color={C[1] as Rgb}>█</Text>
        <Text> </Text>
        <Text color={C[2] as Rgb}>█</Text>
        <Text> </Text>
        <Text color={C[2] as Rgb}>▀</Text>
        <Text> </Text>
        <Text color={C[3] as Rgb}>█</Text>
        <Text> </Text>
        <Text color={C[3] as Rgb}>█</Text>
        <Text> </Text>
        <Text color={C[4] as Rgb}> ██</Text>
      </Text>
      <Text>
        <Text color={CS[0] as Rgb}>▀█▀</Text>
        <Text> </Text>
        <Text color={CS[1] as Rgb}>▀</Text>
        <Text> </Text>
        <Text color={CS[1] as Rgb}>█</Text>
        <Text> </Text>
        <Text color={CS[2] as Rgb}> ▀ </Text>
        <Text> </Text>
        <Text color={CS[3] as Rgb}>▀█▀</Text>
        <Text> </Text>
        <Text color={CS[4] as Rgb}>▀</Text>
        <Text> </Text>
        <Text color={CS[4] as Rgb}>█</Text>
      </Text>
    </Box>
  )
}

export function WelcomeV2(): React.ReactNode {
  const [theme] = useTheme()
  const welcomeMessage = 'Welcome to Claude Code'

  if (env.terminal === 'Apple_Terminal') {
    return (
      <AppleTerminalWelcomeV2 theme={theme} welcomeMessage={welcomeMessage} />
    )
  }

  if (['light', 'light-daltonized', 'light-ansi'].includes(theme)) {
    return (
      <Box width={WELCOME_V2_WIDTH}>
        <Text>
          <Text>
            <Text color="claude">{welcomeMessage} </Text>
            <Text dimColor>v{MACRO.VERSION} </Text>
          </Text>
          <Text>
            {'…………………………………………………………………………………………………………………………………………………………'}
          </Text>
          <Text>
            {'                                                          '}
          </Text>
          <Text>
            {'                                                          '}
          </Text>
          <Text>
            {'                                                          '}
          </Text>
          <Text>
            {'            ░░░░░░                                        '}
          </Text>
          <Text>
            {'    ░░░   ░░░░░░░░░░                                      '}
          </Text>
          <Text>
            {'   ░░░░░░░░░░░░░░░░░░░                                    '}
          </Text>
          <Text>
            {'                                                          '}
          </Text>
          <Text>
            <Text dimColor>{'                           ░░░░'}</Text>
            <Text>{'                     ██    '}</Text>
          </Text>
          <Text>
            <Text dimColor>{'                         ░░░░░░░░░░'}</Text>
            <Text>{'               ██▒▒██  '}</Text>
          </Text>
          <Text>
            {'                                            ▒▒      ██   ▒'}
          </Text>
          <Text>
            {'                                          ▒▒░░▒▒      ▒ ▒▒'}
          </Text>
          <Text>
            {'      '}
            <OrionInline />
            {'                           ▒▒         ▒▒ '}
          </Text>
          <Text>
            {'                           ░          ▒   '}
          </Text>
          <Text>
            {'………………………………………………………………………………………………………………░…………………………▒…………'}
          </Text>
        </Text>
      </Box>
    )
  }

  return (
    <Box width={WELCOME_V2_WIDTH}>
      <Text>
        <Text>
          <Text color="claude">{welcomeMessage} </Text>
          <Text dimColor>v{MACRO.VERSION} </Text>
        </Text>
        <Text>
          {'…………………………………………………………………………………………………………………………………………………………'}
        </Text>
        <Text>
          {'                                                          '}
        </Text>
        <Text>
          {'     *                                       █████▓▓░     '}
        </Text>
        <Text>
          {'                                 *         ███▓░     ░░   '}
        </Text>
        <Text>
          {'            ░░░░░░                        ███▓░           '}
        </Text>
        <Text>
          {'    ░░░   ░░░░░░░░░░                      ███▓░           '}
        </Text>
        <Text>
          <Text>{'   ░░░░░░░░░░░░░░░░░░░    '}</Text>
          <Text bold>*</Text>
          <Text>{'                ██▓░░      ▓   '}</Text>
        </Text>
        <Text>
          {'                                             ░▓▓███▓▓░    '}
        </Text>
        <Text dimColor>
          {' *                                 ░░░░                   '}
        </Text>
        <Text dimColor>
          {'                                 ░░░░░░░░                 '}
        </Text>
        <Text dimColor>
          {'                               ░░░░░░░░░░░░░░░░           '}
        </Text>
        <Text>
          {'      '}
          <OrionInline />
          {'                                       '}
          <Text dimColor>*</Text>
          <Text> </Text>
        </Text>
        <Text>
          {'     *                                   '}
        </Text>
        <Text>
          {'………………………………………………………………………………………………………………'}
        </Text>
      </Text>
    </Box>
  )
}

type AppleTerminalWelcomeV2Props = {
  theme: string
  welcomeMessage: string
}

function AppleTerminalWelcomeV2({
  theme,
  welcomeMessage,
}: AppleTerminalWelcomeV2Props): React.ReactNode {
  const isLightTheme = ['light', 'light-daltonized', 'light-ansi'].includes(
    theme,
  )

  if (isLightTheme) {
    return (
      <Box width={WELCOME_V2_WIDTH}>
        <Text>
          <Text>
            <Text color="claude">{welcomeMessage} </Text>
            <Text dimColor>v{MACRO.VERSION} </Text>
          </Text>
          <Text>
            {'…………………………………………………………………………………………………………………………………………………………'}
          </Text>
          <Text>
            {'                                                          '}
          </Text>
          <Text>
            {'                                                          '}
          </Text>
          <Text>
            {'                                                          '}
          </Text>
          <Text>
            {'            ░░░░░░                                        '}
          </Text>
          <Text>
            {'    ░░░   ░░░░░░░░░░                                      '}
          </Text>
          <Text>
            {'   ░░░░░░░░░░░░░░░░░░░                                    '}
          </Text>
          <Text>
            {'                                                          '}
          </Text>
          <Text>
            <Text dimColor>{'                           ░░░░'}</Text>
            <Text>{'                     ██    '}</Text>
          </Text>
          <Text>
            <Text dimColor>{'                         ░░░░░░░░░░'}</Text>
            <Text>{'               ██▒▒██  '}</Text>
          </Text>
          <Text>
            {'                                            ▒▒      ██   ▒'}
          </Text>
          <Text>
            {'                                          ▒▒░░▒▒      ▒ ▒▒'}
          </Text>
          <Text>
            {'      '}
            <OrionInline />
            {'                           ▒▒         ▒▒ '}
          </Text>
          <Text>
            {'                           ░          ▒   '}
          </Text>
          <Text>
            {'………………………………………………………………………………………………………………░…………………………▒…………'}
          </Text>
        </Text>
      </Box>
    )
  }

  return (
    <Box width={WELCOME_V2_WIDTH}>
      <Text>
        <Text>
          <Text color="claude">{welcomeMessage} </Text>
          <Text dimColor>v{MACRO.VERSION} </Text>
        </Text>
        <Text>
          {'…………………………………………………………………………………………………………………………………………………………'}
        </Text>
        <Text>
          {'                                                          '}
        </Text>
        <Text>
          {'     *                                       █████▓▓░     '}
        </Text>
        <Text>
          {'                                 *         ███▓░     ░░   '}
        </Text>
        <Text>
          {'            ░░░░░░                        ███▓░           '}
        </Text>
        <Text>
          {'    ░░░   ░░░░░░░░░░                      ███▓░           '}
        </Text>
        <Text>
          <Text>{'   ░░░░░░░░░░░░░░░░░░░    '}</Text>
          <Text bold>*</Text>
          <Text>{'                ██▓░░      ▓   '}</Text>
        </Text>
        <Text>
          {'                                             ░▓▓███▓▓░    '}
        </Text>
        <Text dimColor>
          {' *                                 ░░░░                   '}
        </Text>
        <Text dimColor>
          {'                                 ░░░░░░░░                 '}
        </Text>
        <Text dimColor>
          {'                               ░░░░░░░░░░░░░░░░           '}
        </Text>
        <Text>
          {'                                                      '}
          <Text dimColor>*</Text>
          <Text> </Text>
        </Text>
        <Text>
          {'        '}
          <OrionInline />
          <Text>{'                       '}</Text>
          <Text bold>*</Text>
          <Text>{'                '}</Text>
        </Text>
        <Text>
          {'      *                                   '}
        </Text>
        <Text>
          {'………………………………………………………………………………………………………………'}
        </Text>
      </Text>
    </Box>
  )
}
