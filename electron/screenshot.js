const { desktopCapturer, screen } = require('electron')

/**
 * Capture a region of the primary display.
 * @param {Object} rect { x, y, width, height } — logical px coordinates
 * @returns {Promise<string>} base64 PNG (without data URI prefix)
 */
async function captureRegion(rect) {
    const display = screen.getPrimaryDisplay()
    const scaleFactor = display.scaleFactor

    const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: {
            width: Math.round(display.bounds.width * scaleFactor),
            height: Math.round(display.bounds.height * scaleFactor),
        }
    })

    // Find the primary display source
    const primary = sources.find(s => s.display_id === String(display.id)) || sources[0]
    if (!primary) throw new Error('No screen source found')

    const thumbnail = primary.thumbnail

    // Crop to the selected rect (scale-aware)
    const physX = Math.round(rect.x * scaleFactor)
    const physY = Math.round(rect.y * scaleFactor)
    const physW = Math.round(rect.width * scaleFactor)
    const physH = Math.round(rect.height * scaleFactor)

    const cropped = thumbnail.crop({
        x: physX,
        y: physY,
        width: physW,
        height: physH,
    })

    // Return as base64 PNG
    const buf = cropped.toPNG()
    return buf.toString('base64')
}

module.exports = { captureRegion }
