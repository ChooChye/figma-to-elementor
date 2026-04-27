/// <reference types="@figma/plugin-typings" />
import { makeElement, ElElement, dim, box } from './elementor-types';
import { extractFill, extractShadow } from './color-utils';

export interface ConversionOptions {
  exportImages: boolean;
  siteUrl: string;
  skipHidden: boolean;
  headingThreshold: number;
  skipDecorative: boolean;
}

export interface ImageExportRequest {
  nodeId: string;
  placeholder: string;
}

export interface ConversionContext {
  newId: () => string;
  options: ConversionOptions;
  warnings: string[];
  imageExports: ImageExportRequest[];
  depth: number;
}

// --- Axis mapping ---

function mapPrimaryAxis(align: string): string {
  switch (align) {
    case 'MIN': return 'flex-start';
    case 'CENTER': return 'center';
    case 'MAX': return 'flex-end';
    case 'SPACE_BETWEEN': return 'space-between';
    default: return 'flex-start';
  }
}

function mapCounterAxis(align: string): string {
  switch (align) {
    case 'MIN': return 'flex-start';
    case 'CENTER': return 'center';
    case 'MAX': return 'flex-end';
    case 'STRETCH': return 'stretch';
    default: return 'flex-start';
  }
}

function mapFontWeight(style: string): string {
  const map: Record<string, string> = {
    'Thin': '100',
    'ExtraLight': '200',
    'Extra Light': '200',
    'Light': '300',
    'Regular': '400',
    'Medium': '500',
    'SemiBold': '600',
    'Semi Bold': '600',
    'DemiBold': '600',
    'Bold': '700',
    'ExtraBold': '800',
    'Extra Bold': '800',
    'Black': '900',
    'Heavy': '900',
  };
  const base = style.replace(/\s?Italic$/i, '').trim();
  return map[base] ?? '400';
}

function mapFontSizeToHeader(size: number): string {
  if (size >= 56) return 'h1';
  if (size >= 42) return 'h2';
  if (size >= 32) return 'h3';
  if (size >= 24) return 'h4';
  if (size >= 20) return 'h5';
  return 'h6';
}

function mapLineHeight(lh: LineHeight): { unit: string; size: number | ''; sizes: never[] } {
  if (lh.unit === 'PIXELS') return dim(Math.round((lh as { unit: 'PIXELS'; value: number }).value));
  if (lh.unit === 'PERCENT') return dim(parseFloat(((lh as { unit: 'PERCENT'; value: number }).value / 100).toFixed(2)), 'em');
  return dim(1.4, 'em');
}

function mapLetterSpacing(ls: LetterSpacing): { unit: string; size: number | ''; sizes: never[] } {
  if (ls.unit === 'PIXELS') return dim(Math.round(ls.value));
  if (ls.unit === 'PERCENT') return dim(parseFloat((ls.value / 100).toFixed(2)), 'em');
  return dim(0);
}

