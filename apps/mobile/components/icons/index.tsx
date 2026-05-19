import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export const IconAirplane = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill={color}/>
  </Svg>
);

export const IconAirplaneOutline = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" stroke={color} strokeWidth="1.5" fill="none"/>
  </Svg>
);

export const IconBed = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M2 4v16M2 8h20v12" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <Rect x="6" y="10" width="4" height="2" rx="1" fill={color}/>
    <Rect x="14" y="10" width="4" height="2" rx="1" fill={color}/>
  </Svg>
);

export const IconWallet = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="6" width="20" height="14" rx="2" stroke={color} strokeWidth="1.5"/>
    <Circle cx="16" cy="13" r="1.5" fill={color}/>
    <Path d="M6 6V4a2 2 0 012-2h8a2 2 0 012 2v2" stroke={color} strokeWidth="1.5"/>
  </Svg>
);

export const IconWalletFilled = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="6" width="20" height="14" rx="2" fill={color}/>
    <Circle cx="16" cy="13" r="1.5" fill="#0E0C1C"/>
  </Svg>
);

export const IconPerson = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.5"/>
    <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </Svg>
);

export const IconPersonFilled = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" fill={color}/>
    <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </Svg>
);

export const IconChat = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    <Path d="M8 10h8M8 14h5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </Svg>
);

export const IconChatFilled = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z" fill={color}/>
  </Svg>
);

export const IconSearch = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth="1.5"/>
    <Path d="M16.5 16.5L21 21" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </Svg>
);

export const IconClose = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </Svg>
);

export const IconAdd = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 4v16M4 12h16" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </Svg>
);

export const IconArrowUp = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 19V5M5 12l7-7 7 7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

export const IconChevronRight = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

export const IconArrowForward = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 12h14M12 5l7 7-7 7" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

export const IconArrowBack = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5M12 19l-7-7 7-7" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

export const IconMic = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="9" y="2" width="6" height="12" rx="3" stroke={color} strokeWidth="1.5"/>
    <Path d="M5 10a7 7 0 0014 0M12 19v3M9 22h6" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </Svg>
);

export const IconHeart = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill={color}/>
  </Svg>
);

export const IconHeartOutline = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke={color} strokeWidth="1.5" fill="none"/>
  </Svg>
);

export const IconStar = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={color}/>
  </Svg>
);

export const IconStarOutline = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke={color} strokeWidth="1.5" fill="none"/>
  </Svg>
);

export const IconCard = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="5" width="20" height="14" rx="2" stroke={color} strokeWidth="1.5"/>
    <Path d="M2 10h20M6 15h4" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </Svg>
);

export const IconBitcoin = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 7h6c1.5 0 2.5 1 2.5 2.5S16.5 12 15 12H9V7zM9 12h7c1.5 0 2.5 1 2.5 2.5S17.5 17 16 17H9V12zM7 5v14M11 5v2M11 17v2M14 5v2M14 17v2" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </Svg>
);

export const IconCash = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="6" width="20" height="12" rx="2" stroke={color} strokeWidth="1.5"/>
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.5"/>
  </Svg>
);

export const IconApplePay = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 8a2 2 0 00-2-2H8a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V8z" stroke={color} strokeWidth="1.5"/>
    <Path d="M12 10v4M10 12h4" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </Svg>
);

export const IconMap = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6zM9 3v15M15 6v15" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
  </Svg>
);

export const IconLocation = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke={color} strokeWidth="1.5"/>
    <Circle cx="12" cy="9" r="2.5" stroke={color} strokeWidth="1.5"/>
  </Svg>
);

export const IconCalendar = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth="1.5"/>
    <Path d="M3 9h18M8 2v4M16 2v4" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </Svg>
);

export const IconSettings = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.5"/>
    <Path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </Svg>
);

export const IconBell = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

export const IconEarth = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5"/>
    <Path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" stroke={color} strokeWidth="1.5"/>
  </Svg>
);

export const IconClock = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5"/>
    <Path d="M12 6v6l4 2" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

export const IconScan = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M7 12h10" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </Svg>
);

export const IconPhone = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.31 9.8a19.79 19.79 0 01-3.07-8.68A2 2 0 012.22 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 9.91a16 16 0 006.17 6.17l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke={color} strokeWidth="1.5"/>
  </Svg>
);

export const IconRefresh = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

export const IconArrowDownCircle = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5"/>
    <Path d="M12 8v8M8 14l4 4 4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

export const IconFlash = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
  </Svg>
);

export const IconRibbon = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="6" stroke={color} strokeWidth="1.5"/>
    <Path d="M8 14l-2 7 6-3 6 3-2-7" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
  </Svg>
);

export const IconCheckmark = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

export const IconCloudOffline = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18.36 16.36A5 5 0 0018 7a7 7 0 00-13.46 2.47A4.5 4.5 0 004 18M3 3l18 18" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </Svg>
);

export const IconCloseCircle = ({ size = 24, color = '#E8A020' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5"/>
    <Path d="M15 9l-6 6M9 9l6 6" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </Svg>
);
