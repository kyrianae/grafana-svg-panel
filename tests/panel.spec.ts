import { expect, test } from '@grafana/plugin-e2e';

test('should render the default SVG even when no query data is returned', async ({
  gotoPanelEditPage,
  readProvisionedDashboard,
  page,
}) => {
  const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
  const panelEditPage = await gotoPanelEditPage({ dashboard, id: '2' });

  await expect(panelEditPage.panel.locator).toContainText('No query series returned yet');
  await expect(page.getByTestId('simple-panel-circle')).toBeVisible();
});

test('should display the SVG preview when data is passed to the panel', async ({
  panelEditPage,
  readProvisionedDataSource,
  page,
}) => {
  const ds = await readProvisionedDataSource({ fileName: 'datasources.yml' });
  await panelEditPage.datasource.set(ds.name);
  await panelEditPage.setVisualization('SVG Panel');

  await expect(page.getByTestId('simple-panel-circle')).toBeVisible();
});

test('should display series counter when "Show series counter" option is enabled', async ({
  gotoPanelEditPage,
  readProvisionedDashboard,
  page,
}) => {
  const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
  const panelEditPage = await gotoPanelEditPage({ dashboard, id: '1' });
  const options = panelEditPage.getCustomOptions('SVG Panel');
  const showSeriesCounter = options.getSwitch('Show series counter');

  await showSeriesCounter.check();
  await expect(page.getByTestId('simple-panel-series-counter')).toBeVisible();
});
