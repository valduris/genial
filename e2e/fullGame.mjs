import puppeteer from "puppeteer";

export async function waitMs(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto("http://localhost:3000/");
    const gameName = await page.waitForSelector("#createGameFormName");
    await waitMs(500);
    await gameName.click();
    await waitMs(500);
    await page.keyboard.type("Custom game name from e2e test");
    await waitMs(500);
    await page.click("#createGameFormName");
    await waitMs(500);
    await page.screenshot({ path: "e2e/screenshots/gameList.png" });
    await waitMs(500);
    await gameName.dispose();
    await browser.close();
})();