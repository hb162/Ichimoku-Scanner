import puppeteer from 'puppeteer-core';
import fs from 'fs';

(async () => {
    try {
        const browser = await puppeteer.launch({
            executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
            headless: 'new'
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1440, height: 900 });
        console.log('Navigating to dashboard...');
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
        
        console.log('Waiting for elements to load...');
        await new Promise(r => setTimeout(r, 6000));
        
        if (!fs.existsSync('docs')) fs.mkdirSync('docs');
        
        console.log('Taking dashboard screenshot...');
        await page.screenshot({ path: 'docs/dashboard.png', fullPage: true });

        console.log('Opening expanding chart...');
        const expandBtn = await page.$('button[title="Phóng to biểu đồ"]');
        if (expandBtn) {
            await expandBtn.click();
            await new Promise(r => setTimeout(r, 2000));
            
            // Turn on cloud and chikou toggles in modal to make it look full
            const toggleLabels = await page.$$('.glass-panel label, div[style*="modalToggleBar"] label');
            for (const label of toggleLabels) {
                const text = await label.evaluate(el => el.textContent);
                if (text && (text.includes('Mây Kumo') || text.includes('Đường Trễ'))) {
                    await label.click();
                }
            }
            await new Promise(r => setTimeout(r, 1000));
            console.log('Taking expanded chart screenshot...');
            await page.screenshot({ path: 'docs/expanded-chart.png' });
        } else {
            console.log('Button Phóng to biểu đồ not found.');
        }

        await browser.close();
        console.log('Done!');
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
