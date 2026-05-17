// Web stub for react-native-maps — native-only module not supported on web
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MapPlaceholder = (props: any) => {
  return React.createElement(
    View,
    { style: [styles.container, props.style] },
    React.createElement(Text, { style: styles.text }, '🗺️ Map available in mobile app')
  );
};

const Marker = (_props: any) => null;
const Polyline = (_props: any) => null;
const Polygon = (_props: any) => null;
const Circle = (_props: any) => null;
const Callout = (_props: any) => null;
const UrlTile = (_props: any) => null;
const Overlay = (_props: any) => null;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  text: {
    fontSize: 14,
    color: '#888',
  },
});

export default MapPlaceholder;
export {
  MapPlaceholder as MapView,
  Marker,
  Polyline,
  Polygon,
  Circle,
  Callout,
  UrlTile,
  Overlay,
};

export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = null;