function getRadius(node: FrameNode | RectangleNode | InstanceNode | ComponentNode): number {
  if (typeof node.cornerRadius === 'number') return Math.round(node.cornerRadius);
  return Math.round((node as FrameNode).topLeftRadius ?? 0);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function makeDefaultShadow() {
  return {
    horizontal: 0,
    vertical: 0,
    blur: 10,
    spread: 0,
    color: 'rgba(0,0,0,0.5)',
    position: '',
  };
}

// --- Container base settings boilerplate (matches real Elementor clipboard JSON) ---

function getContainerBaseSettings(): Record<string, unknown> {
  const emptyDim = { unit: 'px', size: '', sizes: [] as never[] };
  const emptyDimPct = { unit: '%', size: '', sizes: [] as never[] };
  const emptyDimDeg = { unit: 'deg', size: '', sizes: [] as never[] };
  const emptyDimPctOnly = { unit: '%' };
  const emptyDimDegOnly = { unit: 'deg' };
  const emptyBoxVal = { unit: 'px', top: '', right: '', bottom: '', left: '', isLinked: true };
  const emptyGap = { column: '', row: '', isLinked: true, unit: 'px' };
  const emptyImg = { url: '', id: '', size: '' };
  const defaultShadowObj = { horizontal: 0, vertical: 0, blur: 10, spread: 0, color: 'rgba(0,0,0,0.5)' };
  const bgColorStop = { unit: '%', size: 0, sizes: [] as never[] };
  const bgColorBStop = { unit: '%', size: 100, sizes: [] as never[] };
  const bgGradAngle = { unit: 'deg', size: 180, sizes: [] as never[] };
  const bgOpacity = { unit: 'px', size: 0.5, sizes: [] as never[] };
  const bgOverlayOpacity = { unit: 'px', size: 0.5, sizes: [] as never[] };
  const bgHoverTransition = { unit: 'px', size: 0.3, sizes: [] as never[] };
  const borderHoverTransition = { unit: 'px', size: 0.3, sizes: [] as never[] };

  return {
    // layout
    container_type: 'flex',
    content_width: 'full',
    width: { unit: '%', size: '', sizes: [] as never[] },
    width_laptop: emptyDim,
    width_tablet: emptyDim,
    width_mobile: emptyDim,
    boxed_width: emptyDim,
    boxed_width_laptop: emptyDim,
    boxed_width_tablet: emptyDim,
    boxed_width_mobile: emptyDim,
    min_height: emptyDim,
    min_height_laptop: emptyDim,
    min_height_tablet: emptyDim,
    min_height_mobile: emptyDim,
    flex_direction: 'column',
    flex_direction_laptop: '',
    flex_direction_tablet: '',
    flex_direction_mobile: '',
    flex__is_row: 'row',
    flex__is_column: 'column',
    flex_justify_content: '',
    flex_justify_content_laptop: '',
    flex_justify_content_tablet: '',
    flex_justify_content_mobile: '',
    flex_align_items: '',
    flex_align_items_laptop: '',
    flex_align_items_tablet: '',
    flex_align_items_mobile: '',
    flex_gap: { ...emptyGap },
    flex_gap_laptop: { ...emptyGap },
    flex_gap_tablet: { ...emptyGap },
    flex_gap_mobile: { ...emptyGap },
    flex_wrap: '',
    flex_wrap_laptop: '',
    flex_wrap_tablet: '',
    flex_wrap_mobile: '',
    flex_align_content: '',
    flex_align_content_laptop: '',
    flex_align_content_tablet: '',
    flex_align_content_mobile: '',
    // grid
    grid_outline: 'yes',
    grid_columns_grid: { unit: 'fr', size: 3, sizes: [] as never[] },
    grid_columns_grid_laptop: { unit: 'fr', size: '', sizes: [] as never[] },
    grid_columns_grid_tablet: { unit: 'fr', size: '', sizes: [] as never[] },
    grid_columns_grid_mobile: { unit: 'fr', size: 1, sizes: [] as never[] },
    grid_rows_grid: { unit: 'fr', size: 2, sizes: [] as never[] },
    grid_rows_grid_laptop: { unit: 'fr', size: '', sizes: [] as never[] },
    grid_rows_grid_tablet: { unit: 'fr', size: '', sizes: [] as never[] },
    grid_rows_grid_mobile: { unit: 'fr', size: '', sizes: [] as never[] },
    grid_gaps: { ...emptyGap },
    grid_gaps_laptop: { ...emptyGap },
    grid_gaps_tablet: { ...emptyGap },
    grid_gaps_mobile: { ...emptyGap },
    grid_auto_flow: 'row',
    grid_auto_flow_laptop: 'row',
    grid_auto_flow_tablet: 'row',
    grid_auto_flow_mobile: 'row',
    grid_justify_items: '',
    grid_justify_items_laptop: '',
    grid_justify_items_tablet: '',
    grid_justify_items_mobile: '',
    grid_align_items: '',
    grid_align_items_laptop: '',
    grid_align_items_tablet: '',
    grid_align_items_mobile: '',
    grid_justify_content: '',
    grid_justify_content_laptop: '',
    grid_justify_content_tablet: '',
    grid_justify_content_mobile: '',
    grid_align_content: '',
    grid_align_content_laptop: '',
    grid_align_content_tablet: '',
    grid_align_content_mobile: '',
    grid__is_row: 'row',
    grid__is_column: 'column',
    // misc layout
    overflow: '',
    html_tag: '',
    link: { url: '', is_external: '', nofollow: '', custom_attributes: '' },
    // background normal
    background_background: '',
    background_color: '',
    background_color_stop: { ...bgColorStop },
    background_color_stop_laptop: { ...emptyDimPctOnly },
    background_color_stop_tablet: { ...emptyDimPctOnly },
    background_color_stop_mobile: { ...emptyDimPctOnly },
    background_color_b: '#f2295b',
    background_color_b_stop: { ...bgColorBStop },
    background_color_b_stop_laptop: { ...emptyDimPctOnly },
    background_color_b_stop_tablet: { ...emptyDimPctOnly },
    background_color_b_stop_mobile: { ...emptyDimPctOnly },
    background_gradient_type: 'linear',
    background_gradient_angle: { ...bgGradAngle },
    background_gradient_angle_laptop: { ...emptyDimDegOnly },
    background_gradient_angle_tablet: { ...emptyDimDegOnly },
    background_gradient_angle_mobile: { ...emptyDimDegOnly },
    background_gradient_position: 'center center',
    background_gradient_position_laptop: '',
    background_gradient_position_tablet: '',
    background_gradient_position_mobile: '',
    background_image: { ...emptyImg },
    background_image_laptop: { ...emptyImg },
    background_image_tablet: { ...emptyImg },
    background_image_mobile: { ...emptyImg },
    background_position: '',
    background_position_laptop: '',
    background_position_tablet: '',
    background_position_mobile: '',
    background_xpos: { unit: 'px', size: 0, sizes: [] as never[] },
    background_xpos_laptop: emptyDim,
    background_xpos_tablet: { unit: 'px', size: 0, sizes: [] as never[] },
    background_xpos_mobile: { unit: 'px', size: 0, sizes: [] as never[] },
    background_ypos: { unit: 'px', size: 0, sizes: [] as never[] },
    background_ypos_laptop: emptyDim,
    background_ypos_tablet: { unit: 'px', size: 0, sizes: [] as never[] },
    background_ypos_mobile: { unit: 'px', size: 0, sizes: [] as never[] },
    background_attachment: '',
    background_repeat: '',
    background_repeat_laptop: '',
    background_repeat_tablet: '',
    background_repeat_mobile: '',
    background_size: '',
    background_size_laptop: '',
    background_size_tablet: '',
    background_size_mobile: '',
    background_bg_width: { unit: '%', size: 100, sizes: [] as never[] },
    background_bg_width_laptop: emptyDim,
    background_bg_width_tablet: emptyDim,
    background_bg_width_mobile: emptyDim,
    background_video_link: '',
    background_video_start: '',
    background_video_end: '',
    background_play_once: '',
    background_play_on_mobile: '',
    background_privacy_mode: '',
    background_video_fallback: { ...emptyImg },
    background_slideshow_gallery: [],
    background_slideshow_loop: 'yes',
    background_slideshow_slide_duration: 5000,
    background_slideshow_slide_transition: 'fade',
    background_slideshow_transition_duration: 500,
    background_slideshow_background_size: '',
    background_slideshow_background_size_laptop: '',
    background_slideshow_background_size_tablet: '',
    background_slideshow_background_size_mobile: '',
    background_slideshow_background_position: '',
    background_slideshow_background_position_laptop: '',
    background_slideshow_background_position_tablet: '',
    background_slideshow_background_position_mobile: '',
    background_slideshow_lazyload: '',
    background_slideshow_ken_burns: '',
    background_slideshow_ken_burns_zoom_direction: 'in',
    handle_slideshow_asset_loading: '',
    // background hover
    background_hover_background: '',
    background_hover_color: '',
    background_hover_color_stop: { ...bgColorStop },
    background_hover_color_stop_laptop: { ...emptyDimPctOnly },
    background_hover_color_stop_tablet: { ...emptyDimPctOnly },
    background_hover_color_stop_mobile: { ...emptyDimPctOnly },
    background_hover_color_b: '#f2295b',
    background_hover_color_b_stop: { ...bgColorBStop },
    background_hover_color_b_stop_laptop: { ...emptyDimPctOnly },
    background_hover_color_b_stop_tablet: { ...emptyDimPctOnly },
    background_hover_color_b_stop_mobile: { ...emptyDimPctOnly },
    background_hover_gradient_type: 'linear',
    background_hover_gradient_angle: { ...bgGradAngle },
    background_hover_gradient_angle_laptop: { ...emptyDimDegOnly },
    background_hover_gradient_angle_tablet: { ...emptyDimDegOnly },
    background_hover_gradient_angle_mobile: { ...emptyDimDegOnly },
    background_hover_gradient_position: 'center center',
    background_hover_gradient_position_laptop: '',
    background_hover_gradient_position_tablet: '',
    background_hover_gradient_position_mobile: '',
    background_hover_image: { ...emptyImg },
    background_hover_image_laptop: { ...emptyImg },
    background_hover_image_tablet: { ...emptyImg },
    background_hover_image_mobile: { ...emptyImg },
    background_hover_position: '',
    background_hover_position_laptop: '',
    background_hover_position_tablet: '',
    background_hover_position_mobile: '',
    background_hover_xpos: { unit: 'px', size: 0, sizes: [] as never[] },
    background_hover_xpos_laptop: emptyDim,
    background_hover_xpos_tablet: { unit: 'px', size: 0, sizes: [] as never[] },
    background_hover_xpos_mobile: { unit: 'px', size: 0, sizes: [] as never[] },
    background_hover_ypos: { unit: 'px', size: 0, sizes: [] as never[] },
    background_hover_ypos_laptop: emptyDim,
    background_hover_ypos_tablet: { unit: 'px', size: 0, sizes: [] as never[] },
    background_hover_ypos_mobile: { unit: 'px', size: 0, sizes: [] as never[] },
    background_hover_attachment: '',
    background_hover_repeat: '',
    background_hover_repeat_laptop: '',
    background_hover_repeat_tablet: '',
    background_hover_repeat_mobile: '',
    background_hover_size: '',
    background_hover_size_laptop: '',
    background_hover_size_tablet: '',
    background_hover_size_mobile: '',
    background_hover_bg_width: { unit: '%', size: 100, sizes: [] as never[] },
    background_hover_bg_width_laptop: emptyDim,
    background_hover_bg_width_tablet: emptyDim,
    background_hover_bg_width_mobile: emptyDim,
    background_hover_video_link: '',
    background_hover_video_start: '',
    background_hover_video_end: '',
    background_hover_play_once: '',
    background_hover_play_on_mobile: '',
    background_hover_privacy_mode: '',
    background_hover_video_fallback: { ...emptyImg },
    background_hover_slideshow_gallery: [],
    background_hover_slideshow_loop: 'yes',
    background_hover_slideshow_slide_duration: 5000,
    background_hover_slideshow_slide_transition: 'fade',
    background_hover_slideshow_transition_duration: 500,
    background_hover_slideshow_background_size: '',
    background_hover_slideshow_background_size_laptop: '',
    background_hover_slideshow_background_size_tablet: '',
    background_hover_slideshow_background_size_mobile: '',
    background_hover_slideshow_background_position: '',
    background_hover_slideshow_background_position_laptop: '',
    background_hover_slideshow_background_position_tablet: '',
    background_hover_slideshow_background_position_mobile: '',
    background_hover_slideshow_lazyload: '',
    background_hover_slideshow_ken_burns: '',
    background_hover_slideshow_ken_burns_zoom_direction: 'in',
    background_hover_transition: { ...bgHoverTransition },
    // background motion fx
    background_motion_fx_motion_fx_scrolling: '',
    background_motion_fx_translateY_effect: '',
    background_motion_fx_translateY_direction: '',
    background_motion_fx_translateY_speed: { unit: 'px', size: 4, sizes: [] as never[] },
    background_motion_fx_translateY_affectedRange: { unit: '%', size: '', sizes: { start: 0, end: 100 } },
    background_motion_fx_translateX_effect: '',
    background_motion_fx_translateX_direction: '',
    background_motion_fx_translateX_speed: { unit: 'px', size: 4, sizes: [] as never[] },
    background_motion_fx_translateX_affectedRange: { unit: '%', size: '', sizes: { start: 0, end: 100 } },
    background_motion_fx_opacity_effect: '',
    background_motion_fx_opacity_direction: 'out-in',
    background_motion_fx_opacity_level: { unit: 'px', size: 10, sizes: [] as never[] },
    background_motion_fx_opacity_range: { unit: '%', size: '', sizes: { start: 20, end: 80 } },
    background_motion_fx_blur_effect: '',
    background_motion_fx_blur_direction: 'out-in',
    background_motion_fx_blur_level: { unit: 'px', size: 7, sizes: [] as never[] },
    background_motion_fx_blur_range: { unit: '%', size: '', sizes: { start: 20, end: 80 } },
    background_motion_fx_rotateZ_direction: '',
    background_motion_fx_rotateZ_speed: { unit: 'px', size: 1, sizes: [] as never[] },
    background_motion_fx_rotateZ_affectedRange: { unit: '%', size: '', sizes: { start: 0, end: 100 } },
    background_motion_fx_scale_effect: '',
    background_motion_fx_scale_direction: 'out-in',
    background_motion_fx_scale_speed: { unit: 'px', size: 4, sizes: [] as never[] },
    background_motion_fx_scale_range: { unit: '%', size: '', sizes: { start: 20, end: 80 } },
    background_motion_fx_devices: ['desktop', 'laptop', 'tablet', 'mobile'],
    background_motion_fx_range: '',
    background_motion_fx_motion_fx_mouse: '',
    background_motion_fx_mouseTrack_effect: '',
    background_motion_fx_mouseTrack_direction: '',
    background_motion_fx_mouseTrack_speed: { unit: 'px', size: 1, sizes: [] as never[] },
    background_motion_fx_tilt_direction: '',
    background_motion_fx_tilt_speed: { unit: 'px', size: 4, sizes: [] as never[] },
    background_handle_motion_fx_asset_loading: '',
    // background overlay
    background_overlay_background: '',
    background_overlay_color: '',
    background_overlay_color_stop: { ...bgColorStop },
    background_overlay_color_stop_laptop: { ...emptyDimPctOnly },
    background_overlay_color_stop_tablet: { ...emptyDimPctOnly },
    background_overlay_color_stop_mobile: { ...emptyDimPctOnly },
    background_overlay_color_b: '#f2295b',
    background_overlay_color_b_stop: { ...bgColorBStop },
    background_overlay_color_b_stop_laptop: { ...emptyDimPctOnly },
    background_overlay_color_b_stop_tablet: { ...emptyDimPctOnly },
    background_overlay_color_b_stop_mobile: { ...emptyDimPctOnly },
    background_overlay_gradient_type: 'linear',
    background_overlay_gradient_angle: { ...bgGradAngle },
    background_overlay_gradient_angle_laptop: { ...emptyDimDegOnly },
    background_overlay_gradient_angle_tablet: { ...emptyDimDegOnly },
    background_overlay_gradient_angle_mobile: { ...emptyDimDegOnly },
    background_overlay_gradient_position: 'center center',
    background_overlay_gradient_position_laptop: '',
    background_overlay_gradient_position_tablet: '',
    background_overlay_gradient_position_mobile: '',
    background_overlay_image: { ...emptyImg },
    background_overlay_image_laptop: { ...emptyImg },
    background_overlay_image_tablet: { ...emptyImg },
    background_overlay_image_mobile: { ...emptyImg },
    background_overlay_position: '',
    background_overlay_position_laptop: '',
    background_overlay_position_tablet: '',
    background_overlay_position_mobile: '',
    background_overlay_xpos: { unit: 'px', size: 0, sizes: [] as never[] },
    background_overlay_xpos_laptop: emptyDim,
    background_overlay_xpos_tablet: { unit: 'px', size: 0, sizes: [] as never[] },
    background_overlay_xpos_mobile: { unit: 'px', size: 0, sizes: [] as never[] },
    background_overlay_ypos: { unit: 'px', size: 0, sizes: [] as never[] },
    background_overlay_ypos_laptop: emptyDim,
    background_overlay_ypos_tablet: { unit: 'px', size: 0, sizes: [] as never[] },
    background_overlay_ypos_mobile: { unit: 'px', size: 0, sizes: [] as never[] },
    background_overlay_attachment: '',
    background_overlay_repeat: '',
    background_overlay_repeat_laptop: '',
    background_overlay_repeat_tablet: '',
    background_overlay_repeat_mobile: '',
    background_overlay_size: '',
    background_overlay_size_laptop: '',
    background_overlay_size_tablet: '',
    background_overlay_size_mobile: '',
    background_overlay_bg_width: { unit: '%', size: 100, sizes: [] as never[] },
    background_overlay_bg_width_laptop: emptyDim,
    background_overlay_bg_width_tablet: emptyDim,
    background_overlay_bg_width_mobile: emptyDim,
    background_overlay_video_link: '',
    background_overlay_video_start: '',
    background_overlay_video_end: '',
    background_overlay_play_once: '',
    background_overlay_play_on_mobile: '',
    background_overlay_privacy_mode: '',
    background_overlay_video_fallback: { ...emptyImg },
    background_overlay_slideshow_gallery: [],
    background_overlay_slideshow_loop: 'yes',
    background_overlay_slideshow_slide_duration: 5000,
    background_overlay_slideshow_slide_transition: 'fade',
    background_overlay_slideshow_transition_duration: 500,
    background_overlay_slideshow_background_size: '',
    background_overlay_slideshow_background_size_laptop: '',
    background_overlay_slideshow_background_size_tablet: '',
    background_overlay_slideshow_background_size_mobile: '',
    background_overlay_slideshow_background_position: '',
    background_overlay_slideshow_background_position_laptop: '',
    background_overlay_slideshow_background_position_tablet: '',
    background_overlay_slideshow_background_position_mobile: '',
    background_overlay_slideshow_lazyload: '',
    background_overlay_slideshow_ken_burns: '',
    background_overlay_slideshow_ken_burns_zoom_direction: 'in',
    background_overlay_opacity: { ...bgOverlayOpacity },
    background_overlay_opacity_laptop: emptyDim,
    background_overlay_opacity_tablet: emptyDim,
    background_overlay_opacity_mobile: emptyDim,
    css_filters_css_filter: '',
    css_filters_blur: { unit: 'px', size: 0, sizes: [] as never[] },
    css_filters_brightness: { unit: 'px', size: 100, sizes: [] as never[] },
    css_filters_contrast: { unit: 'px', size: 100, sizes: [] as never[] },
    css_filters_saturate: { unit: 'px', size: 100, sizes: [] as never[] },
    css_filters_hue: { unit: 'px', size: 0, sizes: [] as never[] },
    overlay_blend_mode: '',
    // background overlay hover
    background_overlay_hover_background: '',
    background_overlay_hover_color: '',
    background_overlay_hover_color_stop: { ...bgColorStop },
    background_overlay_hover_color_stop_laptop: { ...emptyDimPctOnly },
    background_overlay_hover_color_stop_tablet: { ...emptyDimPctOnly },
    background_overlay_hover_color_stop_mobile: { ...emptyDimPctOnly },
    background_overlay_hover_color_b: '#f2295b',
    background_overlay_hover_color_b_stop: { ...bgColorBStop },
    background_overlay_hover_color_b_stop_laptop: { ...emptyDimPctOnly },
    background_overlay_hover_color_b_stop_tablet: { ...emptyDimPctOnly },
    background_overlay_hover_color_b_stop_mobile: { ...emptyDimPctOnly },
    background_overlay_hover_gradient_type: 'linear',
    background_overlay_hover_gradient_angle: { ...bgGradAngle },
    background_overlay_hover_gradient_angle_laptop: { ...emptyDimDegOnly },
    background_overlay_hover_gradient_angle_tablet: { ...emptyDimDegOnly },
    background_overlay_hover_gradient_angle_mobile: { ...emptyDimDegOnly },
    background_overlay_hover_gradient_position: 'center center',
    background_overlay_hover_gradient_position_laptop: '',
    background_overlay_hover_gradient_position_tablet: '',
    background_overlay_hover_gradient_position_mobile: '',
    background_overlay_hover_image: { ...emptyImg },
    background_overlay_hover_image_laptop: { ...emptyImg },
    background_overlay_hover_image_tablet: { ...emptyImg },
    background_overlay_hover_image_mobile: { ...emptyImg },
    background_overlay_hover_position: '',
    background_overlay_hover_position_laptop: '',
    background_overlay_hover_position_tablet: '',
    background_overlay_hover_position_mobile: '',
    background_overlay_hover_xpos: { unit: 'px', size: 0, sizes: [] as never[] },
    background_overlay_hover_xpos_laptop: emptyDim,
    background_overlay_hover_xpos_tablet: { unit: 'px', size: 0, sizes: [] as never[] },
    background_overlay_hover_xpos_mobile: { unit: 'px', size: 0, sizes: [] as never[] },
    background_overlay_hover_ypos: { unit: 'px', size: 0, sizes: [] as never[] },
    background_overlay_hover_ypos_laptop: emptyDim,
    background_overlay_hover_ypos_tablet: { unit: 'px', size: 0, sizes: [] as never[] },
    background_overlay_hover_ypos_mobile: { unit: 'px', size: 0, sizes: [] as never[] },
    background_overlay_hover_attachment: '',
    background_overlay_hover_repeat: '',
    background_overlay_hover_repeat_laptop: '',
    background_overlay_hover_repeat_tablet: '',
    background_overlay_hover_repeat_mobile: '',
    background_overlay_hover_size: '',
    background_overlay_hover_size_laptop: '',
    background_overlay_hover_size_tablet: '',
    background_overlay_hover_size_mobile: '',
    background_overlay_hover_bg_width: { unit: '%', size: 100, sizes: [] as never[] },
    background_overlay_hover_bg_width_laptop: emptyDim,
    background_overlay_hover_bg_width_tablet: emptyDim,
    background_overlay_hover_bg_width_mobile: emptyDim,
    background_overlay_hover_video_link: '',
    background_overlay_hover_video_start: '',
    background_overlay_hover_video_end: '',
    background_overlay_hover_play_once: '',
    background_overlay_hover_play_on_mobile: '',
    background_overlay_hover_privacy_mode: '',
    background_overlay_hover_video_fallback: { ...emptyImg },
    background_overlay_hover_slideshow_gallery: [],
    background_overlay_hover_slideshow_loop: 'yes',
    background_overlay_hover_slideshow_slide_duration: 5000,
    background_overlay_hover_slideshow_slide_transition: 'fade',
    background_overlay_hover_slideshow_transition_duration: 500,
    background_overlay_hover_slideshow_background_size: '',
    background_overlay_hover_slideshow_background_size_laptop: '',
    background_overlay_hover_slideshow_background_size_tablet: '',
    background_overlay_hover_slideshow_background_size_mobile: '',
    background_overlay_hover_slideshow_background_position: '',
    background_overlay_hover_slideshow_background_position_laptop: '',
    background_overlay_hover_slideshow_background_position_tablet: '',
    background_overlay_hover_slideshow_background_position_mobile: '',
    background_overlay_hover_slideshow_lazyload: '',
    background_overlay_hover_slideshow_ken_burns: '',
    background_overlay_hover_slideshow_ken_burns_zoom_direction: 'in',
    background_overlay_hover_opacity: { ...bgOverlayOpacity },
    background_overlay_hover_opacity_laptop: emptyDim,
    background_overlay_hover_opacity_tablet: emptyDim,
    background_overlay_hover_opacity_mobile: emptyDim,
    background_overlay_hover_transition: { unit: 'px', size: '', sizes: [] as never[] },
    css_filters_hover_css_filter: '',
    css_filters_hover_blur: { unit: 'px', size: 0, sizes: [] as never[] },
    css_filters_hover_brightness: { unit: 'px', size: 100, sizes: [] as never[] },
    css_filters_hover_contrast: { unit: 'px', size: 100, sizes: [] as never[] },
    css_filters_hover_saturate: { unit: 'px', size: 100, sizes: [] as never[] },
    css_filters_hover_hue: { unit: 'px', size: 0, sizes: [] as never[] },
    uc_background_type: '__none__',
    uc_background_location: 'back',
    // border normal
    border_border: '',
    border_width: { ...emptyBoxVal },
    border_width_laptop: { ...emptyBoxVal },
    border_width_tablet: { ...emptyBoxVal },
    border_width_mobile: { ...emptyBoxVal },
    border_color: '',
    border_radius: { ...emptyBoxVal },
    border_radius_laptop: { ...emptyBoxVal },
    border_radius_tablet: { ...emptyBoxVal },
    border_radius_mobile: { ...emptyBoxVal },
    box_shadow_box_shadow_type: '',
    box_shadow_box_shadow: { ...defaultShadowObj },
    box_shadow_box_shadow_position: ' ',
    // border hover
    border_hover_border: '',
    border_hover_width: { ...emptyBoxVal },
    border_hover_width_laptop: { ...emptyBoxVal },
    border_hover_width_tablet: { ...emptyBoxVal },
    border_hover_width_mobile: { ...emptyBoxVal },
    border_hover_color: '',
    border_radius_hover: { ...emptyBoxVal },
    border_radius_hover_laptop: { ...emptyBoxVal },
    border_radius_hover_tablet: { ...emptyBoxVal },
    border_radius_hover_mobile: { ...emptyBoxVal },
    box_shadow_hover_box_shadow_type: '',
    box_shadow_hover_box_shadow: { ...defaultShadowObj },
    box_shadow_hover_box_shadow_position: ' ',
    border_hover_transition: { ...borderHoverTransition },
    // shape dividers
    shape_divider_top: '',
    shape_divider_top_color: '',
    shape_divider_top_width: emptyDimPct,
    shape_divider_top_width_laptop: emptyDim,
    shape_divider_top_width_tablet: emptyDimPct,
    shape_divider_top_width_mobile: emptyDimPct,
    shape_divider_top_height: emptyDim,
    shape_divider_top_height_laptop: emptyDim,
    shape_divider_top_height_tablet: emptyDim,
    shape_divider_top_height_mobile: emptyDim,
    shape_divider_top_flip: '',
    shape_divider_top_negative: '',
    shape_divider_top_above_content: '',
    shape_divider_bottom: '',
    shape_divider_bottom_color: '',
    shape_divider_bottom_width: emptyDimPct,
    shape_divider_bottom_width_laptop: emptyDim,
    shape_divider_bottom_width_tablet: emptyDimPct,
    shape_divider_bottom_width_mobile: emptyDimPct,
    shape_divider_bottom_height: emptyDim,
    shape_divider_bottom_height_laptop: emptyDim,
    shape_divider_bottom_height_tablet: emptyDim,
    shape_divider_bottom_height_mobile: emptyDim,
    shape_divider_bottom_flip: '',
    shape_divider_bottom_negative: '',
    shape_divider_bottom_above_content: '',
    // spacing
    margin: { ...emptyBoxVal },
    margin_laptop: { ...emptyBoxVal },
    margin_tablet: { ...emptyBoxVal },
    margin_mobile: { ...emptyBoxVal },
    padding: { ...emptyBoxVal },
    padding_laptop: { ...emptyBoxVal },
    padding_tablet: { ...emptyBoxVal },
    padding_mobile: { ...emptyBoxVal },
    // grid child positioning
    grid_column: '',
    grid_column_laptop: '',
    grid_column_tablet: '',
    grid_column_mobile: '',
    grid_column_custom: '',
    grid_column_custom_laptop: '',
    grid_column_custom_tablet: '',
    grid_column_custom_mobile: '',
    grid_row: '',
    grid_row_laptop: '',
    grid_row_tablet: '',
    grid_row_mobile: '',
    grid_row_custom: '',
    grid_row_custom_laptop: '',
    grid_row_custom_tablet: '',
    grid_row_custom_mobile: '',
    // flex child
    _flex_align_self: '',
    _flex_align_self_laptop: '',
    _flex_align_self_tablet: '',
    _flex_align_self_mobile: '',
    _flex_order: '',
    _flex_order_laptop: '',
    _flex_order_tablet: '',
    _flex_order_mobile: '',
    _flex_order_custom: '',
    _flex_order_custom_laptop: '',
    _flex_order_custom_tablet: '',
    _flex_order_custom_mobile: '',
    _flex_size: '',
    _flex_size_laptop: '',
    _flex_size_tablet: '',
    _flex_size_mobile: '',
    _flex_grow: 1,
    _flex_grow_laptop: '',
    _flex_grow_tablet: '',
    _flex_grow_mobile: '',
    _flex_shrink: 1,
    _flex_shrink_laptop: '',
    _flex_shrink_tablet: '',
    _flex_shrink_mobile: '',
    // positioning
    position: '',
    _offset_orientation_h: 'start',
    _offset_x: { unit: 'px', size: 0, sizes: [] as never[] },
    _offset_x_laptop: emptyDim,
    _offset_x_tablet: emptyDim,
    _offset_x_mobile: emptyDim,
    _offset_x_end: { unit: 'px', size: 0, sizes: [] as never[] },
    _offset_x_end_laptop: emptyDim,
    _offset_x_end_tablet: emptyDim,
    _offset_x_end_mobile: emptyDim,
    _offset_orientation_v: 'start',
    _offset_y: { unit: 'px', size: 0, sizes: [] as never[] },
    _offset_y_laptop: emptyDim,
    _offset_y_tablet: emptyDim,
    _offset_y_mobile: emptyDim,
    _offset_y_end: { unit: 'px', size: 0, sizes: [] as never[] },
    _offset_y_end_laptop: emptyDim,
    _offset_y_end_tablet: emptyDim,
    _offset_y_end_mobile: emptyDim,
    z_index: '',
    z_index_laptop: '',
    z_index_tablet: '',
    z_index_mobile: '',
    _element_id: '',
    css_classes: '',
    e_display_conditions: '',
    // motion fx
    motion_fx_motion_fx_scrolling: '',
    motion_fx_translateY_effect: '',
    motion_fx_translateY_direction: '',
    motion_fx_translateY_speed: { unit: 'px', size: 4, sizes: [] as never[] },
    motion_fx_translateY_affectedRange: { unit: '%', size: '', sizes: { start: 0, end: 100 } },
    motion_fx_translateX_effect: '',
    motion_fx_translateX_direction: '',
    motion_fx_translateX_speed: { unit: 'px', size: 4, sizes: [] as never[] },
    motion_fx_translateX_affectedRange: { unit: '%', size: '', sizes: { start: 0, end: 100 } },
    motion_fx_opacity_effect: '',
    motion_fx_opacity_direction: 'out-in',
    motion_fx_opacity_level: { unit: 'px', size: 10, sizes: [] as never[] },
    motion_fx_opacity_range: { unit: '%', size: '', sizes: { start: 20, end: 80 } },
    motion_fx_blur_effect: '',
    motion_fx_blur_direction: 'out-in',
    motion_fx_blur_level: { unit: 'px', size: 7, sizes: [] as never[] },
    motion_fx_blur_range: { unit: '%', size: '', sizes: { start: 20, end: 80 } },
    motion_fx_rotateZ_effect: '',
    motion_fx_rotateZ_direction: '',
    motion_fx_rotateZ_speed: { unit: 'px', size: 1, sizes: [] as never[] },
    motion_fx_rotateZ_affectedRange: { unit: '%', size: '', sizes: { start: 0, end: 100 } },
    motion_fx_scale_effect: '',
    motion_fx_scale_direction: 'out-in',
    motion_fx_scale_speed: { unit: 'px', size: 4, sizes: [] as never[] },
    motion_fx_scale_range: { unit: '%', size: '', sizes: { start: 20, end: 80 } },
    motion_fx_transform_origin_x: 'center',
    motion_fx_transform_origin_y: 'center',
    motion_fx_devices: ['desktop', 'laptop', 'tablet', 'mobile'],
    motion_fx_range: '',
    motion_fx_motion_fx_mouse: '',
    motion_fx_mouseTrack_effect: '',
    motion_fx_mouseTrack_direction: '',
    motion_fx_mouseTrack_speed: { unit: 'px', size: 1, sizes: [] as never[] },
    motion_fx_tilt_effect: '',
    motion_fx_tilt_direction: '',
    motion_fx_tilt_speed: { unit: 'px', size: 4, sizes: [] as never[] },
    handle_motion_fx_asset_loading: '',
    // sticky
    sticky: '',
    sticky_on: ['desktop', 'laptop', 'tablet', 'mobile'],
    sticky_offset: 0,
    sticky_offset_laptop: '',
    sticky_offset_tablet: '',
    sticky_offset_mobile: '',
    sticky_effects_offset: 0,
    sticky_effects_offset_laptop: '',
    sticky_effects_offset_tablet: '',
    sticky_effects_offset_mobile: '',
    sticky_anchor_link_offset: 0,
    sticky_anchor_link_offset_laptop: '',
    sticky_anchor_link_offset_tablet: '',
    sticky_anchor_link_offset_mobile: '',
    sticky_parent: '',
    // animation
    animation: '',
    animation_laptop: '',
    animation_tablet: '',
    animation_mobile: '',
    animation_duration: '',
    animation_delay: '',
    // transforms
    _transform_rotate_popover: '',
    _transform_rotateZ_effect: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_rotateZ_effect_laptop: { ...emptyDimDeg },
    _transform_rotateZ_effect_tablet: { ...emptyDimDeg },
    _transform_rotateZ_effect_mobile: { ...emptyDimDeg },
    _transform_rotate_3d: '',
    _transform_rotateX_effect: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_rotateX_effect_laptop: { ...emptyDimDeg },
    _transform_rotateX_effect_tablet: { ...emptyDimDeg },
    _transform_rotateX_effect_mobile: { ...emptyDimDeg },
    _transform_rotateY_effect: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_rotateY_effect_laptop: { ...emptyDimDeg },
    _transform_rotateY_effect_tablet: { ...emptyDimDeg },
    _transform_rotateY_effect_mobile: { ...emptyDimDeg },
    _transform_perspective_effect: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_perspective_effect_laptop: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_perspective_effect_tablet: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_perspective_effect_mobile: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_translate_popover: '',
    _transform_translateX_effect: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_translateX_effect_laptop: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_translateX_effect_tablet: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_translateX_effect_mobile: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_translateY_effect: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_translateY_effect_laptop: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_translateY_effect_tablet: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_translateY_effect_mobile: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_scale_popover: '',
    _transform_keep_proportions: 'yes',
    _transform_scale_effect: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_scale_effect_laptop: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_scale_effect_tablet: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_scale_effect_mobile: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_scaleX_effect: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_scaleX_effect_laptop: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_scaleX_effect_tablet: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_scaleX_effect_mobile: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_scaleY_effect: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_scaleY_effect_laptop: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_scaleY_effect_tablet: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_scaleY_effect_mobile: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_skew_popover: '',
    _transform_skewX_effect: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_skewX_effect_laptop: { ...emptyDimDeg },
    _transform_skewX_effect_tablet: { ...emptyDimDeg },
    _transform_skewX_effect_mobile: { ...emptyDimDeg },
    _transform_skewY_effect: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_skewY_effect_laptop: { ...emptyDimDeg },
    _transform_skewY_effect_tablet: { ...emptyDimDeg },
    _transform_skewY_effect_mobile: { ...emptyDimDeg },
    _transform_flipX_effect: '',
    _transform_flipY_effect: '',
    // transforms hover
    _transform_rotate_popover_hover: '',
    _transform_rotateZ_effect_hover: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_rotateZ_effect_hover_laptop: { ...emptyDimDeg },
    _transform_rotateZ_effect_hover_tablet: { ...emptyDimDeg },
    _transform_rotateZ_effect_hover_mobile: { ...emptyDimDeg },
    _transform_rotate_3d_hover: '',
    _transform_rotateX_effect_hover: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_rotateX_effect_hover_laptop: { ...emptyDimDeg },
    _transform_rotateX_effect_hover_tablet: { ...emptyDimDeg },
    _transform_rotateX_effect_hover_mobile: { ...emptyDimDeg },
    _transform_rotateY_effect_hover: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_rotateY_effect_hover_laptop: { ...emptyDimDeg },
    _transform_rotateY_effect_hover_tablet: { ...emptyDimDeg },
    _transform_rotateY_effect_hover_mobile: { ...emptyDimDeg },
    _transform_perspective_effect_hover: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_perspective_effect_hover_laptop: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_perspective_effect_hover_tablet: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_perspective_effect_hover_mobile: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_translate_popover_hover: '',
    _transform_translateX_effect_hover: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_translateX_effect_hover_laptop: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_translateX_effect_hover_tablet: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_translateX_effect_hover_mobile: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_translateY_effect_hover: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_translateY_effect_hover_laptop: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_translateY_effect_hover_tablet: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_translateY_effect_hover_mobile: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_scale_popover_hover: '',
    _transform_keep_proportions_hover: 'yes',
    _transform_scale_effect_hover: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_scale_effect_hover_laptop: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_scale_effect_hover_tablet: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_scale_effect_hover_mobile: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_scaleX_effect_hover: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_scaleX_effect_hover_laptop: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_scaleX_effect_hover_tablet: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_scaleX_effect_hover_mobile: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_scaleY_effect_hover: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_scaleY_effect_hover_laptop: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_scaleY_effect_hover_tablet: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_scaleY_effect_hover_mobile: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_skew_popover_hover: '',
    _transform_skewX_effect_hover: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_skewX_effect_hover_laptop: { ...emptyDimDeg },
    _transform_skewX_effect_hover_tablet: { ...emptyDimDeg },
    _transform_skewX_effect_hover_mobile: { ...emptyDimDeg },
    _transform_skewY_effect_hover: { unit: 'px', size: '', sizes: [] as never[] },
    _transform_skewY_effect_hover_laptop: { ...emptyDimDeg },
    _transform_skewY_effect_hover_tablet: { ...emptyDimDeg },
    _transform_skewY_effect_hover_mobile: { ...emptyDimDeg },
    _transform_flipX_effect_hover: '',
    _transform_flipY_effect_hover: '',
    _transform_transition_hover: { unit: 'px', size: '', sizes: [] as never[] },
    motion_fx_transform_x_anchor_point: '',
    motion_fx_transform_x_anchor_point_laptop: '',
    motion_fx_transform_x_anchor_point_tablet: '',
    motion_fx_transform_x_anchor_point_mobile: '',
    motion_fx_transform_y_anchor_point: '',
    motion_fx_transform_y_anchor_point_laptop: '',
    motion_fx_transform_y_anchor_point_tablet: '',
    motion_fx_transform_y_anchor_point_mobile: '',
    // visibility
    hide_desktop: '',
    hide_laptop: '',
    hide_tablet: '',
    hide_mobile: '',
    // misc
    custom_css: '',
  };
}

// --- Legacy section/column settings boilerplate ---

function getLegacySectionSettings(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const emptyBox4 = { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true };
  const emptyBox4empty = { unit: 'px', top: '', right: '', bottom: '', left: '', isLinked: true };
  const defaultShadow = { horizontal: 0, vertical: 0, blur: 10, spread: 0, color: 'rgba(0,0,0,0.5)' };
  return {
    layout: 'full_width',
    background_background: '',
    background_color: '',
    padding: { ...emptyBox4 },
    margin: { ...emptyBox4 },
    box_shadow_box_shadow_type: '',
    box_shadow_box_shadow: { ...defaultShadow },
    box_shadow_box_shadow_position: ' ',
    border_border: '',
    border_width: { ...emptyBox4empty },
    border_color: '',
    border_radius: { ...emptyBox4empty },
    hide_desktop: '',
    hide_tablet: '',
    hide_mobile: '',
    animation: '',
    custom_css: '',
    ...overrides,
  };
}

function getLegacyColumnSettings(columnSize: number, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const emptyBox4empty = { unit: 'px', top: '', right: '', bottom: '', left: '', isLinked: true };
  const defaultShadow = { horizontal: 0, vertical: 0, blur: 10, spread: 0, color: 'rgba(0,0,0,0.5)' };
  return {
    _column_size: columnSize,
    _inline_size: null,
    background_background: '',
    background_color: '',
    padding: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true },
    margin: { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true },
    border_border: '',
    border_width: { ...emptyBox4empty },
    border_color: '',
    border_radius: { ...emptyBox4empty },
    box_shadow_box_shadow_type: '',
    box_shadow_box_shadow: { ...defaultShadow },
    box_shadow_box_shadow_position: ' ',
    hide_desktop: '',
    hide_tablet: '',
    hide_mobile: '',
    animation: '',
    custom_css: '',
    ...overrides,
  };
}

