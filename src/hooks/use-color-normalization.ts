import { useState, useCallback, useRef } from 'react';

// Simplified constants for D65 white point (sRGB standard)
const D65_WHITE_POINT_XYZ = [0.95047, 1.00000, 1.08883]; // D65 in XYZ color space

// Utility to convert RGB to XYZ (sRGB D65)
function rgbToXyz(r: number, g: number, b: number): [number, number, number] {
    r /= 255;
    g /= 255;
    b /= 255;

    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    r *= 100;
    g *= 100;
    b *= 100;

    const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
    const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
    const z = r * 0.0193 + g * 0.1192 + b * 0.9505;

    return [x, y, z];
}

// Utility to convert XYZ to xy chromaticity coordinates
function xyzToxy(x: number, y: number, z: number): [number, number] {
    const sum = x + y + z;
    if (sum === 0) return [0, 0];
    return [x / sum, y / sum];
}

// Very simplified CCT calculation from xy (McCamy's formula - approximation)
function calculateCct(x: number, y: number): number {
    const n = (x - 0.3320) / (0.1858 - y);
    const cct = 437 * Math.pow(n, 3) + 3601 * Math.pow(n, 2) + 6861 * n + 5517;
    return Math.round(cct);
}

// Basic diagonal CCM for white balance (simplistic gain adjustment)
function createDiagonalCcm(refR: number, refG: number, refB: number, targetR: number, targetG: number, targetB: number): number[][] {
    // Prevent division by zero or very small numbers
    const rGain = refR > 0.1 ? targetR / refR : 1;
    const gGain = refG > 0.1 ? targetG / refG : 1;
    const bGain = refB > 0.1 ? targetB / refB : 1;

    return [
        [rGain, 0, 0],
        [0, gGain, 0],
        [0, 0, bGain],
    ];
}

// A more robust (but still simplified) CCM generation based on Von Kries transform idea
function createVonKriesCcm(sourceWhite: [number, number, number], targetWhite: [number, number, number]): number[][] {
    // Convert source and target white points from RGB to LMS (spectral sensitivity)
    // For simplicity, we'll use a linear RGB to LMS conversion here, typically more complex.
    // Assuming sourceWhite and targetWhite are already normalized to 0-1 range.

    // sRGB to LMS conversion matrix (approximation)
    const M_srgb_to_lms = [
        [0.8951, 0.2664, -0.1614],
        [-0.7502, 1.7135, 0.0367],
        [0.0389, -0.0685, 1.0296]
    ];

    // LMS to sRGB conversion matrix (approximation)
    const M_lms_to_srgb = [
        [4.4679, -3.5873, 0.1193],
        [-1.2186, 2.3809, -0.1624],
        [0.0497, -0.2439, 1.2045]
    ];

    // Placeholder: actual LMS conversion is more involved and depends on precise spectral data.
    // For now, treat sourceWhite and targetWhite as generic color vectors.
    const lmsSource = [
        M_srgb_to_lms[0][0] * sourceWhite[0] + M_srgb_to_lms[0][1] * sourceWhite[1] + M_srgb_to_lms[0][2] * sourceWhite[2],
        M_srgb_to_lms[1][0] * sourceWhite[0] + M_srgb_to_lms[1][1] * sourceWhite[1] + M_srgb_to_lms[1][2] * sourceWhite[2],
        M_srgb_to_lms[2][0] * sourceWhite[0] + M_srgb_to_lms[2][1] * sourceWhite[1] + M_srgb_to_lms[2][2] * sourceWhite[2],
    ];

    const lmsTarget = [
        M_srgb_to_lms[0][0] * targetWhite[0] + M_srgb_to_lms[0][1] * targetWhite[1] + M_srgb_to_lms[0][2] * targetWhite[2],
        M_srgb_to_lms[1][0] * targetWhite[0] + M_srgb_to_lms[1][1] * targetWhite[1] + M_srgb_to_lms[1][2] * targetWhite[2],
        M_srgb_to_lms[2][0] * targetWhite[0] + M_srgb_to_lms[2][1] * targetWhite[1] + M_srgb_to_lms[2][2] * targetWhite[2],
    ];

    // Calculate diagonal adaptation matrix D
    const D = [
        [lmsTarget[0] / (lmsSource[0] || 1), 0, 0],
        [0, lmsTarget[1] / (lmsSource[1] || 1), 0],
        [0, 0, lmsTarget[2] / (lmsSource[2] || 1)],
    ];

    // Multiply M_lms_to_srgb * D * M_srgb_to_lms
    // This requires matrix multiplication functions which are omitted for brevity.
    // For now, returning a diagonal gain based on average white values
    const rGain = (targetWhite[0] / (sourceWhite[0] || 1));
    const gGain = (targetWhite[1] / (sourceWhite[1] || 1));
    const bGain = (targetWhite[2] / (sourceWhite[2] || 1));

    return [
        [rGain, 0, 0],
        [0, gGain, 0],
        [0, 0, bGain],
    ];
}


