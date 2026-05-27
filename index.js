const { connect } = require("puppeteer-real-browser");
const SAME_COUNTRY = false; //true for same country, false for random
const MESSAGE_DELAY = 100; //delay in ms between each character typed
const MESSAGE = "YOUR MESSAGE GOES HERE"; //message to send to stranger

async function main() {
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

    await beforeChat();

    async function beforeChat() {
        try {
            await page.goto("https://omegleweb.io/");
            await new Promise((resolve) => setTimeout(resolve, 10000));
            console.log("Looking for text chat button...");
            await page.waitForFunction(() => {
                return document.querySelector("#textbtn");
            });
            console.log("Button found...");
            await page.evaluate(() => {
                document.querySelector("#textbtn").click();
            });
            console.log("Clicked on text chat button...");
            await new Promise((resolve) => setTimeout(resolve, 500));
            await page.evaluate(async () => {
                const checkboxes = document.querySelectorAll('input[type="checkbox"]');
                checkboxes[1].click();
                await new Promise((resolve) => setTimeout(resolve, 500));
                checkboxes[2].click();
                await new Promise((resolve) => setTimeout(resolve, 500));
                document.querySelector('input[type="button"]').click();
            });
            console.log("Clicked on confirm button...");
            await new Promise((resolve) => setTimeout(resolve, 5000));
            console.log("Looking for country preference checkbox...");
            await page.waitForFunction(() => {
                return document.querySelector("#country-preference-checkbox");
            });
            console.log("Checkbox found...");
            await page.evaluate((sameCountry) => {
                //true for same country, false for random
                document.querySelector("#country-preference-checkbox").checked = sameCountry;
            }, SAME_COUNTRY);
            await new Promise((resolve) => setTimeout(resolve, 500));
            let badSession = await page.evaluate(() => {
                if (document.querySelector("#agree-btn").innerText.includes("Omezy")) {
                    return true
                } else {
                    return false
                }
            });
            if (badSession) {
                await browser.close();
                console.log("Unable to connect with current Session.");
                main();
                return;
            }
            await page.evaluate(() => {
                document.querySelector("#agree-btn").click();
            });
            console.log("Clicked on agree button...");
        } catch (error) {
            console.log("Error during setup:", error.message);
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
                    console.log("Stranger disconnected while typing...");
                    return false;
                }
            }
            await page.click('button[id="send-btn"]');
            console.log("Sent messages to stranger...");
        }

        try {
            console.log(new Date().toLocaleTimeString());

            let isOnline = await new Promise((resolve) => {
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
            if (!isOnline) {
                console.log("Stranger did not come online within 1 minute");
                await browser.close();
                main();
                return;
            }
            console.log("Stranger is online...");
            await sendMessage(MESSAGE);
            await new Promise((resolve) => setTimeout(resolve, 3000));
            isOnline = await isStrangerOnline();
            if (isOnline) {
                console.log("Stranger is still online, sending escape key to end chat...");
                await page.keyboard.press('Escape');
                await page.keyboard.press('Escape');
            } else {
                console.log("Stranger has disconnected, ending chat...");
                await page.keyboard.press('Escape');
            }
        } catch (error) {
            console.log("Error during chat:", error.message);
            if (page.isClosed?.()) {
                main();
                return;
            }
        }
        await onChat();
    }
}
main();