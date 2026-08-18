import { test, expect } from '@playwright/test';

test.describe('Offline capabilities', () => {
  test('Should be able to draw while offline', async ({ context }) => {
    let page = await context.newPage();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    // Load page online to install SW
    await page.goto('/');
    
    // Wait for SW to be ready
    await page.locator('.offline-status-text').filter({ hasText: 'Siap Offline' }).waitFor({ state: 'visible' });
    
    // Close the page
    await page.close();
    
    // Open a new page in the same offline context
    page = await context.newPage();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(500);
    
    // Set offline
    await context.setOffline(true);
    
    await page.goto('/', { waitUntil: 'commit' });
    
    // Perform a draw
    await page.locator('[data-role="spin-button"], [data-role="draw"]').click();
    await page.locator('[data-role="advance"]').waitFor({ state: 'visible' });
    
    const offlineWinner = await page.locator('[data-role="winner-display"], [data-role="center-value"]').innerText();
    
    // Reload while offline to check persistence
    await page.reload();
    
    const recoveredWinner = await page.locator('[data-role="winner-display"], [data-role="center-value"]').innerText();
    expect(recoveredWinner).toBe(offlineWinner);
    
    await context.close();
  });
});
