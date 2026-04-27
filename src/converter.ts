/// <reference types="@figma/plugin-typings" />
import { createIdFactory } from './id-generator';
import { convertNode, ConversionOptions, ConversionContext } from './figma-to-elementor';
import { ElClipboardPayload } from './elementor-types';

export interface ConversionResult {
  payload: ElClipboardPayload;
  imageExports: Array<{ nodeId: string; placeholder: string }>;
  warnings: string[];
}

export async function convertSelection(
  nodes: readonly SceneNode[],
  options: ConversionOptions
): Promise<ConversionResult> {
  const newId = createIdFactory();
  const warnings: string[] = [];
  const imageExports: Array<{ nodeId: string; placeholder: string }> = [];

  const ctx: ConversionContext = {
    newId,
    options,
    warnings,
    imageExports,
    depth: 0,
  };

  const elements = nodes
    .filter(node => !options.skipHidden || node.visible)
    .map(node => convertNode(node, false, ctx));

  const siteUrl = options.siteUrl.replace(/\/?$/, '/wp-json/');

  return {
    payload: {
      type: 'elementor',
      siteurl: siteUrl,
      elements,
    },
    imageExports,
    warnings,
  };
}
