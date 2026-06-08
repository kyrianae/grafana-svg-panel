import { FieldType, StandardEditorProps } from '@grafana/data';
import { Button, Field, Input, Select } from '@grafana/ui';
import React, { useEffect, useMemo, useState } from 'react';
import { SvgBinding, SvgBindingAction } from '../types';

type SelectOption = {
  label: string;
  value: string;
};

const BINDING_ACTION_OPTIONS: Array<SelectOption> = [
  { label: 'Fill color', value: 'fill' },
  { label: 'Stroke color', value: 'stroke' },
  { label: 'Text content', value: 'text' },
  { label: 'Custom attribute', value: 'attribute' },
];

function isSvgBinding(value: unknown): value is SvgBinding {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<SvgBinding>;
  return (
    typeof candidate.elementId === 'string' &&
    typeof candidate.seriesName === 'string' &&
    typeof candidate.action === 'string'
  );
}

function parseBindingsJson(rawBindings: string): SvgBinding[] {
  const trimmed = rawBindings.trim();

  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isSvgBinding);
  } catch {
    return [];
  }
}

function formatBindingsJson(bindings: SvgBinding[]): string {
  return JSON.stringify(bindings, null, 2);
}

function withSelectedBinding(bindings: SvgBinding[], selectedIndex: number): SvgBinding[] {
  if (bindings.length === 0) {
    return [];
  }

  return bindings.map((binding, index) => ({
    ...binding,
    selected: index === selectedIndex,
  }));
}

function getSeriesOptions(context: StandardEditorProps<string>['context']): Array<SelectOption> {
  const data = context.data ?? [];
  const seen = new Set<string>();
  const options: Array<SelectOption> = [];

  data.forEach((frame) => {
    frame.fields.forEach((field) => {
      if (field.type === FieldType.time) {
        return;
      }

      const label = field.name?.trim();

      if (!label || seen.has(label)) {
        return;
      }

      seen.add(label);
      options.push({ label, value: label });
    });
  });

  if (options.length === 0) {
    options.push({ label: 'A', value: 'A' });
  }

  return options;
}