function makeLegacySection(id: string, isInner: boolean, settings: Record<string, unknown>, columns: ElElement[]): ElElement {
  return {
    id,
    elType: 'section',
    isInner,
    isLocked: false,
    settings,
    defaultEditSettings: { defaultEditRoute: 'content' },
    interactions: {} as Record<string, never>,
    elements: columns,
    editSettings: { defaultEditRoute: 'content' },
    htmlCache: null,
  };
}

function makeLegacyColumn(id: string, isInner: boolean, settings: Record<string, unknown>, widgets: ElElement[]): ElElement {
  return {
    id,
    elType: 'column',
    isInner,
    isLocked: false,
    settings,
    defaultEditSettings: { defaultEditRoute: 'content' },
    interactions: {} as Record<string, never>,
    elements: widgets,
    editSettings: { defaultEditRoute: 'content' },
    htmlCache: null,
  };
}

// --- Visual overlap helpers (for NONE-layout anti-pattern detection) ---

interface Rect { x: number; y: number; w: number; h: number; }

function getRect(node: SceneNode): Rect {
  return { x: node.x, y: node.y, w: node.width, h: node.height };
}

function overlapArea(a: Rect, b: Rect): number {
  const xOverlap = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const yOverlap = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return xOverlap * yOverlap;
}

