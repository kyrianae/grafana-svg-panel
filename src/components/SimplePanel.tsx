import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DataFrame, Field, FieldType, PanelProps, getDisplayProcessor } from '@grafana/data';
import { css, cx } from '@emotion/css';
import { useStyles2, useTheme2 } from '@grafana/ui';
import { DEFAULT_SVG_MARKUP } from '../constants';
import { SimpleOptions, SvgBinding } from '../types';

interface Props extends PanelProps<SimpleOptions> {}

type ParseResult = {
  bindings: SvgBinding[];
  error?: string;
};

type SeriesBindingInfo = {
  value: unknown;
  color?: string;
};

const getStyles = () => ({
  wrapper: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-sizing: border-box;
    padding: 12px;
    font-family: Open Sans, Arial, sans-serif;
  `,
  svgFrame: css`
    position: relative;
    flex: 1;
    min-height: 240px;
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid rgba(148, 163, 184, 0.3);
    background: linear-gradient(180deg, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.85));
    touch-action: none;
  `,
  svg: css`
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    cursor: pointer;
  `,
  summary: css`
    display: grid;
    gap: 8px;
    padding: 12px 14px;
    border-radius: 14px;
    border: 1px solid rgba(148, 163, 184, 0.2);
    background: rgba(15, 23, 42, 0.55);
    color: #e2e8f0;
  `,
  title: css`
    font-size: 1rem;
    font-weight: 700;
    color: #f8fafc;
  `,
  metaRow: css`
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    font-size: 0.85rem;
    color: #cbd5e1;
  `,
  badge: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    background: rgba(59, 130, 246, 0.15);
    color: #bfdbfe;
    font-size: 0.8rem;
  `,
  bindingsList: css`
    display: grid;
    gap: 6px;
    margin: 0;
    padding-left: 18px;
    color: #cbd5e1;
    font-size: 0.85rem;
  `,
  notice: css`
    color: #fbbf24;
    font-size: 0.85rem;
  `,
});

function parseBindingsJson(rawBindings: string): ParseResult {
  const trimmed = rawBindings.trim();

  if (!trimmed) {
    return { bindings: [] };
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;

    if (!Array.isArray(parsed)) {
      return { bindings: [], error: 'Binding rules must be a JSON array.' };
    }

    const bindings = parsed.filter(isSvgBinding);
    return { bindings };
  } catch (error) {
    return {
      bindings: [],
      error: error instanceof Error ? error.message : 'Unable to parse the binding rules JSON.',
    };
  }
}

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

type ValueVector = {
  length: number;
  get(index: number): unknown;
};

type FieldValues = ValueVector | unknown[];

function getValueAt(values: FieldValues, index: number): unknown {
  if (Array.isArray(values)) {
    return values[index];
  }

  return values.get(index);
}

