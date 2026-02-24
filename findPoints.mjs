import { Jimp } from 'jimp';

async function run() {
    const refImg = await Jimp.read('C:/Users/alain/.gemini/antigravity/brain/115986c4-19b5-4e07-a2f6-93ea15a99e28/media__1771737908679.png');

    // Hardcoded true bounding box for the Mexico landmass inside the 512x512 image
    const origBox = { minX: 73, maxX: 356, minY: 169, maxY: 371, w: 283, h: 202 };

    // Hardcoded true bounding box for the Mexico landmass inside the user's reference image
    const refBox = { minX: 91, maxX: 754, minY: 86, maxY: 517, w: 663, h: 431 };

    // Get points from reference image
    let yellowPixels = [];
    refImg.scan(0, 0, refImg.bitmap.width, refImg.bitmap.height, function (x, y, idx) {
        const r = this.bitmap.data[idx];
        const g = this.bitmap.data[idx + 1];
        const b = this.bitmap.data[idx + 2];
        const a = this.bitmap.data[idx + 3];

        // bright yellow/green dots
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

    // Define cities and their approximated reference positions to match up
    const cities = [
        { name: 'saltillo', refX: 49.98, refY: 41.02 },
        { name: 'monterrey', refX: 51.56, refY: 40.22 },
        { name: 'altamira', refX: 58.07, refY: 50.77 },
        { name: 'mazatlan', refX: 37.39, refY: 47.65 },
        { name: 'queretaro', refX: 52.65, refY: 58.46 },
        { name: 'morelia', refX: 49.33, refY: 62.36 },
        { name: 'tlalnepantla', refX: 55.47, refY: 62.22 },
        { name: 'merida', refX: 79.69, refY: 57.91 },
    ];

    console.log('Final CSS Classes:');

    clusters.forEach((c) => {
        let cx = c.sumX / c.count;
        let cy = c.sumY / c.count;

        let percentX = (cx - refBox.minX) / refBox.w;
        let percentY = (cy - refBox.minY) / refBox.h;

        let origPixelX = origBox.minX + (percentX * origBox.w);
        let origPixelY = origBox.minY + (percentY * origBox.h);

        let finalPercentX = (origPixelX / 512) * 100;
        let finalPercentY = (origPixelY / 512) * 100;

        // Match this cluster to the nearest city based on percentX/percentY from the reference map
        // The reference map percentages we had previously were raw percent across the whole ref map!
        let rawRefPercentX = (cx / refImg.bitmap.width) * 100;
        let rawRefPercentY = (cy / refImg.bitmap.height) * 100;

        let closestCity = cities[0];
        let minDist = 9999;

        cities.forEach(city => {
            let dist = Math.hypot(city.refX - rawRefPercentX, city.refY - rawRefPercentY);
            if (dist < minDist) {
                minDist = dist;
                closestCity = city;
            }
        });

        console.log(`.${closestCity.name} {`);
        console.log(`    top: ${finalPercentY.toFixed(2)}%;`);
        console.log(`    left: ${finalPercentX.toFixed(2)}%;`);
        console.log(`}`);
    });
}

run().catch(console.error);