function isContainedIn(inner: Rect, outer: Rect): boolean {
  return (
    inner.x >= outer.x - 4 &&
    inner.y >= outer.y - 4 &&
    inner.x + inner.w <= outer.x + outer.w + 4 &&
    inner.y + inner.h <= outer.y + outer.h + 4
  );
}

function overlapRatio(a: Rect, b: Rect): number {
  const area = overlapArea(a, b);
  const smaller = Math.min(a.w * a.h, b.w * b.h);
  return smaller > 0 ? area / smaller : 0;
}

// --- Semantic group types for NONE-layout analysis ---

interface SemanticGroup {
  type: 'button' | 'image-with-text' | 'card' | 'decoration' | 'standalone';
  nodes: SceneNode[];
  primary: SceneNode;
  label?: TextNode;
  bgColor?: string;
  textColor?: string;
  radius?: number;
}

/**
 * Analyzes the direct children of a NONE-layout (absolute-positioned) frame and
 * returns semantic groups. This resolves the common Figma anti-pattern where a
 * button is modelled as a sibling Rectangle + Text instead of a parent Frame
 * containing a Text child.
 */
function analyzeNoneLayoutChildren(children: SceneNode[]): SemanticGroup[] {
  const consumed = new Set<string>();
  const groups: SemanticGroup[] = [];

  const shapes = children.filter(
    c =>
      (c.type === 'RECTANGLE' ||
        c.type === 'ELLIPSE' ||
        c.type === 'FRAME' ||
        c.type === 'COMPONENT' ||
        c.type === 'INSTANCE') &&
      !consumed.has(c.id)
  );
  const texts = children.filter(c => c.type === 'TEXT' && !consumed.has(c.id));

  // Pass 1: button patterns — small rounded shape with an overlapping text sibling
  for (const shape of shapes) {
    if (consumed.has(shape.id)) continue;

    const shapeRect = getRect(shape);
    const radius =
      'cornerRadius' in shape
        ? typeof (shape as FrameNode).cornerRadius === 'number'
          ? ((shape as FrameNode).cornerRadius as number)
          : 0
        : 0;
    const isButtonShape = shape.width < 500 && shape.height < 100 && radius >= 8;
    if (!isButtonShape) continue;

    const fillData =
      'fills' in shape
        ? extractFill((shape as RectangleNode).fills)
        : { type: 'none' as const, color: '', gradientStart: '', gradientEnd: '', gradientAngle: 0 };
    if (fillData.type !== 'solid' && fillData.type !== 'gradient') continue;

    // Find the best overlapping text node
    let bestText: TextNode | null = null;
    let bestOverlap = 0;
    for (const text of texts) {
      if (consumed.has(text.id)) continue;
      const textRect = getRect(text);
      const ratio = overlapRatio(textRect, shapeRect);
      const contained = isContainedIn(textRect, shapeRect);
      if ((ratio > 0.4 || contained) && ratio > bestOverlap) {
        bestOverlap = ratio;
        bestText = text as TextNode;
      }
    }

    if (bestText) {
      consumed.add(shape.id);
      consumed.add(bestText.id);
      const textFill = extractFill(bestText.fills);
      groups.push({
        type: 'button',
        nodes: [shape, bestText],
        primary: shape,
        label: bestText,
        bgColor: fillData.type === 'solid' ? fillData.color : fillData.gradientStart,
        textColor: textFill.type === 'solid' ? textFill.color : '#ffffff',
        radius,
      });
    }
  }

  // Pass 2: decoration patterns — large ellipses with no overlapping text
  for (const shape of shapes) {
    if (consumed.has(shape.id)) continue;

    const shapeRect = getRect(shape);
    let hasOverlappingText = false;
    for (const text of texts) {
      if (consumed.has(text.id)) continue;
      if (overlapRatio(getRect(text), shapeRect) > 0.3) {
        hasOverlappingText = true;
        break;
      }
    }

    const isLarge = shape.width > 150 || shape.height > 150;
    if (isLarge && !hasOverlappingText && shape.type === 'ELLIPSE') {
      consumed.add(shape.id);
      groups.push({ type: 'decoration', nodes: [shape], primary: shape });
    }
  }

  // Pass 3: remaining nodes become standalone groups
  for (const child of children) {
    if (!consumed.has(child.id)) {
      groups.push({ type: 'standalone', nodes: [child], primary: child });
    }
  }

  return groups;
}

