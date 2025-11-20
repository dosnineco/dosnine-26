import React, { useRef, useState, useEffect, useCallback } from "react";
// Ensure imagetracerjs is installed: npm install imagetracerjs
import ImageTracer from "imagetracerjs";

// A state variable to hold the original image data once loaded
// This is intentionally outside the component to prevent re-creation on every render
let originalImgData = null;

export default function VectorizePage() {
  const [svg, setSvg] = useState(null);
  const [cleanedDataUrl, setCleanedDataUrl] = useState(null);
  const [status, setStatus] = useState("");
  const [fileLoaded, setFileLoaded] = useState(false);

  // OPTIMIZED DEFAULTS FOR TEXT PROTECTION AND AGGRESSIVE VECTOR SIMPLIFICATION
  const [options, setOptions] = useState({
    sharpness: 1,
    minArea: 150, // REDUCED: Protects fine text from being removed as noise
    fattenAmount: 2, // Default to close thin gaps. Adjust up to thicken lines.
    invertColors: false,
    removeBackground: true,
  });

  const inputRef = useRef(null);

  // Helper to deep copy originalImgData for processing
  const getOriginalData = () => {
    if (!originalImgData) return null;
    return {
      imgData: new ImageData(
        new Uint8ClampedArray(originalImgData.imgData.data),
        originalImgData.imgData.width,
        originalImgData.imgData.height
      ),
      width: originalImgData.width,
      height: originalImgData.height,
    };
  };

  /**
   * Main image processing and vectorization logic.
   * Runs on file load AND option changes.
   */
  const applyProcessing = useCallback(async () => {
    if (!fileLoaded || !originalImgData) {
      setCleanedDataUrl(null);
      setSvg(null);
      return;
    }

    const { imgData, width, height } = getOriginalData();
    setStatus("Preprocessing image...");

    let gray = rgbaToGrayscale(imgData);

    // 1. Sharpening
    if (options.sharpness > 1) {
      gray = applySharpen(gray, width, height, options.sharpness);
    }

    // 2. Adaptive Thresholding (Creates a black/white binary image)
    // blockSize (15), C (7). C defines how much darker a pixel needs to be than its local mean.
    const thresh = adaptiveThreshold(gray, width, height, 15, 7);

    // 3. Fattening (Dilation) - CRITICAL FOR CLOSING PATHS AND THICKNESS
    let processed = thresh;
    if (options.fattenAmount > 0) {
      setStatus(`Fattening image by ${options.fattenAmount}px...`);
      for (let i = 0; i < options.fattenAmount; i++) {
        // Radius of 1 per iteration
        processed = applyDilation(processed, width, height, 1);
      }
    }

    // 4. Noise/Small Component Removal (Noise Filter)
    // Using a lower minArea to protect fine text details
    setStatus(`Cleaning noise (min area: ${options.minArea})...`);
    const cleaned = removeSmallComponents(
      processed,
      width,
      height,
      options.minArea
    );

    // 5. Inversion (Invert black/white)
    const finalBinary = options.invertColors
      ? cleaned.map((v) => (v ? 0 : 1))
      : cleaned;

    // 6. Create cleaned canvas (with transparency preserved)
    const cleanedCanvas = document.createElement("canvas");
    cleanedCanvas.width = width;
    cleanedCanvas.height = height;
    const cc = cleanedCanvas.getContext("2d");
    const cleanedImageData = cc.createImageData(width, height);

    for (let i = 0; i < finalBinary.length; i++) {
      const isForeground = finalBinary[i] === 1; // 1 is foreground (black/cut area)

      const colorValue = isForeground ? 0 : 255;
      const alpha = isForeground ? 255 : (options.removeBackground ? 0 : 255);

      const idx = i * 4;
      cleanedImageData.data[idx] = colorValue;
      cleanedImageData.data[idx + 1] = colorValue;
      cleanedImageData.data[idx + 2] = colorValue;
      cleanedImageData.data[idx + 3] = alpha;
    }

    cc.putImageData(cleanedImageData, 0, 0);
    setCleanedDataUrl(cleanedCanvas.toDataURL("image/png"));

    // 7. Vectorization - CRITICALLY TUNED FOR CLEAN, FAST CUTS
    setStatus("Vectorizing (paths are being aggressively simplified)...");
    const tracerOptions = {
      scale: 1,
      ltres: 7, // INCREASED: Higher tolerance for smoother straight lines and curves
      qtres: 1,
      pathomit: 300, // INCREASED: Ignores more tiny, jittery paths for a much cleaner cut.
      rightangleenhance: true,
      strokewidth: 0,
      numberofcolors: 2,
      colorquantcycles: 2,
      blurradius: 0,
      blurdelta: 20,
    };

    const dataUrl = cleanedCanvas.toDataURL();
    ImageTracer.imageToSVG(
      dataUrl,
      (generatedSVG) => {
        setSvg(generatedSVG);
        setStatus("Done. Download your clean SVG below.");
      },
      tracerOptions
    );
  }, [options, fileLoaded]);

  // UseEffect to trigger processing when options change
  useEffect(() => {
    // Debounce the processing to prevent running too frequently while a slider is being dragged
    const timeoutId = setTimeout(() => {
      applyProcessing();
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [options, applyProcessing]);

  // Handle file load (only runs once per file upload)
  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (file && (file.type === "image/jpeg" || file.type === "image/jpg")) {
      setStatus("Warning: JPEG files may cause rough edges and noise. PNG is highly recommended.");
    }

    if (!file) {
      setFileLoaded(false);
      originalImgData = null;
      setCleanedDataUrl(null);
      setSvg(null);
      return;
    }
    setFileLoaded(false);
    setStatus("Loading image...");

    try {
      const img = await loadImageFromFile(file);
      const maxDim = 1600;
      const { ctx, width, height } = drawImageToCanvas(img, maxDim);

      originalImgData = {
        imgData: ctx.getImageData(0, 0, width, height),
        width,
        height,
      };

      setFileLoaded(true);
    } catch (error) {
      setStatus(`Error loading image: ${error.message}`);
      originalImgData = null;
      setFileLoaded(false);
    }
  }

  const handleOptionChange = (name, value) => {
    setOptions((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // --- Utility functions (Image Processing and Helpers) ---

  /**
   * Applies a Dilation (fattening) morphological operation.
   * @param {Uint8Array} bin - Binary image (0 or 1).
   * @param {number} width
   * @param {number} height
   * @param {number} radius
   * @returns {Uint8Array} The dilated image.
   */
  function applyDilation(bin, width, height, radius = 1) {
    if (radius < 1) return bin;
    const out = new Uint8Array(width * height);
    const kernelRadius = Math.floor(radius);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let isForeground = false;
        for (let dy = -kernelRadius; dy <= kernelRadius; dy++) {
          for (let dx = -kernelRadius; dx <= kernelRadius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nidx = ny * width + nx;
              if (bin[nidx] === 1) {
                isForeground = true;
                break;
              }
            }
          }
          if (isForeground) break;
        }
        out[y * width + x] = isForeground ? 1 : 0;
      }
    }
    return out;
  }

  /**
   * Removes small connected components (noise/speckles) from a binary image.
   * Uses flood fill for component identification.
   * @param {Uint8Array} bin - Binary image (0 or 1).
   * @param {number} width
   * @param {number} height
   * @param {number} minArea - Components smaller than this area will be removed.
   * @returns {Uint8Array} The cleaned binary image.
   */
  function removeSmallComponents(bin, width, height, minArea = 150) {
    const visited = new Uint8Array(width * height);
    const out = new Uint8Array(width * height);
    for (let i = 0; i < bin.length; i++) out[i] = bin[i];

    function floodFill(startIdx) {
      const stack = [startIdx];
      const comp = [];
      visited[startIdx] = 1;
      while (stack.length) {
        const idx = stack.pop();
        comp.push(idx);
        const x = idx % width;
        const y = Math.floor(idx / width);

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;

            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

            const nidx = ny * width + nx;
            if (visited[nidx]) continue;

            if (bin[nidx] === 1) {
              visited[nidx] = 1;
              stack.push(nidx);
            }
          }
        }
      }
      return comp;
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (visited[idx]) continue;

        if (bin[idx] === 0) {
          visited[idx] = 1;
          continue;
        }

        const comp = floodFill(idx);
        if (comp.length < minArea) {
          for (const p of comp) out[p] = 0;
        }
      }
    }
    return out;
  }

  /**
   * Loads an Image object from a File object.
   * @param {File} file
   * @returns {Promise<HTMLImageElement>}
   */
  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = (err) => reject(err);
      img.src = url;
    });
  }

  /**
   * Draws an image onto a canvas, scaling it down if it exceeds maxDim.
   * @param {HTMLImageElement} img
   * @param {number} maxDim
   * @returns {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, width: number, height: number}}
   */
  function drawImageToCanvas(img, maxDim = 1600) {
    const ratio = Math.max(img.width, img.height) / maxDim;
    const w = ratio > 1 ? Math.round(img.width / ratio) : img.width;
    const h = ratio > 1 ? Math.round(img.height / ratio) : img.height;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    return { canvas, ctx, width: w, height: h };
  }

  /**
   * Converts RGBA image data to a grayscale array using luminosity method.
   * @param {ImageData} imgData
   * @returns {Uint8ClampedArray} Grayscale values (0-255).
   */
  function rgbaToGrayscale(imgData) {
    const w = imgData.width;
    const h = imgData.height;
    const out = new Uint8ClampedArray(w * h);
    const d = imgData.data;
    for (let i = 0, j = 0; i < d.length; i += 4, j++) {
      const r = d[i],
        g = d[i + 1],
        b = d[i + 2];
      // Luminosity method for better grayscale
      out[j] = (0.299 * r + 0.587 * g + 0.114 * b) | 0;
    }
    return out;
  }

  /**
   * Applies a basic sharpening convolution filter.
   * @param {Uint8ClampedArray} gray - Grayscale image data.
   * @param {number} width
   * @param {number} height
   * @param {number} amount - Sharpening strength.
   * @returns {Uint8ClampedArray} The sharpened grayscale image.
   */
  function applySharpen(gray, width, height, amount = 1) {
    // Sharpening kernel (simplified Laplace filter)
    const kernel = [
      0,
      -1 * amount,
      0,
      -1 * amount,
      4 * amount + 1, // Center pixel is weighted more for original detail
      -1 * amount,
      0,
      -1 * amount,
      0,
    ];
    const out = new Uint8ClampedArray(width * height);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const px = x + kx;
            const py = y + ky;
            const idx = py * width + px;
            const kidx = (ky + 1) * 3 + (kx + 1);
            sum += gray[idx] * kernel[kidx];
          }
        }
        // Clamp the result to be within 0-255
        out[y * width + x] = Math.min(255, Math.max(0, sum));
      }
    }
    return out;
  }

  /**
   * Performs adaptive thresholding using integral image for local mean calculation.
   * @param {Uint8ClampedArray} gray - Grayscale image data.
   * @param {number} width
   * @param {number} height
   * @param {number} blockSize - Size of the local neighborhood (must be odd).
   * @param {number} C - Constant to subtract from the local mean (controls sensitivity).
   * @returns {Uint8ClampedArray} Binary image (1 for foreground, 0 for background).
   */
  function adaptiveThreshold(gray, width, height, blockSize = 15, C = 7) {
    const out = new Uint8ClampedArray(width * height);
    const half = Math.floor(blockSize / 2);
    // Integral image is one pixel larger in both dimensions
    const integral = new Uint32Array((width + 1) * (height + 1));
    // Calculate integral image for fast local summation
    for (let y = 0; y < height; y++) {
      let rowSum = 0;
      for (let x = 0; x < width; x++) {
        rowSum += gray[y * width + x];
        integral[(y + 1) * (width + 1) + (x + 1)] =
          integral[y * (width + 1) + (x + 1)] + rowSum;
      }
    }

    // Apply adaptive threshold
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Calculate the neighborhood boundaries (clamped to image borders)
        const x1 = Math.max(0, x - half);
        const y1 = Math.max(0, y - half);
        const x2 = Math.min(width - 1, x + half);
        const y2 = Math.min(height - 1, y + half);

        const area = (x2 - x1 + 1) * (y2 - y1 + 1);

        // Fast sum calculation using the integral image
        const sum =
          integral[(y2 + 1) * (width + 1) + (x2 + 1)] -
          integral[y1 * (width + 1) + (x2 + 1)] -
          integral[(y2 + 1) * (width + 1) + x1] +
          integral[y1 * (width + 1) + x1];

        const mean = sum / area;

        // Thresholding: pixel is foreground (1) if it's significantly darker than the local mean
        out[y * width + x] = gray[y * width + x] < mean - C ? 1 : 0;
      }
    }
    return out;
  }


  function downloadSvg() {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vectorized.svg";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function downloadCleanedPng() {
    if (!cleanedDataUrl) return;
    const a = document.createElement("a");
    a.href = cleanedDataUrl;
    a.download = "cleaned.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center gap-6">
      <div className="w-full max-w-4xl bg-white p-6 rounded-2xl shadow">
        <h1 className="text-2xl font-bold mb-2">Cricut Vector Cleaner 🔪 (High-Efficiency Paths)</h1>
        <p className="text-sm text-gray-600 mb-4">
          **New Strategy:** The text protection (`minArea` is low) is higher, and the **path smoothing is extreme** (`ltres`/`pathomit` increased) for the fastest, cleanest cut.
        </p>

        <div className="flex gap-3 items-center mb-4">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="border rounded px-3 py-2"
          />
          <button
            onClick={() => {
              if (inputRef.current) inputRef.current.value = null;
              setSvg(null);
              setCleanedDataUrl(null);
              setStatus("");
              originalImgData = null;
              setFileLoaded(false);
              setOptions({
                sharpness: 1,
                minArea: 150,
                fattenAmount: 2,
                invertColors: false,
                removeBackground: true,
              });
            }}
            className="px-3 py-2 rounded bg-gray-100"
          >
            Reset
          </button>
        </div>

        {/* Controls */}
        {fileLoaded && (
          <div className="flex flex-col gap-4 mb-4 p-4 border-2 border-green-300 rounded-lg bg-green-50">
            <h2 className="text-lg font-bold text-green-700 mb-2">
              Optimization Controls (Real-time Preview)
            </h2>

            {/* Fatten (Dilation) - KEY FOR CLOSING GAPS */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 w-40">
                ⭐ **Fatten Image (Dilation):**
              </label>
              <input
                type="range"
                min={0}
                max={5}
                step={1}
                value={options.fattenAmount}
                onChange={(e) => handleOptionChange("fattenAmount", Number(e.target.value))}
                className="w-40 accent-green-600"
              />
              <span className="text-sm text-gray-600">
                {options.fattenAmount}px (Use to close thin gaps and thicken text)
              </span>
            </div>

            {/* Noise Filter (Min Area) - KEY FOR DOT REMOVAL */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 w-40">
                ⭐ **Noise Filter (Min Area):**
              </label>
              <input
                type="number"
                min={1}
                max={2000}
                value={options.minArea}
                onChange={(e) => handleOptionChange("minArea", Number(e.target.value))}
                className="w-24 border rounded px-2 py-1 text-sm"
              />
              <span className="text-sm text-gray-600">
                pixels (**Reduce** if text disappears, **Increase** if large dots remain)
              </span>
            </div>

            <hr className="my-1 border-gray-300" />

            {/* Sharpness */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 w-40">
                Sharpening:
              </label>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={options.sharpness}
                onChange={(e) => handleOptionChange("sharpness", Number(e.target.value))}
                className="w-40 accent-blue-600"
              />
              <span className="text-sm text-gray-600">{options.sharpness}</span>
            </div>

            {/* Remove Background Checkbox */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 w-40">
                Remove Background:
              </label>
              <input
                type="checkbox"
                checked={options.removeBackground}
                onChange={(e) => handleOptionChange("removeBackground", e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <span className="text-xs text-gray-500">
                Turns background **transparent** (Recommended)
              </span>
            </div>

            {/* Invert Colors Checkbox */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 w-40">
                Invert Colors:
              </label>
              <input
                type="checkbox"
                checked={options.invertColors}
                onChange={(e) => handleOptionChange("invertColors", e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <span className="text-xs text-gray-500">
                Swaps black (cut) and white (uncut) areas
              </span>
            </div>
          </div>
        )}

        <div className="mt-4">
          <div className="text-sm text-gray-700">Status: {status}</div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 border rounded">
            <div className="font-medium mb-2">Cleaned Preview (PNG)</div>
            {cleanedDataUrl ? (
              <img
                src={cleanedDataUrl}
                alt="cleaned"
                style={{
                  maxWidth: "100%",
                  maxHeight: "360px",
                  objectFit: "contain",
                  // Checkerboard background for transparency
                  backgroundImage: options.removeBackground
                    ? "repeating-linear-gradient(45deg, #f0f0f0 25%, transparent 25%, transparent 75%, #f0f0f0 75%, #f0f0f0), repeating-linear-gradient(45deg, #f0f0f0 25%, #ffffff 25%, #ffffff 75%, #f0f0f0 75%, #f0f0f0)"
                    : "white",
                  backgroundSize: "20px 20px",
                  backgroundPosition: "0 0, 10px 10px",
                  border: "1px solid #ccc",
                }}
              />
            ) : (
              <div className="text-sm text-gray-500">No image loaded.</div>
            )}
            <div className="mt-3 flex gap-2">
              <button
                onClick={downloadCleanedPng}
                disabled={!cleanedDataUrl}
                className="px-3 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
              >
                Download PNG
              </button>
            </div>
          </div>

          <div className="p-3 border rounded">
            <div className="font-medium mb-2">SVG Output (Simplified Paths)</div>
            {svg ? (
              <div>
                <div
                  // This is safe because ImageTracer generates SVG, not user input
                  dangerouslySetInnerHTML={{ __html: svg }}
                  style={{
                    maxHeight: 360,
                    overflow: "auto",
                    padding: "8px",
                    border: "1px solid #ccc",
                    background: options.removeBackground ? "#eee" : "#fff",
                  }}
                />
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={downloadSvg}
                    className="px-3 py-2 bg-green-600 text-white rounded"
                  >
                    Download SVG
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">No SVG generated yet.</div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl text-xs text-gray-500">
        **Guidance:** If you see any remaining *large* noise clusters, **increase the Noise Filter (Min Area)** slightly until they disappear, being careful not to delete text. The output SVG is now highly simplified for efficient machine cutting.
      </div>
    </div>
  );
}