function getLatestValue(values: FieldValues): unknown {
  for (let index = values.length - 1; index >= 0; index--) {
    const value = getValueAt(values, index);

    if (value !== null && value !== undefined && value !== '') {
      return value;
    }
  }

  return undefined;
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) {
    return 'N/A';
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toString();
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function resolveColorForValue(value: unknown, theme: ReturnType<typeof useTheme2>) {
  const numericValue = typeof value === 'number' ? value : Number(value);

  if (!Number.isNaN(numericValue)) {
    if (numericValue > 0) {
      return theme.visualization.getColorByName('green');
    }

    if (numericValue < 0) {
      return theme.visualization.getColorByName('red');
    }

    return theme.visualization.getColorByName('yellow');
  }

  const normalized = formatValue(value).toLowerCase();

  if (normalized.includes('error') || normalized.includes('fail') || normalized.includes('down')) {
    return theme.visualization.getColorByName('red');
  }

  if (normalized.includes('warn')) {
    return theme.visualization.getColorByName('orange');
  }

  return theme.visualization.getColorByName('blue');
}

function getSeriesLabel(series: { name?: string; fields: Array<{ name: string; type: string }> }, index: number) {
  const fallbackField = series.fields.find((field) => field.type !== 'time');
  return series.name ?? fallbackField?.name ?? `Series ${index + 1}`;
}

function setSeriesBindingInfo(
  seriesValues: Map<string, SeriesBindingInfo>,
  key: string | undefined,
  value: unknown,
  color?: string
) {
  const normalized = key?.trim().toLowerCase();

  if (!normalized) {
    return;
  }

  seriesValues.set(normalized, { value, color });
}

function buildSeriesValueMap(dataSeries: DataFrame[], theme: ReturnType<typeof useTheme2>) {
  const seriesValues = new Map<string, SeriesBindingInfo>();

  dataSeries.forEach((series, index) => {
    const label = getSeriesLabel(series, index);
    const valueField = series.fields.find((field) => field.type !== FieldType.time);

    if (!valueField) {
      return;
    }

    const value = getLatestValue(valueField.values as FieldValues);
    const displayProcessor = valueField.display ?? getDisplayProcessor({ field: valueField as Field, theme });
    const displayValue = displayProcessor(value);

    setSeriesBindingInfo(seriesValues, valueField.name, value, displayValue.color);
    setSeriesBindingInfo(seriesValues, label, value, displayValue.color);
  });

  return seriesValues;
}

function findSvgTarget(svgElement: SVGElement, elementId: string): Element | null {
  const byDataSvgElement = Array.from(svgElement.querySelectorAll('[data-svg-element]')).find(
    (element) => element.getAttribute('data-svg-element') === elementId
  );

  if (byDataSvgElement) {
    return byDataSvgElement;
  }

  const byId = Array.from(svgElement.querySelectorAll('[id]')).find(
    (element) => element.getAttribute('id') === elementId
  );

  if (byId) {
    return byId;
  }

  return (
    Array.from(svgElement.querySelectorAll('[data-cell-id]')).find(
      (element) => element.getAttribute('data-cell-id') === elementId
    ) ?? null
  );
}

function findSelectableSvgElement(target: Element, svgRoot: SVGElement): SVGElement | null {
  let current: Element | null = target;

  while (current && current !== svgRoot) {
    if (
      current instanceof SVGElement &&
      (current.hasAttribute('data-svg-element') || current.hasAttribute('id') || current.hasAttribute('data-cell-id'))
    ) {
      return current;
    }

    current = current.parentElement;
  }

  if (svgRoot.hasAttribute('data-svg-element') || svgRoot.hasAttribute('id') || svgRoot.hasAttribute('data-cell-id')) {
    return svgRoot;
  }

  return null;
}

function formatBindingsJson(bindings: SvgBinding[]): string {
  return JSON.stringify(bindings, null, 2);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getMaxOffset(frameSize: number, zoom: number): number {
  return Math.max(0, ((zoom - 1) * frameSize) / 2);
}

function applyPresentationColor(target: Element, action: 'fill' | 'stroke', color: string) {
  target.setAttribute(action, color);

  if (target instanceof SVGElement) {
    target.style.setProperty(action, color, 'important');
  }
}

function getColorTargets(target: Element, action: 'fill' | 'stroke'): Element[] {
  const selectors =
    action === 'fill'
      ? [
          'rect:not([fill="none"])',
          'circle:not([fill="none"])',
          'ellipse:not([fill="none"])',
          'path:not([fill="none"])',
          'polygon:not([fill="none"])',
          'polyline:not([fill="none"])',
          'text',
        ]
      : [
          'rect:not([stroke="none"])',
          'circle:not([stroke="none"])',
          'ellipse:not([stroke="none"])',
          'path:not([stroke="none"])',
          'polygon:not([stroke="none"])',
          'polyline:not([stroke="none"])',
          'line:not([stroke="none"])',
          'text',
        ];

  const descendants = selectors.flatMap((selector) => Array.from(target.querySelectorAll(selector)));

  if (descendants.length > 0) {
    return descendants;
  }

  return [target];
}

function applyBindingActions(
  svgElement: SVGElement,
  bindings: SvgBinding[],
  seriesValues: Map<string, SeriesBindingInfo>,
  theme: ReturnType<typeof useTheme2>,
  selectedElementId: string | null
) {
  bindings.forEach((binding) => {
    const target = findSvgTarget(svgElement, binding.elementId);

    if (!target) {
      return;
    }

    const seriesInfo = seriesValues.get(binding.seriesName.trim().toLowerCase());
    const resolvedValue = seriesInfo?.value === undefined ? 'N/A' : seriesInfo.value;

    if (binding.action === 'text') {
      target.textContent = formatValue(resolvedValue);
      return;
    }

    if (binding.action === 'attribute') {
      if (binding.attributeName) {
        target.setAttribute(binding.attributeName, formatValue(resolvedValue));
      }
      return;
    }

    if (binding.action !== 'fill' && binding.action !== 'stroke') {
      return;
    }

    const paintAction: 'fill' | 'stroke' = binding.action;
    const color = seriesInfo?.color ?? resolveColorForValue(resolvedValue, theme);
    const colorTargets = getColorTargets(target, paintAction);

    colorTargets.forEach((colorTarget) => {
      applyPresentationColor(colorTarget, paintAction, color);
    });
  });

  if (selectedElementId) {
    const selectedTarget = findSvgTarget(svgElement, selectedElementId);

    if (selectedTarget) {
      selectedTarget.setAttribute('stroke', theme.visualization.getColorByName('orange'));
      selectedTarget.setAttribute('stroke-width', '3');
    }
  }
}

function getSeriesCountSizeClass(seriesCountSize: SimpleOptions['seriesCountSize']) {
  switch (seriesCountSize) {
    case 'md':
      return css`
        font-size: 1rem;
      `;
    case 'lg':
      return css`
        font-size: 1.2rem;
      `;
    case 'sm':
    default:
      return css`
        font-size: 0.85rem;
      `;
  }
}

export const SimplePanel: React.FC<Props> = ({ options, data, width, height, onOptionsChange }) => {
  const theme = useTheme2();
  const styles = useStyles2(getStyles);
  const svgRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    isDragging: false,
    moved: false,
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
  });
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const { bindings, error } = useMemo(() => parseBindingsJson(options.bindingsJson), [options.bindingsJson]);
  const seriesValues = useMemo(() => buildSeriesValueMap(data.series, theme), [data.series, theme]);
  const svgMarkup = options.svgMarkup.trim() ? options.svgMarkup : DEFAULT_SVG_MARKUP;
  const activeBindingIndex = bindings.findIndex((binding) => binding.selected);

  useEffect(() => {
    const frame = frameRef.current;

    if (!frame) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      setZoom((currentZoom) => {
        const nextZoom = event.deltaY < 0 ? currentZoom * 1.1 : currentZoom / 1.1;
        const clampedZoom = Math.min(6, Math.max(0.25, nextZoom));

        setOffset((currentOffset) => {
          const maxX = getMaxOffset(frame.clientWidth, clampedZoom);
          const maxY = getMaxOffset(frame.clientHeight, clampedZoom);

          return {
            x: clamp(currentOffset.x, -maxX, maxX),
            y: clamp(currentOffset.y, -maxY, maxY),
          };
        });

        return clampedZoom;
      });
    };

    frame.addEventListener('wheel', handleWheel, { passive: false });

    return () => frame.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!dragRef.current.isDragging) {
        return;
      }

      const nextX = dragRef.current.startOffsetX + (event.clientX - dragRef.current.startX);
      const nextY = dragRef.current.startOffsetY + (event.clientY - dragRef.current.startY);
      const frame = frameRef.current;

      if (!frame) {
        return;
      }

      const maxX = getMaxOffset(frame.clientWidth, zoom);
      const maxY = getMaxOffset(frame.clientHeight, zoom);

      if (Math.abs(event.clientX - dragRef.current.startX) > 2 || Math.abs(event.clientY - dragRef.current.startY) > 2) {
        dragRef.current.moved = true;
      }

      setOffset({
        x: clamp(nextX, -maxX, maxX),
        y: clamp(nextY, -maxY, maxY),
      });
    };

    const handleMouseUp = () => {
      dragRef.current.isDragging = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [zoom]);

  useEffect(() => {
    const container = svgRef.current;
    const svgElement = container?.querySelector('svg');

    if (!svgElement) {
      return;
    }

    const handleClick = (event: Event) => {
      if (dragRef.current.moved) {
        dragRef.current.moved = false;
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const svgTarget = findSelectableSvgElement(target, svgElement);

      if (!svgTarget) {
        return;
      }

      const elementId =
        svgTarget.getAttribute('data-svg-element') ??
        svgTarget.getAttribute('id') ??
        svgTarget.getAttribute('data-cell-id');

      if (elementId) {
        setSelectedElementId(elementId);

        if (activeBindingIndex >= 0) {
          const nextBindings = [...bindings];
          nextBindings[activeBindingIndex] = {
            ...nextBindings[activeBindingIndex],
            elementId,
          };

          onOptionsChange({
            ...options,
            bindingsJson: formatBindingsJson(nextBindings),
          });
        }
      }
    };

    svgElement.addEventListener('click', handleClick);

    return () => svgElement.removeEventListener('click', handleClick);
  }, [activeBindingIndex, bindings, onOptionsChange, options, svgMarkup]);

  useEffect(() => {
    const container = svgRef.current;
    const svgElement = container?.querySelector('svg');

    if (!svgElement) {
      return;
    }

    svgElement.style.width = '100%';
    svgElement.style.height = '100%';
    svgElement.style.display = 'block';
    svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    if (!svgElement.getAttribute('viewBox')) {
      const widthAttr = Number.parseFloat(svgElement.getAttribute('width') ?? '');
      const heightAttr = Number.parseFloat(svgElement.getAttribute('height') ?? '');

      if (Number.isFinite(widthAttr) && widthAttr > 0 && Number.isFinite(heightAttr) && heightAttr > 0) {
        svgElement.setAttribute('viewBox', `0 0 ${widthAttr} ${heightAttr}`);
      }
    }
  }, [svgMarkup]);

  useEffect(() => {
    const frame = frameRef.current;

    if (!frame) {
      return;
    }

    const maxX = getMaxOffset(frame.clientWidth, zoom);
    const maxY = getMaxOffset(frame.clientHeight, zoom);

    setOffset((currentOffset) => ({
      x: clamp(currentOffset.x, -maxX, maxX),
      y: clamp(currentOffset.y, -maxY, maxY),
    }));
  }, [zoom, svgMarkup]);

  useEffect(() => {
    const frame = frameRef.current;

    if (!frame) {
      return;
    }

    const handleResize = () => {
      const maxX = getMaxOffset(frame.clientWidth, zoom);
      const maxY = getMaxOffset(frame.clientHeight, zoom);

      setOffset((currentOffset) => ({
        x: clamp(currentOffset.x, -maxX, maxX),
        y: clamp(currentOffset.y, -maxY, maxY),
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [zoom]);

  useEffect(() => {
    const container = svgRef.current;
    const svgElement = container?.querySelector('svg');

    if (!svgElement) {
      return;
    }

    applyBindingActions(svgElement, bindings, seriesValues, theme, selectedElementId);
  }, [bindings, seriesValues, theme, selectedElementId, svgMarkup]);

  useEffect(() => {
    const container = svgRef.current;
    const svgElement = container?.querySelector('svg');

    if (!svgElement) {
      return;
    }

    svgElement.style.transformOrigin = '50% 50%';
    svgElement.style.transform = `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`;
  }, [offset, zoom, svgMarkup]);

  const seriesCountSizeClass = getSeriesCountSizeClass(options.seriesCountSize);

  return (
    <div
      className={cx(
        styles.wrapper,
        css`
          width: ${width}px;
          height: ${height}px;
        `
      )}
    >
      <div
        className={styles.svgFrame}
        ref={frameRef}
        onMouseDown={(event) => {
          if (event.button !== 0) {
            return;
          }

          dragRef.current.isDragging = true;
          dragRef.current.moved = false;
          dragRef.current.startX = event.clientX;
          dragRef.current.startY = event.clientY;
          dragRef.current.startOffsetX = offset.x;
          dragRef.current.startOffsetY = offset.y;
        }}
        style={{ cursor: dragRef.current.isDragging ? 'grabbing' : 'grab' }}
      >
        <div className={styles.svg} ref={svgRef} dangerouslySetInnerHTML={{ __html: svgMarkup }} />
      </div>

      <div className={styles.summary}>
        <div className={styles.title}>{options.title}</div>
        <div className={styles.metaRow}>
          <span className={styles.badge}>SVG source: inline markup</span>
          <span className={styles.badge}>Zoom: {(zoom * 100).toFixed(0)}%</span>
          <span className={styles.badge}>Molette: zoom · Glisser: deplacer</span>
          {options.showSeriesCount && (
            <span className={cx(styles.badge, seriesCountSizeClass)} data-testid="simple-panel-series-counter">
              Series returned: {data.series.length}
            </span>
          )}
        </div>
        {data.series.length === 0 && (
          <div className={styles.notice}>No query series returned yet. The SVG remains visible so you can shape the layout first.</div>
        )}
        {error && <div className={styles.notice}>Bindings JSON error: {error}</div>}
        <div>Selected element: {selectedElementId ?? 'none yet'}</div>
        <div>Binding actif pour le clic: {activeBindingIndex >= 0 ? activeBindingIndex + 1 : 'aucun'}</div>
        <div>Configured bindings: {bindings.length}</div>
        {bindings.length > 0 && (
          <ul className={styles.bindingsList}>
            {bindings.map((binding) => (
              <li key={`${binding.elementId}-${binding.seriesName}-${binding.action}`}>
                {binding.elementId} → {binding.seriesName} ({binding.action})
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};