/**
 * Shared helper: converts a SemanticGroup of type 'button' into an Elementor
 * button widget. Used by both container-mode and legacy-mode paths.
 */
function convertSemanticButton(group: SemanticGroup, ctx: ConversionContext): ElElement {
  const btn = makeElement(ctx.newId(), 'widget', true, 'button');
  const shape = group.primary;
  const label = group.label!;

  const fontSize =
    label.fontSize === figma.mixed ? 13 : (label.fontSize as number);
  const fontName =
    label.fontName === figma.mixed
      ? { family: 'Default', style: 'Regular' }
      : (label.fontName as FontName);

  const padV = Math.max(4, Math.round((shape.height - label.height) / 2));
  const padH = Math.max(8, Math.round((shape.width - label.width) / 2));

  btn.settings = {
    text: label.characters,
    link: { url: '#', is_external: false, nofollow: false, custom_attributes: '' },
    align: 'left',
    size: 'sm',
    background_color: group.bgColor!,
    button_text_color: group.textColor!,
    border_radius: { unit: 'px', size: group.radius!, sizes: [] as never[] },
    typography_typography: 'custom',
    typography_font_family: fontName.family,
    typography_font_size: { unit: 'px', size: Math.round(fontSize), sizes: [] as never[] },
    typography_font_weight: mapFontWeight(fontName.style),
    padding: {
      unit: 'px',
      top: String(padV),
      right: String(padH),
      bottom: String(padV),
      left: String(padH),
      isLinked: false,
    },
  };
  return btn;
}

// --- Decorative element detection ---

function isDecorativeOnly(node: SceneNode): boolean {
  if (node.type === 'TEXT') return false;
  if (node.type === 'RECTANGLE' || node.type === 'ELLIPSE') {
    const fill = extractFill((node as RectangleNode).fills);
    return fill.type !== 'image'; // solid/gradient fills are decorative
  }
  if ('children' in node) {
    return (node as FrameNode).children.every(isDecorativeOnly);
  }
  return true;
}

