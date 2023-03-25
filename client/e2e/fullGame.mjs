import puppeteer from "puppeteer";

export async function waitMs(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const pageForCreator = await browser.newPage();
    await pageForCreator.goto("http://localhost:3000/");

    const gameName = await pageForCreator.waitForSelector('[data-role="create_game_name"]');
    await gameName.click();
    await pageForCreator.keyboard.type(("E2E - " + new Date()).slice(0, 50));

    await pageForCreator.click('[data-role="create_game_submit"]');
    await pageForCreator.screenshot({ path: "e2e/screenshots/gameList.png" });

    const pageForJoiner = await browser.newPage();
    await pageForJoiner.goto("http://localhost:3000/");
    const joinButton = await pageForCreator.waitForSelector('[data-role="game_list_join"]');
    await joinButton.click();

    await waitMs(150900);
    await gameName.dispose();
    await browser.close();
})();