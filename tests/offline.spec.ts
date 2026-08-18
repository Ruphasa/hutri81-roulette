import { test, expect } from '@playwright/test';

test.describe('Offline capabilities', () => {
  test('Should be able to draw while offline', async ({ browser }) => {
    // We create our own context to control offline state
    const context = await browser.newContext({ colorScheme: 'light' });
    let page = await context.newPage();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    // Load page online
    await page.goto('/draw/');
    
    // Wait for SW to be ready
    await page.locator('.offline-status-text').filter({ hasText: 'Siap Offline' }).waitFor({ state: 'visible' });
    
    // Close the page
    await page.close();
    
    // Set offline
    await context.setOffline(true);
    
    // Open a new page in the same offline context
    page = await context.newPage();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/draw/');
    
    // Perform a draw
    await page.locator('[data-role="draw"]').click();
    await page.locator('[data-role="advance"]').waitFor({ state: 'visible' });
    
    const offlineWinner = await page.locator('[data-role="center-value"]').innerText();
    
    // Reload while offline to check persistence
    await page.reload();
    
    const recoveredWinner = await page.locator('[data-role="center-value"]').innerText();
    expect(recoveredWinner).toBe(offlineWinner);
    
    await context.close();
  });
});