// --- Button detection ---

interface ButtonInfo {
  isButton: boolean;
  text: string;
  bgColor: string;
  textColor: string;
  radius: number;
}

function detectButton(node: FrameNode | ComponentNode | InstanceNode): ButtonInfo {
  const radius = typeof node.cornerRadius === 'number' ? node.cornerRadius : 0;
  if (radius < 12 || node.width > 400 || node.height > 80) {
    return { isButton: false, text: '', bgColor: '', textColor: '', radius: 0 };
  }

  const fillData = extractFill(node.fills);
  if (fillData.type !== 'solid') {
    return { isButton: false, text: '', bgColor: '', textColor: '', radius: 0 };
  }

  function findText(n: SceneNode): string {
    if (n.type === 'TEXT') return (n as TextNode).characters;
    if ('children' in n) {
      for (const child of (n as FrameNode).children) {
        const t = findText(child);
        if (t) return t;
      }
    }
    return '';
  }

  function findTextColor(n: SceneNode): string {
    if (n.type === 'TEXT') {
      const tf = extractFill((n as TextNode).fills);
      return tf.type === 'solid' ? tf.color : '#ffffff';
    }
    if ('children' in n) {
      for (const child of (n as FrameNode).children) {
        const c = findTextColor(child);
        if (c !== '') return c;
      }
    }
    return '';
  }

  const text = findText(node);
  if (!text) return { isButton: false, text: '', bgColor: '', textColor: '', radius: 0 };

  const textColor = findTextColor(node) || '#ffffff';
  return { isButton: true, text, bgColor: fillData.color, textColor, radius };
}

function convertFrameToButton(
  node: FrameNode | ComponentNode | InstanceNode,
  info: ButtonInfo,
  isInner: boolean,
  ctx: ConversionContext
): ElElement {
  const el = makeElement(ctx.newId(), 'widget', isInner, 'button');
  el.settings = {
    text: info.text,
    link: { url: '#', is_external: false, nofollow: false, custom_attributes: '' },
    align: 'left',
    size: 'sm',
    background_color: info.bgColor,
    button_text_color: info.textColor,
    border_radius: { unit: 'px', size: info.radius, sizes: [] as never[] },
    typography_typography: 'custom',
    typography_font_size: { unit: 'px', size: 13, sizes: [] as never[] },
    typography_font_weight: '600',
    padding: {
      unit: 'px',
      top: String(Math.round((node as FrameNode).paddingTop || 8)),
      right: String(Math.round((node as FrameNode).paddingRight || 16)),
      bottom: String(Math.round((node as FrameNode).paddingBottom || 8)),
      left: String(Math.round((node as FrameNode).paddingLeft || 16)),
      isLinked: false,
    },
  };
  return el;
}

// --- Ellipse converter ---

export function convertEllipse(
  node: EllipseNode,
  isInner: boolean,
  ctx: ConversionContext
): ElElement {
  const fillData = extractFill(node.fills);
  const shadowData = extractShadow(node.effects);

  if (fillData.type === 'image') {
    // Image fill ellipse → export as image
    return convertAsImage(node, isInner, ctx);
  }

  // Solid/gradient fill ellipse → container with border-radius: 50%
  const el = makeElement(ctx.newId(), 'container', isInner);
  el.settings = {
    ...getContainerBaseSettings(),
    container_type: 'flex',
    content_width: 'full',
    flex_direction: 'column',
    flex_justify_content: 'center',
    flex_align_items: 'center',
    width: dim(Math.round(node.width)),
    min_height: dim(Math.round(node.height)),
    background_background: fillData.type === 'solid' ? 'classic' : fillData.type === 'gradient' ? 'gradient' : '',
    background_color: fillData.type === 'solid' ? fillData.color : fillData.type === 'gradient' ? fillData.gradientStart : '',
    background_image: { url: '', id: '', size: '' },
    ...(fillData.type === 'gradient'
      ? {
          background_color_b: fillData.gradientEnd,
          background_gradient_type: 'linear',
          background_gradient_angle: dim(fillData.gradientAngle, 'deg'),
        }
      : {}),
    border_radius: { unit: '%', top: '50', right: '50', bottom: '50', left: '50', isLinked: true },
    box_shadow_box_shadow_type: shadowData.hasShadow ? 'yes' : '',
    box_shadow_box_shadow: shadowData.hasShadow
      ? {
          horizontal: shadowData.h,
          vertical: shadowData.v,
          blur: shadowData.blur,
          spread: shadowData.spread,
          color: shadowData.color,
          position: '',
        }
      : { horizontal: 0, vertical: 0, blur: 10, spread: 0, color: 'rgba(0,0,0,0.5)', position: '' },
    box_shadow_box_shadow_position: ' ',
    overflow: 'hidden',
    html_tag: 'div',
    _flex_size: 'initial',
  };
  return el;
}

// --- Legacy node converter ---

export function convertNodeLegacy(
  node: SceneNode,
  isInner: boolean,
  ctx: ConversionContext
): ElElement {
  if (!node.visible && ctx.options.skipHidden) {
    return makeSpacer(ctx.newId(), 0);
  }
  if (node.type !== 'TEXT' && (node.width === 0 || node.height === 0)) {
    ctx.warnings.push(`Skipped zero-size node: "${node.name}"`);
    return makeSpacer(ctx.newId(), 0);
  }

  // Skip purely decorative elements when option is enabled (only if not the sole child)
  if (ctx.options.skipDecorative && isInner && isDecorativeOnly(node)) {
    return makeSpacer(ctx.newId(), 0);
  }

  switch (node.type) {
    case 'FRAME':
    case 'COMPONENT':
    case 'INSTANCE':
    case 'GROUP':
      return convertFrameLegacy(node as FrameNode | ComponentNode | InstanceNode | GroupNode, isInner, ctx);
    case 'TEXT':
      // Text widgets can go directly inside columns — reuse container converter output
      return convertText(node as TextNode, isInner, ctx);
    case 'RECTANGLE':
      return convertRectangleLegacy(node as RectangleNode, isInner, ctx);
    case 'ELLIPSE':
      return convertEllipse(node as EllipseNode, isInner, ctx);
    case 'LINE':
      return convertLine(node as LineNode, isInner, ctx);
    case 'VECTOR':
    case 'BOOLEAN_OPERATION':
    case 'POLYGON':
    case 'STAR':
      return convertAsImage(node, isInner, ctx);
    case 'COMPONENT_SET':
      if ('children' in node && node.children.length > 0) {
        return convertNodeLegacy(node.children[0], isInner, ctx);
      }
      return makeSpacer(ctx.newId(), 20);
    default:
      ctx.warnings.push(`Unsupported node type "${node.name}" type "${node.type}" — skipped`);
      return makeSpacer(ctx.newId(), 0);
  }
}

function convertRectangleLegacy(
  node: RectangleNode,
  isInner: boolean,
  ctx: ConversionContext
): ElElement {
  const fillData = extractFill(node.fills);

  // Image fills → image widget
  if (fillData.type === 'image') {
    return convertRectangle(node, isInner, ctx);
  }

  // Solid/gradient → a spacer with background color via custom_css
  const color = fillData.type === 'solid' ? fillData.color : '';
  const h = Math.round(node.height);
  const el = makeSpacer(ctx.newId(), h);
  if (color) {
    (el.settings as Record<string, unknown>).custom_css = `#${el.id}{background:${color};width:100%;}`;
  }
  return el;
}

/**
 * Recursively collects all leaf content nodes from a subtree and converts
 * them to widgets. Used when nesting is too deep for Elementor's legacy format
 * (which supports at most 1 level of inner sections).
 */
function collectLeafWidgets(node: SceneNode, ctx: ConversionContext): ElElement[] {
  if (node.type === 'TEXT') {
    return [convertText(node as TextNode, true, ctx)];
  }
  if (node.type === 'LINE') {
    return [convertLine(node as LineNode, true, ctx)];
  }
  if (
    node.type === 'VECTOR' ||
    node.type === 'BOOLEAN_OPERATION' ||
    node.type === 'POLYGON' ||
    node.type === 'STAR'
  ) {
    return [convertAsImage(node, true, ctx)];
  }
  if (node.type === 'ELLIPSE') {
    return [convertEllipse(node as EllipseNode, true, ctx)];
  }
  if (node.type === 'RECTANGLE') {
    const fill = extractFill((node as RectangleNode).fills);
    if (fill.type === 'image') return [convertRectangle(node as RectangleNode, true, ctx)];
    return [convertRectangleLegacy(node as RectangleNode, true, ctx)];
  }
  if ('children' in node) {
    const children = [...(node as FrameNode).children].filter(
      c => !ctx.options.skipHidden || c.visible
    );
    return children.flatMap(child => collectLeafWidgets(child, ctx));
  }
  return [];
}

