import { FieldConfigProperty, PanelPlugin, StandardEditorProps } from '@grafana/data';
import { TextArea } from '@grafana/ui';
import React from 'react';
import { SimpleOptions } from './types';
import { SimplePanel } from './components/SimplePanel';
import { DEFAULT_BINDINGS_JSON, DEFAULT_SVG_MARKUP } from './constants';
import { BindingRulesEditor } from './components/BindingRulesEditor';

type MultilineEditorSettings = {
  rows?: number;
  placeholder?: string;
};

function MultilineTextEditor({ value, onChange, item }: StandardEditorProps<string, MultilineEditorSettings>) {
  return React.createElement(TextArea, {
    rows: item.settings?.rows ?? 10,
    placeholder: item.settings?.placeholder,
    value: value ?? '',
    onChange: (event) => onChange(event.currentTarget.value),
  });
}

export const plugin = new PanelPlugin<SimpleOptions>(SimplePanel)
  .useFieldConfig({
    standardOptions: {
      [FieldConfigProperty.Color]: {},
      [FieldConfigProperty.Thresholds]: {},
    },
  })
  .setPanelOptions((builder) => {
    return builder
    .addTextInput({
      path: 'title',
      name: 'Panel title',
      description: 'Title shown below the SVG preview.',
      defaultValue: 'SVG Panel',
    })
    .addCustomEditor({
      id: 'svgMarkup',
      path: 'svgMarkup',
      name: 'SVG markup',
      description: 'Paste raw SVG markup here. The panel renders it directly.',
      defaultValue: DEFAULT_SVG_MARKUP,
      editor: MultilineTextEditor,
      settings: {
        rows: 14,
        placeholder: '<svg>...</svg>',
      },
    })
    .addCustomEditor({
      id: 'bindingsJson',
      path: 'bindingsJson',
      name: 'Bindings visuels',
      description: 'Selectionne un binding ici, puis clique un element dans la vue normale du panel.',
      defaultValue: DEFAULT_BINDINGS_JSON,
      editor: BindingRulesEditor,
    })
    .addBooleanSwitch({
      path: 'showSeriesCount',
      name: 'Show series counter',
      defaultValue: true,
    })
    .addRadio({
      path: 'seriesCountSize',
      defaultValue: 'sm',
      name: 'Series counter size',
      settings: {
        options: [
          {
            value: 'sm',
            label: 'Small',
          },
          {
            value: 'md',
            label: 'Medium',
          },
          {
            value: 'lg',
            label: 'Large',
          },
        ],
      },
      showIf: (config: SimpleOptions) => config.showSeriesCount,
    });
  });
