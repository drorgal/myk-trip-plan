import 'styled-components'
import type { Theme } from 'myk-library'

declare module 'styled-components' {
  export interface DefaultTheme extends Theme {}
}