function convertFrameLegacy(
  node: FrameNode | ComponentNode | InstanceNode | GroupNode,
  isInner: boolean,
  ctx: ConversionContext
): ElElement {
  // Button detection: check before any other logic
  if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
    const btnInfo = detectButton(node as FrameNode | ComponentNode | InstanceNode);
    if (btnInfo.isButton) {
      return convertFrameToButton(node as FrameNode | ComponentNode | InstanceNode, btnInfo, isInner, ctx);
    }
  }

  const fills = 'fills' in node ? node.fills : ([] as Paint[]);
  const fillData = extractFill(fills);
  const shadowData = extractShadow('effects' in node ? node.effects : ([] as Effect[]));

  const hasAutoLayout =
    'layoutMode' in node &&
    (node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL');
  const isHorizontal = 'layoutMode' in node && node.layoutMode === 'HORIZONTAL';

  const pt = 'paddingTop' in node ? Math.round((node as FrameNode).paddingTop) : 0;
  const pr = 'paddingRight' in node ? Math.round((node as FrameNode).paddingRight) : 0;
  const pb = 'paddingBottom' in node ? Math.round((node as FrameNode).paddingBottom) : 0;
  const pl = 'paddingLeft' in node ? Math.round((node as FrameNode).paddingLeft) : 0;

  const bgColor = fillData.type === 'solid' ? fillData.color : '';
  const hasBg = !!bgColor;

  const sectionSettings = getLegacySectionSettings({
    background_background: hasBg ? 'classic' : '',
    background_color: bgColor,
    padding: box(pt, pr, pb, pl),
    box_shadow_box_shadow_type: shadowData.hasShadow ? 'yes' : '',
    box_shadow_box_shadow: shadowData.hasShadow
      ? { horizontal: shadowData.h, vertical: shadowData.v, blur: shadowData.blur, spread: shadowData.spread, color: shadowData.color }
      : { horizontal: 0, vertical: 0, blur: 10, spread: 0, color: 'rgba(0,0,0,0.5)' },
  });

  const children = 'children' in node
    ? [...node.children].filter(c => !ctx.options.skipHidden || c.visible)
    : [];

  // Elementor legacy format only supports 1 level of inner sections.
  // At depth >= 2 we are already inside an inner_section > column, so any
  // further nesting would be silently dropped. Instead, flatten the entire
  // subtree into leaf widgets placed in a single inner section column.
  if (ctx.depth >= 2) {
    ctx.warnings.push(`Deep nesting in "${node.name}" (depth ${ctx.depth}) — flattened to widgets`);
    const leafWidgets = children.flatMap(child =>
      collectLeafWidgets(child, { ...ctx, depth: ctx.depth + 1 })
    );
    const colSettings = getLegacyColumnSettings(100);
    const column = makeLegacyColumn(ctx.newId(), true, colSettings, leafWidgets);
    return makeLegacySection(ctx.newId(), isInner, sectionSettings, [column]);
  }

  // HORIZONTAL auto-layout with direct FRAME children → multi-column section
  if (isHorizontal && hasAutoLayout) {
    const frameChildren = children.filter(
      c => c.type === 'FRAME' || c.type === 'COMPONENT' || c.type === 'INSTANCE' || c.type === 'GROUP'
    );

    if (frameChildren.length > 1) {
      const totalWidth = frameChildren.reduce((sum, c) => sum + c.width, 0);
      let runningTotal = 0;

      const columns: ElElement[] = frameChildren.map((child, i) => {
        const pct = i === frameChildren.length - 1
          ? 100 - runningTotal
          : Math.round((child.width / totalWidth) * 100);
        runningTotal += pct;

        const childCtx = { ...ctx, depth: ctx.depth + 1 };
        const grandchildren = 'children' in child
          ? [...(child as FrameNode).children].filter(gc => !ctx.options.skipHidden || gc.visible)
          : [];

        const widgets = grandchildren.map(gc => convertNodeLegacy(gc, true, childCtx));
        const colSettings = getLegacyColumnSettings(pct);
        return makeLegacyColumn(ctx.newId(), isInner, colSettings, widgets);
      });

      return makeLegacySection(ctx.newId(), isInner, sectionSettings, columns);
    }
  }

  // NONE layout: use semantic grouping so button anti-patterns are detected.
  // Legacy Elementor has no absolute positioning, so we sort groups by y-position
  // and render them top-to-bottom in a single column.
  const layoutMode = 'layoutMode' in node ? node.layoutMode : 'NONE';
  if (layoutMode === 'NONE' && node.type !== 'GROUP' && ctx.depth < 2) {
    const groups = analyzeNoneLayoutChildren(children);
    const sorted = [...groups].sort((a, b) => a.primary.y - b.primary.y);
    const colCtxNone = { ...ctx, depth: ctx.depth + 1 };

    const widgets = sorted
      .filter(g => !(ctx.options.skipDecorative && g.type === 'decoration'))
      .map(g => {
        if (g.type === 'button') {
          return convertSemanticButton(g, colCtxNone);
        }
        return convertNodeLegacy(g.primary, true, colCtxNone);
      });

    const colSettings = getLegacyColumnSettings(100);
    const column = makeLegacyColumn(ctx.newId(), isInner, colSettings, widgets);
    return makeLegacySection(ctx.newId(), isInner, sectionSettings, [column]);
  }

  // Default: single-column section wrapping all children as widgets/inner-sections
  const colCtx = { ...ctx, depth: ctx.depth + 1 };
  const widgets = children.map(child => convertNodeLegacy(child, true, colCtx));
  const colSettings = getLegacyColumnSettings(100);
  const column = makeLegacyColumn(ctx.newId(), isInner, colSettings, widgets);
  return makeLegacySection(ctx.newId(), isInner, sectionSettings, [column]);
}

// --- Container converter (FRAME, COMPONENT, INSTANCE, GROUP) ---

export function convertFrame(
  node: FrameNode | ComponentNode | InstanceNode | GroupNode,
  isInner: boolean,
  ctx: ConversionContext
): ElElement {
  // Button detection: check before any other logic
  if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
    const btnInfo = detectButton(node as FrameNode | ComponentNode | InstanceNode);
    if (btnInfo.isButton) {
      return convertFrameToButton(node as FrameNode | ComponentNode | InstanceNode, btnInfo, isInner, ctx);
    }
  }

  const el = makeElement(ctx.newId(), 'container', isInner);

  if (ctx.depth > 5) {
    ctx.warnings.push(`Deep nesting (${ctx.depth} levels) in "${node.name}" — verify layout`);
  }

  const fills = 'fills' in node ? node.fills : ([] as Paint[]);
  const effects = 'effects' in node ? node.effects : ([] as Effect[]);
  const fillData = extractFill(fills);
  const shadowData = extractShadow(effects);
  const radius = 'cornerRadius' in node ? getRadius(node as FrameNode) : 0;

  const hasAutoLayout =
    'layoutMode' in node &&
    (node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL');
  const isHorizontal = 'layoutMode' in node && node.layoutMode === 'HORIZONTAL';
  const layoutMode = 'layoutMode' in node ? node.layoutMode : 'NONE';

  if (layoutMode === 'NONE' && node.type !== 'GROUP') {
    ctx.warnings.push(`"${node.name}" has no auto-layout — absolute positioning approximated`);
  }

  const pt = 'paddingTop' in node ? (node as FrameNode).paddingTop : 0;
  const pr = 'paddingRight' in node ? (node as FrameNode).paddingRight : 0;
  const pb = 'paddingBottom' in node ? (node as FrameNode).paddingBottom : 0;
  const pl = 'paddingLeft' in node ? (node as FrameNode).paddingLeft : 0;

  const itemSpacing = hasAutoLayout && 'itemSpacing' in node ? (node as FrameNode).itemSpacing : 0;
  const gap = itemSpacing > 0 ? Math.round(itemSpacing) : '';

  const fixedW =
    'layoutSizingHorizontal' in node
      ? (node as FrameNode).layoutSizingHorizontal === 'FIXED'
      : true;
  const fixedH =
    'layoutSizingVertical' in node
      ? (node as FrameNode).layoutSizingVertical === 'FIXED'
      : true;
  const fillW =
    'layoutSizingHorizontal' in node
      ? (node as FrameNode).layoutSizingHorizontal === 'FILL'
      : false;

  const radiusVal = radius > 0 ? String(radius) : '';
  const settings: Record<string, unknown> = {
    ...getContainerBaseSettings(),
    // layout overrides
    content_width: 'full',
    flex_direction: isHorizontal ? 'row' : 'column',
    flex_justify_content:
      hasAutoLayout && 'primaryAxisAlignItems' in node
        ? mapPrimaryAxis((node as FrameNode).primaryAxisAlignItems as string)
        : 'flex-start',
    flex_align_items:
      hasAutoLayout && 'counterAxisAlignItems' in node
        ? mapCounterAxis((node as FrameNode).counterAxisAlignItems as string)
        : 'flex-start',
    flex_wrap:
      'layoutWrap' in node && (node as FrameNode).layoutWrap === 'WRAP' ? 'wrap' : 'nowrap',
    flex_gap: { column: gap, row: gap, isLinked: true, unit: 'px' },
    width: fixedW ? dim(Math.round(node.width)) : fillW ? dim(100, '%') : { unit: '%', size: '', sizes: [] as never[] },
    min_height: fixedH ? dim(Math.round(node.height)) : { unit: 'px', size: '', sizes: [] as never[] },
    // background
    background_background:
      fillData.type === 'solid'
        ? 'classic'
        : fillData.type === 'gradient'
        ? 'gradient'
        : '',
    background_color: fillData.type === 'solid' ? fillData.color : '',
    background_image: { url: '', id: '', size: '' },
    // border
    border_radius: {
      unit: 'px',
      top: radiusVal,
      right: radiusVal,
      bottom: radiusVal,
      left: radiusVal,
      isLinked: true,
    },
    // shadow
    box_shadow_box_shadow_type: shadowData.hasShadow ? 'yes' : '',
    box_shadow_box_shadow: shadowData.hasShadow
      ? {
          horizontal: shadowData.h,
          vertical: shadowData.v,
          blur: shadowData.blur,
          spread: shadowData.spread,
          color: shadowData.color,
        }
      : { horizontal: 0, vertical: 0, blur: 10, spread: 0, color: 'rgba(0,0,0,0.5)' },
    // spacing
    padding: box(Math.round(pt), Math.round(pr), Math.round(pb), Math.round(pl)),
    // overflow
    overflow:
      'clipsContent' in node && (node as FrameNode).clipsContent ? 'hidden' : '',
  };

  if (fillData.type === 'gradient') {
    settings.background_color = fillData.gradientStart;
    settings.background_color_b = fillData.gradientEnd;
    settings.background_gradient_type = 'linear';
    settings.background_gradient_angle = dim(fillData.gradientAngle, 'deg');
  }

  if (fillData.type === 'image') {
    const placeholder = `PLACEHOLDER_${node.id}`;
    ctx.imageExports.push({ nodeId: node.id, placeholder });
    settings.background_background = 'classic';
    settings.background_image = { url: placeholder, id: '', size: '' };
    settings.background_size = 'cover';
    settings.background_position = 'center center';
  }

  el.settings = settings;

  if ('children' in node) {
    const children = [...node.children].filter(
      c => !ctx.options.skipHidden || c.visible
    );

    if (layoutMode === 'NONE') {
      const groups = analyzeNoneLayoutChildren(children);
      let customCss = '';

      el.elements = groups
        .filter(g => !(ctx.options.skipDecorative && g.type === 'decoration'))
        .map(g => {
          let childEl: ElElement;

          if (g.type === 'button') {
            childEl = convertSemanticButton(g, ctx);
          } else {
            childEl = convertNode(g.primary, true, { ...ctx, depth: ctx.depth + 1 });
          }

          const relX = Math.round(g.primary.x);
          const relY = Math.round(g.primary.y);
          const w = Math.round(g.primary.width);
          const h = Math.round(g.primary.height);
          customCss += `.elementor-element-${childEl.id}{position:absolute;top:${relY}px;left:${relX}px;width:${w}px;height:${h}px;}\n`;
          return childEl;
        });

      settings.position = 'relative';
      settings.custom_css = customCss;
    } else {
      el.elements = children.map(child =>
        convertNode(child, true, { ...ctx, depth: ctx.depth + 1 })
      );
    }
  }

  return el;
}

