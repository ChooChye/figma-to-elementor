/// <reference types="@figma/plugin-typings" />
import { convertSelection } from './src/converter';
import { ConversionOptions } from './src/figma-to-elementor';

figma.showUI(__html__, {
  width: 440,
  height: 580,
  title: 'Figma to Elementor',
});

sendSelectionInfo();

figma.on('selectionchange', sendSelectionInfo);

function sendSelectionInfo(): void {
  const sel = figma.currentPage.selection;
  figma.ui.postMessage({
    type: 'selection-changed',
    count: sel.length,
    names: sel.map(n => n.name),
  });
}

figma.ui.onmessage = async (msg: { type: string; options?: ConversionOptions }) => {
  switch (msg.type) {
    case 'convert': {
      const selection = figma.currentPage.selection;
      if (selection.length === 0) {
        figma.ui.postMessage({
          type: 'error',
          message: 'Select at least one frame first.',
        });
        return;
      }

      figma.ui.postMessage({
        type: 'progress',
        step: 'Analyzing frames...',
        percent: 10,
      });

      const options: ConversionOptions = msg.options ?? {
        exportImages: false,
        siteUrl: 'https://example.com',
        skipHidden: true,
        headingThreshold: 20,
        skipDecorative: false,
      };

      let result;
      try {
        result = await convertSelection(selection, options);
      } catch (err) {
        figma.ui.postMessage({ type: 'error', message: String(err) });
        return;
      }

      // Warn when user selects a large artboard frame — they probably want
      // to select the content sections inside it instead.
      if (
        selection.length === 1 &&
        (selection[0].width > 800 || selection[0].height > 600)
      ) {
        result.warnings.unshift(
          'Tip: If the result looks empty, try selecting the content frames INSIDE the artboard instead of the artboard itself.'
        );
      }

      figma.ui.postMessage({
        type: 'progress',
        step: 'Building Elementor JSON...',
        percent: 50,
      });

      if (options.exportImages && result.imageExports.length > 0) {
        figma.ui.postMessage({
          type: 'progress',
          step: `Exporting ${result.imageExports.length} images...`,
          percent: 60,
        });

        for (let i = 0; i < result.imageExports.length; i++) {
          const { nodeId, placeholder } = result.imageExports[i];
          const node = figma.getNodeById(nodeId);
          if (node && 'exportAsync' in node) {
            try {
              const bytes = await (node as ExportMixin).exportAsync({
                format: 'PNG',
                constraint: { type: 'SCALE', value: 2 },
              });
              figma.ui.postMessage({
                type: 'image-bytes',
                placeholder,
                bytes: Array.from(bytes),
              });
            } catch {
              // Skip failed exports — placeholder stays in JSON
            }
          }
          figma.ui.postMessage({
            type: 'progress',
            step: `Exporting images (${i + 1}/${result.imageExports.length})...`,
            percent: 60 + Math.round((i / result.imageExports.length) * 30),
          });
        }
      }

      figma.ui.postMessage({
        type: 'json-ready',
        payload: result.payload,
        warnings: result.warnings,
        pendingImages: options.exportImages ? result.imageExports.length : 0,
      });
      break;
    }

    case 'close':
      figma.closePlugin();
      break;
  }
};