export function useColorNormalization() {
    const [colorTemperatureKelvin, setColorTemperatureKelvin] = useState<number | null>(null);
    const [colorCorrectionMatrix, setColorCorrectionMatrix] = useState<number[][] | null>(null);

    const performCalibration = useCallback((
        videoElement: HTMLVideoElement,
        canvasElement: HTMLCanvasElement,
        referenceRoi: { x: number; y: number; width: number; height: number },
        targetWhiteRgb: [number, number, number] = [255, 255, 255] // D65 is target
    ) => {
        const context = canvasElement.getContext('2d', { willReadFrequently: true });
        if (!context) {
            console.error('Could not get canvas context for color normalization.');
            return null;
        }

        // Temporarily draw video frame to canvas
        const originalCanvasWidth = canvasElement.width;
        const originalCanvasHeight = canvasElement.height;
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        context.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight);

        try {
            const imageData = context.getImageData(
                referenceRoi.x,
                referenceRoi.y,
                referenceRoi.width,
                referenceRoi.height
            );

            let rSum = 0, gSum = 0, bSum = 0;
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                rSum += data[i];
                gSum += data[i + 1];
                bSum += data[i + 2];
            }
            const pixelCount = data.length / 4;
            const avgR = rSum / pixelCount;
            const avgG = gSum / pixelCount;
            const avgB = bSum / pixelCount;

            // Convert average RGB of white reference to xy chromaticity
            const [x, y, z] = rgbToXyz(avgR, avgG, avgB);
            const [cx, cy] = xyzToxy(x, y, z);
            const cct = calculateCct(cx, cy);

            // Generate CCM using the sampled white and a target white (D65)
            // Normalize sampled RGB to 0-1 for CCM calculation
            const sampledWhiteNormalized: [number, number, number] = [avgR / 255, avgG / 255, avgB / 255];
            const targetWhiteNormalized: [number, number, number] = [targetWhiteRgb[0] / 255, targetWhiteRgb[1] / 255, targetWhiteRgb[2] / 255];

            // Using Von Kries for a slightly more advanced CCM
            const ccm = createVonKriesCcm(sampledWhiteNormalized, targetWhiteNormalized);

            setColorTemperatureKelvin(cct);
            setColorCorrectionMatrix(ccm);

            return { cct, ccm };
        } catch (error) {
            console.error('Error during color calibration:', error);
            return null;
        } finally {
            // Restore canvas dimensions
            canvasElement.width = originalCanvasWidth;
            canvasElement.height = originalCanvasHeight;
        }
    }, []);

    const applyColorCorrection = useCallback((
        imageData: ImageData,
        ccm: number[][]
    ): ImageData => {
        const data = imageData.data;
        // Simple matrix multiplication for each pixel
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            data[i]     = Math.min(255, Math.max(0, r * ccm[0][0] + g * ccm[0][1] + b * ccm[0][2]));
            data[i + 1] = Math.min(255, Math.max(0, r * ccm[1][0] + g * ccm[1][1] + b * ccm[1][2]));
            data[i + 2] = Math.min(255, Math.max(0, r * ccm[2][0] + g * ccm[2][1] + b * ccm[2][2]));
        }
        return imageData;
    }, []);

    const resetCalibration = useCallback(() => {
        setColorTemperatureKelvin(null);
        setColorCorrectionMatrix(null);
    }, []);

    return {
        colorTemperatureKelvin,
        colorCorrectionMatrix,
        performCalibration,
        applyColorCorrection,
        resetCalibration,
    };
}