export function BindingRulesEditor({ value, onChange, context }: StandardEditorProps<string>) {
  const [selectedBindingIndex, setSelectedBindingIndex] = useState(0);

  const bindings = useMemo(() => parseBindingsJson(value ?? ''), [value]);
  const seriesOptions = useMemo(() => getSeriesOptions(context), [context]);
  const selectedBinding = bindings[selectedBindingIndex];

  useEffect(() => {
    const selectedIndexFromJson = bindings.findIndex((binding) => binding.selected);

    if (selectedIndexFromJson >= 0 && selectedIndexFromJson !== selectedBindingIndex) {
      setSelectedBindingIndex(selectedIndexFromJson);
      return;
    }

    if (bindings.length === 0) {
      setSelectedBindingIndex(0);
      return;
    }

    if (selectedBindingIndex > bindings.length - 1) {
      setSelectedBindingIndex(bindings.length - 1);
    }
  }, [bindings, selectedBindingIndex]);

  const setBindings = (nextBindings: SvgBinding[], preferredSelectedIndex = selectedBindingIndex) => {
    if (nextBindings.length === 0) {
      onChange(formatBindingsJson([]));
      setSelectedBindingIndex(0);
      return;
    }

    const safeSelectedIndex = Math.min(Math.max(preferredSelectedIndex, 0), nextBindings.length - 1);
    const normalized = withSelectedBinding(nextBindings, safeSelectedIndex);

    onChange(formatBindingsJson(normalized));
    setSelectedBindingIndex(safeSelectedIndex);
  };

  const addBinding = () => {
    const defaultSeries = seriesOptions[0]?.value ?? 'A';
    const nextBindings: SvgBinding[] = [
      ...bindings,
      {
        elementId: '',
        seriesName: defaultSeries,
        action: 'fill',
      },
    ];

    setBindings(nextBindings, nextBindings.length - 1);
  };

  const removeSelectedBinding = () => {
    if (!selectedBinding || bindings.length === 0) {
      return;
    }

    const nextBindings = bindings.filter((_, index) => index !== selectedBindingIndex);
    setBindings(nextBindings, Math.max(0, selectedBindingIndex - 1));
  };

  const moveSelectedBinding = (direction: 'up' | 'down') => {
    if (!selectedBinding) {
      return;
    }

    const targetIndex = direction === 'up' ? selectedBindingIndex - 1 : selectedBindingIndex + 1;

    if (targetIndex < 0 || targetIndex >= bindings.length) {
      return;
    }

    const nextBindings = [...bindings];
    const current = nextBindings[selectedBindingIndex];
    nextBindings[selectedBindingIndex] = nextBindings[targetIndex];
    nextBindings[targetIndex] = current;

    setBindings(nextBindings, targetIndex);
  };

  const updateSelectedBinding = (partial: Partial<SvgBinding>) => {
    if (!selectedBinding) {
      return;
    }

    const nextBindings = [...bindings];
    nextBindings[selectedBindingIndex] = {
      ...selectedBinding,
      ...partial,
    };

    setBindings(nextBindings);
  };

  const bindingListOptions = bindings.map((binding, index) => ({
    label: binding.elementId
      ? `${index + 1}. ${binding.elementId} -> ${binding.seriesName} (${binding.action})`
      : `${index + 1}. (no element selected) -> ${binding.seriesName} (${binding.action})`,
    value: index.toString(),
  }));

  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <Button size="sm" onClick={addBinding}>
          Ajouter binding
        </Button>
        <Button size="sm" variant="destructive" onClick={removeSelectedBinding} disabled={!selectedBinding}>
          Supprimer binding
        </Button>
        <Button size="sm" variant="secondary" onClick={() => moveSelectedBinding('up')} disabled={!selectedBinding || selectedBindingIndex === 0}>
          Monter
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => moveSelectedBinding('down')}
          disabled={!selectedBinding || selectedBindingIndex === bindings.length - 1}
        >
          Descendre
        </Button>
        <span style={{ fontSize: '12px', opacity: 0.8 }}>
          Selectionne un binding ici, puis clique un element dans la vue normale du panel.
        </span>
      </div>

      {bindings.length > 0 ? (
        <>
          <Field label="Bindings existants">
            <Select
              options={bindingListOptions}
              value={bindingListOptions.find((option) => option.value === selectedBindingIndex.toString())}
              onChange={(selection) => {
                const nextIndex = Number(selection?.value ?? 0);
                setBindings(bindings, nextIndex);
              }}
            />
          </Field>

          {selectedBinding && (
            <div style={{ display: 'grid', gap: '10px' }}>
              <Field label="Element SVG selectionne">
                <Input
                  value={selectedBinding.elementId}
                  onChange={(event) => updateSelectedBinding({ elementId: event.currentTarget.value })}
                  placeholder="Clique un element dans le SVG"
                />
              </Field>

              <Field label="Serie">
                <Select
                  options={seriesOptions}
                  value={seriesOptions.find((option) => option.value === selectedBinding.seriesName)}
                  onChange={(selection) => updateSelectedBinding({ seriesName: selection?.value ?? '' })}
                />
              </Field>

              <Field label="Type de binding">
                <Select
                  options={BINDING_ACTION_OPTIONS}
                  value={BINDING_ACTION_OPTIONS.find((option) => option.value === selectedBinding.action)}
                  onChange={(selection) => updateSelectedBinding({ action: (selection?.value ?? 'fill') as SvgBindingAction })}
                />
              </Field>

              {selectedBinding.action === 'attribute' && (
                <Field label="Nom de l'attribut">
                  <Input
                    value={selectedBinding.attributeName ?? ''}
                    onChange={(event) => updateSelectedBinding({ attributeName: event.currentTarget.value })}
                    placeholder="ex: opacity"
                  />
                </Field>
              )}
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: '12px', opacity: 0.8 }}>Aucun binding pour le moment.</div>
      )}
    </div>
  );
}
