import { createCanvas } from 'canvas'

export class Mosaic {
    constructor(images, width) {
        this.images = images
        this.width = width
    }

    // Get the best layout based on the target ratio and image count per row
    getBestLayout({ target_ratio = 1.35, min_images_per_row = 1, max_images_per_row = 5 } = {}) {
        let bestLayout = null
        let bestRatioDiff = Infinity

        for (let imagesPerRow = min_images_per_row; imagesPerRow <= max_images_per_row; imagesPerRow++) {
            const layout = this.calculateLayout(imagesPerRow)
            const ratioDiff = Math.abs(layout.ratio - target_ratio)

            if (ratioDiff < bestRatioDiff) {
                bestRatioDiff = ratioDiff
                bestLayout = layout
            }
        }
        return bestLayout
    }

    calculateLayout(targetImagesPerRow) {
        const rows = []
        let currentRow = []
        let currentRowWidth = 0

        this.images.forEach((img, index) => {
            const normalizedWidth = this.width / targetImagesPerRow

            currentRow.push(img)
            currentRowWidth += normalizedWidth

            // Break row when we reach target images per row or it's the last image
            if (currentRow.length === targetImagesPerRow || index === this.images.length - 1) {
                rows.push([...currentRow])
                currentRow = []
                currentRowWidth = 0
            }
        })

        // Calculate total height for this layout
        const rowHeights = rows.map(row => this.getRowHeight(row, this.width))
        const totalHeight = rowHeights.reduce((sum, h) => sum + h, 0)

        return {
            rows,
            rowHeights,
            totalHeight,
            ratio: this.width / totalHeight
        }
    }

    getRowHeight(row, width) {
        const aspectRatioSum = row.reduce((sum, img) => sum + img.width / img.height, 0)
        return width / aspectRatioSum
    }

    draw() {
        const bestLayout = this.getBestLayout()
        // Draw the best layout
        const canvas = createCanvas(this.width, bestLayout.totalHeight)
        const ctx = canvas.getContext('2d')

        // Fill background
        ctx.fillStyle = '#000000'
        ctx.fillRect(0, 0, this.width, bestLayout.totalHeight)

        // Draw rows
        let y = 0
        bestLayout.rows.forEach((row, rowIndex) => {
            const rowHeight = bestLayout.rowHeights[rowIndex]
            let x = 0

            // Calculate actual widths for this row
            const rowAspectRatioSum = row.reduce((sum, img) => sum + img.width / img.height, 0)

            row.forEach(img => {
                const aspectRatio = img.width / img.height
                const width = (this.width / rowAspectRatioSum) * aspectRatio

                ctx.drawImage(img, x, y, width, rowHeight)
                x += width
            })

            y += rowHeight
        })

        return canvas
    }
}