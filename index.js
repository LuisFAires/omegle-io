const { connect } = require("puppeteer-real-browser");
const SAME_COUNTRY = false; //true for same country, false for random
const MESSAGE = 'Search for "triggertaps.top" on google'; //message to send to stranger
const INTERESTS = "" //comma separated list of interests, leave blank for random

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

    await page.setRequestInterception(true);
    page.on('request', (request) => {
        const resourceType = request.resourceType();
        const url = request.url();

        if (url.includes('google') || 
            url.includes('.png') || 
            url.includes('.css') || 
            url.includes('.ico') ||
            url.includes('mootools') || 
            url.includes('beacon') ||
            url.includes('speculation') ||
            url.includes('omegle.js') ||
            url.includes('loadder.js') ||
            url.includes('main.js')
        ) {
            request.abort(); 
        } else {
            request.continue(); 
        }
    })
    console.log("🌐 Browser set up.");
    await beforeChat();

    async function beforeChat() {
        try {
            console.log("⏳ Navigating to Omegle...");
            await page.goto("https://omegleweb.io/chat?interests=" + encodeURI(INTERESTS), { waitUntil: "networkidle0" });
            await page.evaluate(() => {
                sessionStorage.setItem("omgw_ab_v1", "A");
                sessionStorage.setItem("userAgreement", "true");
            });;
            console.log("🗺️ Country preference checkbox...");
            let elementsFound = false;
            do {
                elementsFound = await page.evaluate(async (sameCountry) => {
                    if (!document.querySelector("#country-preference-checkbox") || !document.querySelector("#agree-btn")) {
                        return false;
                    }
                    document.querySelector("#country-preference-checkbox").checked = sameCountry;
                    await new Promise((resolve) => setTimeout(resolve, 500));
                    document.querySelector("#agree-btn").click();
                    return true;
                }, SAME_COUNTRY);
                await new Promise((resolve) => setTimeout(resolve, 50));
            } while (!elementsFound)
            console.log("🖱️ Clicked on agree button...");
        } catch (error) {
            console.log("❌ Error during beforeChat:");
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
                //Country preference may not be saved, try clicking worldwide link if not already on it 
                if (!sameCountry) {
                    try {
                        document.querySelector('a[class="worldwide-link"]').click();
                    } catch (e) { }
                }
                return false;
            }, SAME_COUNTRY);
        }

        try {
            console.log('🕒', new Date().toLocaleTimeString());

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
            await page.type('input[id="message-input"]', MESSAGE);
            await page.click('button[id="send-btn"]');
            console.log("✅ Sent messages to stranger ✅ ");
            await new Promise((resolve) => setTimeout(resolve, 200));
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