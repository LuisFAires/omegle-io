const { connect } = require("puppeteer-real-browser");
const SAME_COUNTRY = false; //true for same country, false for random
const MESSAGE_DELAY = 50; //delay in ms between each character typed
const MESSAGE = 'Search for "triggertaps.top" on google'; //message to send to stranger

async function main() {
    console.log("🌐 setting browser up...")
    let { browser, page } = await connect({
        headless: false,
        connectOption: {
            defaultViewport: null,
        },
        args: [],
        customConfig: {},
        turnstile: true,
        connectOption: {},
        disableXvfb: false,
        ignoreAllFlags: false,
        // proxy:{
        //     host:'<proxy-host>',
        //     port:'<proxy-port>',
        //     username:'<proxy-username>',
        //     password:'<proxy-password>'
        // }
    });
    console.log("🌐 Browser set up.");
    await beforeChat();

    async function beforeChat() {
        try {
            console.log("⏳ Navigating to Omegle...");
            await page.goto("https://omegleweb.io/");
            console.log("👀 Looking for text chat button...");
            let buttonFound = false;
            do {
                buttonFound = await page.evaluate(async() => {
                    let button = document.querySelector("#textbtn");
                    if (button) {
                        await new Promise((resolve) => setTimeout(resolve, 500));
                        button.click();
                        await new Promise((resolve) => setTimeout(resolve, 200));
                        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
                        checkboxes[1].click();
                        checkboxes[2].click();
                        document.querySelector('input[type="button"]').click();
                        return true;
                    }
                    return false;
                });
                await new Promise((resolve) => setTimeout(resolve, 50));
            } while (!buttonFound)
            console.log("🖱️✅✅🖱️ Clicked text chat button, checked agreement boxes and clicked on confirm button...");
            await page.waitForNavigation();
            buttonInnerText = false;
            do {
                buttonInnerText = await page.evaluate(() => {
                    let button = document.querySelector("#agree-btn");
                    if (button && document.querySelector("#country-preference-checkbox")) {
                        return button.innerText;
                    }
                    return false;
                });
            }while (!buttonInnerText)
            if (buttonInnerText.includes("Omezy")) {
                await browser.close();
                console.log("⛔ Unable to connect with current Session.");
                main();
                return;
            }
            console.log("🗺️ Country preference checkbox...");
            await page.evaluate((sameCountry) => {
                //true for same country, false for random
                document.querySelector("#country-preference-checkbox").checked = sameCountry;
            }, SAME_COUNTRY);
            await page.evaluate(() => {
                document.querySelector("#agree-btn").click();
            });
            console.log("🖱️ Clicked on agree button...");
        } catch (error) {
            console.log("❌ Error during setup:");
            console.log(error);
            try { browser.close(); } catch { }
            main();
            return;
        }
        onChat();
    }

    async function onChat() {
        async function isStrangerOnline() {
            return await page.evaluate(async (sameCountry) => {
                let status = document.querySelector('div[class="message-status"]');
                let disconnectNotice = document.querySelector('div[class="message-status disconnect-notice"]');
                if (status && !disconnectNotice) {
                    return true;
                }
                if (!sameCountry) {
                    try {
                        document.querySelector('a[class="worldwide-link"]').click();
                    } catch (e) { }
                }
                return false;
            }, SAME_COUNTRY);
        }

        async function sendMessage(message) {
            for (character of message) {
                page.type('input[id="message-input"]', character)
                await new Promise((resolve) => setTimeout(resolve, MESSAGE_DELAY));
                let online = await isStrangerOnline();
                if (!online) {
                    console.log("🔴⌨️ Stranger disconnected while typing...");
                    return false;
                }
            }
            await page.click('button[id="send-btn"]');
            console.log("✅ Sent messages to stranger ✅ ");
        }

        try {
            console.log('🕒',new Date().toLocaleTimeString());

            let isOnlineNow = await new Promise((resolve) => {
                let resolved = false;
                setTimeout(() => {
                    resolved = true;
                    resolve(false);
                }, 60000); //timeout after 1 minute if stranger doesn't come online
                let checkOnline = setInterval(async () => {
                    if (resolved) {
                        clearInterval(checkOnline);
                        return;
                    }
                    let online = await isStrangerOnline();
                    if (online) {
                        resolved = true;
                        clearInterval(checkOnline);
                        resolve(true);
                    }
                }, 50);
            });
            if (!isOnlineNow) {
                console.log("🔴🔴🔴 Stranger did not come online within 1 minute");
                await browser.close();
                main();
                return;
            }
            console.log("🟢 Stranger is online...");
            await sendMessage(MESSAGE);
            await new Promise((resolve) => setTimeout(resolve, 3000));
            isOnlineNow = await isStrangerOnline();
            if (isOnlineNow) {
                console.log("🟢 Stranger is still online, ending chat...");
                await page.keyboard.press('Escape');
                await page.keyboard.press('Escape');
            } else {
                console.log("🔴 Stranger has disconnected, ending chat...");
                await page.keyboard.press('Escape');
            }
        } catch (error) {
            console.log("❌ Error during chat:");
            console.log(error);
            if (page.isClosed?.()) {
                main();
                return;
            }
        }
        await onChat();
    }
}
main();