import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 👉 Your design baseline
const BASE_WIDTH = 360;
const BASE_HEIGHT = 800;

// Scale based on width
const scaleW = SCREEN_WIDTH / BASE_WIDTH;

// Scale based on height
const scaleH = SCREEN_HEIGHT / BASE_HEIGHT;

// Moderate scaling (prevents over-scaling on tablets)
const moderateScale = (size: number, factor = 0.5) =>
  size + (scaleW * size - size) * factor;

// Width-based scaling (good for horizontal padding, widths)
export const wp = (size: number) =>
  PixelRatio.roundToNearestPixel(size * scaleW);

// Height-based scaling (good for vertical spacing)
export const hp = (size: number) =>
  PixelRatio.roundToNearestPixel(size * scaleH);

// Font scaling (very important for music app UI)
export const fs = (size: number) =>
  PixelRatio.roundToNearestPixel(moderateScale(size));

// General spacing (padding, margin)
export const sp = (size: number) =>
  PixelRatio.roundToNearestPixel(moderateScale(size));
