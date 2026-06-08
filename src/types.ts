export type SeriesSize = 'sm' | 'md' | 'lg';

export type SvgBindingAction = 'fill' | 'stroke' | 'text' | 'attribute';

export interface SvgBinding {
  elementId: string;
  seriesName: string;
  action: SvgBindingAction;
  attributeName?: string;
  selected?: boolean;
}

export interface SimpleOptions {
  title: string;
  svgMarkup: string;
  bindingsJson: string;
  showSeriesCount: boolean;
  seriesCountSize: SeriesSize;
}
