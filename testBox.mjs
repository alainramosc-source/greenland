import { Jimp } from 'jimp';

async function run() {
    const origImg = await Jimp.read('https://lh3.googleusercontent.com/aida-public/AB6AXuDwkgcldJkjfmmaOP9aBPrsgunw4R1EoM0PvGVQjj_uUEK5wHP78cjrTBcvy1OhtOEA2Tp_8pMpzq19R8qu0438FqCeSKUi-WLbv9dUv2138jf3G6euTb6fjfb4s6pntdcGvc0cm0neKjW4MP_EsMkhuJWbEFWgG1-Edw0iY7yREU5kUa31XG0d2erwZOmzEuvbWBpmqIAU7KTGqzCJy2REMZ4Jkif62yL2PVga1g0UAnayGVbqPFBVAEXH5hHv3zVwwP9gZUATDU0');

    // Get background color from top-left pixel
    const bgR = origImg.bitmap.data[0];
    const bgG = origImg.bitmap.data[1];
    const bgB = origImg.bitmap.data[2];

    let minX = origImg.bitmap.width, maxX = 0, minY = origImg.bitmap.height, maxY = 0;

    origImg.scan(0, 0, origImg.bitmap.width, origImg.bitmap.height, function (x, y, idx) {
        const r = this.bitmap.data[idx];
        const g = this.bitmap.data[idx + 1];
        const b = this.bitmap.data[idx + 2];

        // If pixel is different from background by a noticeable margin
        if (Math.abs(r - bgR) > 10 || Math.abs(g - bgG) > 10 || Math.abs(b - bgB) > 10) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
    });

    console.log('True Orig Box:', { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY });
}

run().catch(console.error);
