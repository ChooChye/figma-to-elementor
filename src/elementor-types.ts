export type ElType = 'container' | 'widget' | 'section' | 'column';
export type WidgetType = 'heading' | 'text-editor' | 'image' | 'divider' | 'spacer' | 'button';

export interface ElDim {
  unit: string;
  size: number | '';
  sizes: never[];
}

export interface ElBox {
  unit: string;
  top: string;
  right: string;
  bottom: string;
  left: string;
  isLinked: boolean;
}

export function dim(size: number | '', unit = 'px'): ElDim {
  return { unit, size, sizes: [] as never[] };
}

export function box(
  top: number,
  right: number,
  bottom: number,
  left: number,
  unit = 'px'
): ElBox {
  const t = String(top);
  const r = String(right);
  const b = String(bottom);
  const l = String(left);
  return {
    unit,
    top: t,
    right: r,
    bottom: b,
    left: l,
    isLinked: top === right && right === bottom && bottom === left,
  };
}

export function emptyBox(): ElBox {
  return { unit: 'px', top: '', right: '', bottom: '', left: '', isLinked: true };
}

export interface ElElement {
  id: string;
  elType: ElType;
  isInner: boolean;
  isLocked: boolean;
  widgetType?: WidgetType;
  settings: Record<string, unknown>;
  defaultEditSettings: { defaultEditRoute: string };
  interactions: Record<string, never>;
  elements: ElElement[];
  editSettings: { defaultEditRoute: string };
  htmlCache: null;
}

export function makeElement(
  id: string,
  elType: ElType,
  isInner: boolean,
  widgetType?: WidgetType
): ElElement {
  const el: ElElement = {
    id,
    elType,
    isInner,
    isLocked: false,
    settings: {},
    defaultEditSettings: { defaultEditRoute: 'content' },
    interactions: {} as Record<string, never>,
    elements: [],
    editSettings: { defaultEditRoute: 'content' },
    htmlCache: null,
  };
  if (widgetType) {
    el.widgetType = widgetType;
  }
  return el;
}

export interface ElClipboardPayload {
  type: 'elementor';
  siteurl: string;
  elements: ElElement[];
}
