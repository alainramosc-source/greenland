import { Jimp } from 'jimp';

async function run() {
    const img = await Jimp.read('C:/Users/alain/.gemini/antigravity/brain/115986c4-19b5-4e07-a2f6-93ea15a99e28/media__1771737908679.png');
    const w = img.bitmap.width;
    const h = img.bitmap.height;
    let yellowPixels = [];

    img.scan(0, 0, w, h, function (x, y, idx) {
        const r = this.bitmap.data[idx];
        const g = this.bitmap.data[idx + 1];
        const b = this.bitmap.data[idx + 2];
        const a = this.bitmap.data[idx + 3];

        if (a > 100 && r > 200 && g > 200 && b < 150) {
            yellowPixels.push({ x, y });
        }
    });

    let clusters = [];
    for (let p of yellowPixels) {
        let found = false;
        for (let c of clusters) {
            if (Math.abs((c.sumX / c.count) - p.x) < 20 && Math.abs((c.sumY / c.count) - p.y) < 20) {
                c.sumX += p.x;
                c.sumY += p.y;
                c.count++;
                found = true;
                break;
            }
        }
        if (!found) {
            clusters.push({ sumX: p.x, sumY: p.y, count: 1 });
        }
    }

    console.log('Detected points:');
    clusters.sort((a, b) => a.sumX - b.sumX).forEach((c, idx) => {
        let cx = c.sumX / c.count;
        let cy = c.sumY / c.count;
        console.log(`left: ${((cx / w) * 100).toFixed(2)}%; top: ${((cy / h) * 100).toFixed(2)}%;`);
    });
}

run().catch(console.error);
