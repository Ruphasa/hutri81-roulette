import { test, expect } from '@playwright/test';

test.describe('Raffle Flow', () => {
  test('Five prizes, recovery, and reset flow', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.locator('.offline-status-text').filter({ hasText: 'Siap Offline' }).waitFor({ state: 'visible' });
    await page.goto('/draw/');

    // Check initial active count
    const initialActiveCountText = await page.locator('[data-role="active-count"]').innerText();
    const initialActiveCount = parseInt(initialActiveCountText.split('/')[0] || '0', 10);
    expect(initialActiveCount).toBeGreaterThan(0);
    
    const winners: string[] = [];

    const drawWinner = async () => {
      // Click draw
      await page.locator('[data-role="draw"]').click();
      
      // Wait for advance button to be visible
      await page.locator('[data-role="advance"]').waitFor({ state: 'visible' });
      
      // Read winner
      const winner = await page.locator('[data-role="center-value"]').innerText();
      winners.push(winner);
      return winner;
    };

    const advanceNext = async () => {
      await page.locator('[data-role="advance"]').click();
    };

    // 1st Draw
    await drawWinner();
    await advanceNext();

    // 2nd Draw
    const secondWinner = await drawWinner();
    
    // Reload after 2nd draw
    await page.reload();

    // Ensure state recovered
    const recoveredWinner = await page.locator('[data-role="center-value"]').innerText();
    expect(recoveredWinner).toBe(secondWinner);
    await expect(page.locator('[data-role="advance"]')).toBeVisible();

    await advanceNext();

    // 3rd Draw
    await drawWinner();
    await advanceNext();

    // 4th Draw
    await drawWinner();
    await advanceNext();

    // 5th Draw
    await drawWinner();
    
    // Finish event
    await advanceNext(); // This might say 'Lihat Semua Pemenang'

    // Check history (we should have 5 winners listed)
    const historyItems = page.locator('[data-role="winner-history"] div');
    await expect(historyItems).toHaveCount(5);
    
    // Validate unique winners
    const uniqueWinners = new Set(winners);
    expect(uniqueWinners.size).toBe(5);

    // Reset flow
    await page.locator('[data-role="reset"]').click();
    await expect(page.locator('[data-role="reset-dialog"]')).toBeVisible();
    await page.locator('[data-role="reset-confirm"]').click();

    // History should be empty
    const finalHistoryItems = page.locator('[data-role="winner-history"] div');
    await expect(finalHistoryItems).toHaveCount(0);

    // Active count should be restored
    const finalActiveCountText = await page.locator('[data-role="active-count"]').innerText();
    const finalActiveCount = parseInt(finalActiveCountText.split('/')[0] || '0', 10);
    expect(finalActiveCount).toBe(initialActiveCount);
  });
});
