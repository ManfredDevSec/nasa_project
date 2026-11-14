import { EyeIcon, HeartIcon, MindIcon, MoonIcon } from '../components/Icons.jsx'
import { NASA_LINKS } from '../content/learn.js'

// Display names, icons and NASA "Read more" links for the four body-map parts.
export const PART_ORDER = ['EYES', 'HEART', 'SLEEP', 'MIND']

export const PART_META = {
  EYES: { label: 'Eyes', Icon: EyeIcon, readMore: NASA_LINKS.R1_SANS },
  HEART: { label: 'Heart', Icon: HeartIcon, readMore: NASA_LINKS.R1_CARDIOVASCULAR },
  SLEEP: { label: 'Sleep', Icon: MoonIcon, readMore: NASA_LINKS.R1_SLEEP },
  MIND: { label: 'Mind', Icon: MindIcon, readMore: NASA_LINKS.R1_BEHAVIORAL },
}