// --- Text converter ---

export function convertText(
  node: TextNode,
  isInner: boolean,
  ctx: ConversionContext
): ElElement {
  const fillData = extractFill(node.fills);
  const color = fillData.type === 'solid' ? fillData.color : '#000000';
  const fontSize = node.fontSize === figma.mixed ? 16 : (node.fontSize as number);
  const fontName =
    node.fontName === figma.mixed
      ? { family: 'Default', style: 'Regular' }
      : (node.fontName as FontName);
  const isMixedSize = node.fontSize === figma.mixed;
  const isMixedFont = node.fontName === figma.mixed;

  if (isMixedSize || isMixedFont) {
    ctx.warnings.push(
      `"${node.name}" has mixed text styles — rich HTML applied`
    );
  }

  const weight = mapFontWeight(fontName.style);
  const isItalic = fontName.style.toLowerCase().includes('italic');
  const lineHeight =
    node.lineHeight === figma.mixed
      ? dim(1.4, 'em')
      : mapLineHeight(node.lineHeight as LineHeight);
  const letterSpacing =
    node.letterSpacing === figma.mixed
      ? dim(0)
      : mapLetterSpacing(node.letterSpacing as LetterSpacing);
  const textAlign =
    node.textAlignHorizontal === 'JUSTIFIED'
      ? 'justify'
      : (node.textAlignHorizontal.toLowerCase() as 'left' | 'center' | 'right');

  const isHeading =
    fontSize >= ctx.options.headingThreshold || parseInt(weight) >= 700;

  if (isHeading && !isMixedSize && !isMixedFont) {
    const el = makeElement(ctx.newId(), 'widget', isInner, 'heading');
    el.settings = {
      title: node.characters,
      header_size: mapFontSizeToHeader(fontSize),
      align: textAlign,
      title_color: color,
      typography_typography: 'custom',
      typography_font_family: fontName.family,
      typography_font_size: dim(Math.round(fontSize)),
      typography_font_weight: weight,
      typography_font_style: isItalic ? 'italic' : 'normal',
      typography_line_height: lineHeight,
      typography_letter_spacing: letterSpacing,
    };
    return el;
  }

  let html: string;
  if (isMixedSize || isMixedFont) {
    const segments = node.getStyledTextSegments([
      'fontSize',
      'fontName',
      'fills',
      'fontWeight',
      'letterSpacing',
      'lineHeight',
      'textDecoration',
      'textCase',
    ]);
    html = segments
      .map(seg => {
        const sf = extractFill(seg.fills as ReadonlyArray<Paint>);
        const sc = sf.type === 'solid' ? sf.color : 'inherit';
        const sn = seg.fontName as FontName;
        const sw = mapFontWeight(sn.style);
        const si = sn.style.toLowerCase().includes('italic');
        const fsize = Math.round(seg.fontSize as number);
        const style = [
          `font-size:${fsize}px`,
          `color:${sc}`,
          `font-weight:${sw}`,
          `font-family:${sn.family}`,
          si ? 'font-style:italic' : '',
          seg.textDecoration === 'UNDERLINE' ? 'text-decoration:underline' : '',
          seg.textDecoration === 'STRIKETHROUGH' ? 'text-decoration:line-through' : '',
        ]
          .filter(Boolean)
          .join(';');
        return `<span style="${style}">${escapeHtml(seg.characters)}</span>`;
      })
      .join('');
  } else {
    html = node.characters
      .split('\n')
      .map(line => `<p>${escapeHtml(line) || '&nbsp;'}</p>`)
      .join('');
  }

  const el = makeElement(ctx.newId(), 'widget', isInner, 'text-editor');
  el.settings = {
    editor: html,
    text_color: color,
    typography_typography: 'custom',
    typography_font_family: fontName.family,
    typography_font_size: dim(Math.round(fontSize)),
    typography_font_weight: weight,
    typography_font_style: isItalic ? 'italic' : 'normal',
    typography_line_height: lineHeight,
    typography_letter_spacing: letterSpacing,
    drop_cap: '',
  };
  return el;
}

// --- Rectangle / Ellipse converter ---

export function convertRectangle(
  node: RectangleNode | EllipseNode,
  isInner: boolean,
  ctx: ConversionContext
): ElElement {
  const fillData = extractFill(node.fills);
  const shadowData = extractShadow(node.effects);
  const radius =
    'cornerRadius' in node
      ? typeof node.cornerRadius === 'number'
        ? Math.round(node.cornerRadius)
        : 0
      : 0;

  if (fillData.type === 'image') {
    const placeholder = `PLACEHOLDER_${node.id}`;
    ctx.imageExports.push({ nodeId: node.id, placeholder });
    const el = makeElement(ctx.newId(), 'widget', isInner, 'image');
    el.settings = {
      image: { url: placeholder, id: '', size: '' },
      image_size: 'full',
      align: 'left',
      caption_source: 'none',
      width: dim(Math.round(node.width)),
      ...(radius > 0
        ? {
            image_border_radius: {
              unit: 'px',
              top: String(radius),
              right: String(radius),
              bottom: String(radius),
              left: String(radius),
              isLinked: true,
            },
          }
        : {}),
      ...(shadowData.hasShadow
        ? {
            image_box_shadow_box_shadow_type: 'yes',
            image_box_shadow_box_shadow: {
              horizontal: shadowData.h,
              vertical: shadowData.v,
              blur: shadowData.blur,
              spread: shadowData.spread,
              color: shadowData.color,
              position: '',
            },
          }
        : {}),
    };
    return el;
  }

  const rectRadiusVal = radius > 0 ? String(radius) : '';
  const el = makeElement(ctx.newId(), 'container', isInner);
  el.settings = {
    ...getContainerBaseSettings(),
    content_width: 'full',
    flex_direction: 'column',
    flex_justify_content: 'flex-start',
    flex_align_items: 'flex-start',
    flex_wrap: 'nowrap',
    width: dim(Math.round(node.width)),
    min_height: dim(Math.round(node.height)),
    background_background:
      fillData.type === 'solid'
        ? 'classic'
        : fillData.type === 'gradient'
        ? 'gradient'
        : '',
    background_color: fillData.type === 'solid' ? fillData.color : '',
    background_image: { url: '', id: '', size: '' },
    ...(fillData.type === 'gradient'
      ? {
          background_color_b: fillData.gradientEnd,
          background_gradient_type: 'linear',
          background_gradient_angle: dim(fillData.gradientAngle, 'deg'),
        }
      : {}),
    border_radius: {
      unit: 'px',
      top: rectRadiusVal,
      right: rectRadiusVal,
      bottom: rectRadiusVal,
      left: rectRadiusVal,
      isLinked: true,
    },
    box_shadow_box_shadow_type: shadowData.hasShadow ? 'yes' : '',
    box_shadow_box_shadow: shadowData.hasShadow
      ? {
          horizontal: shadowData.h,
          vertical: shadowData.v,
          blur: shadowData.blur,
          spread: shadowData.spread,
          color: shadowData.color,
        }
      : { horizontal: 0, vertical: 0, blur: 10, spread: 0, color: 'rgba(0,0,0,0.5)' },
    html_tag: 'div',
    _flex_size: 'initial',
  };
  return el;
}

// --- Line converter ---

export function convertLine(
  node: LineNode,
  isInner: boolean,
  ctx: ConversionContext
): ElElement {
  const el = makeElement(ctx.newId(), 'widget', isInner, 'divider');
  const strokeFill = extractFill(node.strokes);
  el.settings = {
    style: 'solid',
    color: strokeFill.type === 'solid' ? strokeFill.color : '#000000',
    weight: dim(Math.round((node.strokeWeight as number) ?? 1)),
    width: dim(100, '%'),
    align: 'left',
    gap: dim(10),
  };
  return el;
}

// --- Fallback: export as image ---

export function convertAsImage(
  node: SceneNode,
  isInner: boolean,
  ctx: ConversionContext
): ElElement {
  const placeholder = `PLACEHOLDER_${node.id}`;
  ctx.imageExports.push({ nodeId: node.id, placeholder });
  const el = makeElement(ctx.newId(), 'widget', isInner, 'image');
  el.settings = {
    image: { url: placeholder, id: '', size: '' },
    image_size: 'full',
    align: 'left',
    caption_source: 'none',
    width: dim(Math.round(node.width)),
  };
  return el;
}

// --- Spacer ---

export function makeSpacer(id: string, height: number): ElElement {
  const el = makeElement(id, 'widget', true, 'spacer');
  el.settings = { space: dim(height) };
  return el;
}

// --- Main dispatch ---

export function convertNode(
  node: SceneNode,
  isInner: boolean,
  ctx: ConversionContext
): ElElement {
  if (!node.visible && ctx.options.skipHidden) {
    return makeSpacer(ctx.newId(), 0);
  }
  if (node.type !== 'TEXT' && (node.width === 0 || node.height === 0)) {
    ctx.warnings.push(`Skipped zero-size node: "${node.name}"`);
    return makeSpacer(ctx.newId(), 0);
  }

  // Skip purely decorative elements when option is enabled
  if (ctx.options.skipDecorative && isInner && isDecorativeOnly(node)) {
    return makeSpacer(ctx.newId(), 0);
  }

  switch (node.type) {
    case 'FRAME':
      return convertFrame(node as FrameNode, isInner, ctx);
    case 'COMPONENT':
      return convertFrame(node as ComponentNode, isInner, ctx);
    case 'INSTANCE':
      return convertFrame(node as InstanceNode, isInner, ctx);
    case 'GROUP':
      return convertFrame(node as GroupNode, isInner, ctx);
    case 'TEXT':
      return convertText(node as TextNode, isInner, ctx);
    case 'RECTANGLE':
      return convertRectangle(node as RectangleNode, isInner, ctx);
    case 'ELLIPSE':
      return convertEllipse(node as EllipseNode, isInner, ctx);
    case 'LINE':
      return convertLine(node as LineNode, isInner, ctx);
    case 'VECTOR':
    case 'BOOLEAN_OPERATION':
    case 'POLYGON':
    case 'STAR':
      return convertAsImage(node, isInner, ctx);
    case 'COMPONENT_SET':
      if ('children' in node && node.children.length > 0) {
        return convertNode(node.children[0], isInner, ctx);
      }
      return makeSpacer(ctx.newId(), 20);
    default:
      ctx.warnings.push(
        `Unsupported node type "${node.type}" (${node.name}) — skipped`
      );
      return makeSpacer(ctx.newId(), 0);
  }
}
