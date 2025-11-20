import React, { useRef, useState } from "react";
import ImageTracer from "imagetracerjs";

export default function VectorizePage() {
  const [svg, setSvg] = useState(null);
  const [cleanedDataUrl, setCleanedDataUrl] = useState(null);
  const [status, setStatus] = useState("");
  const [sharpness, setSharpness] = useState(1); // Slider value for sharpness
  const inputRef = useRef(null);
  const canvasRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("Loading image...");
    const img = await loadImageFromFile(file);
    const maxDim = 1600;
    const { canvas, ctx } = drawImageToCanvas(img, maxDim);
    canvasRef.current = canvas;

    setStatus("Converting to grayscale and thresholding...");
    let imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let gray = rgbaToGrayscale(imgData);

    // Apply sharpening filter based on slider value
    if (sharpness > 1) {
      gray = applySharpen(gray, canvas.width, canvas.height, sharpness);
    }

    const thresh = adaptiveThreshold(gray, canvas.width, canvas.height, 15, 7);

    setStatus("Removing small components (noise)...");
    const cleaned = removeSmallComponents(thresh, canvas.width, canvas.height, 150);

    const cleanedCanvas = document.createElement("canvas");
    cleanedCanvas.width = canvas.width;
    cleanedCanvas.height = canvas.height;
    const cc = cleanedCanvas.getContext("2d");
    const cleanedImageData = cc.createImageData(cleanedCanvas.width, cleanedCanvas.height);
    for (let i = 0; i < cleaned.length; i++) {
      const v = cleaned[i] ? 0 : 255;
      const idx = i * 4;
      cleanedImageData.data[idx] = v;
      cleanedImageData.data[idx + 1] = v;
      cleanedImageData.data[idx + 2] = v;
      cleanedImageData.data[idx + 3] = 255;
    }
    cc.putImageData(cleanedImageData, 0, 0);

    setCleanedDataUrl(cleanedCanvas.toDataURL("image/png"));

    setStatus("Vectorizing to SVG (this can take a few seconds)...");
    const options = {
      scale: 1,
      ltres: 1,
      qtres: 1,
      pathomit: 8,
      rightangleenhance: true,
      strokewidth: 0,
      numberofcolors: 2,
      colorquantcycles: 1,
      blurradius: 0,
    };

    const dataUrl = cleanedCanvas.toDataURL();
    ImageTracer.imageToSVG(dataUrl, (generatedSVG) => {
      setSvg(generatedSVG);
      setStatus("Done. Download or preview SVG below.");
    }, options);
  }

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

  function drawImageToCanvas(img, maxDim = 1600) {
    const ratio = Math.max(img.width, img.height) / maxDim;
    const w = ratio > 1 ? Math.round(img.width / ratio) : img.width;
    const h = ratio > 1 ? Math.round(img.height / ratio) : img.height;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    return { canvas, ctx };
  }

  function rgbaToGrayscale(imgData) {
    const w = imgData.width;
    const h = imgData.height;
    const out = new Uint8ClampedArray(w * h);
    const d = imgData.data;
    for (let i = 0, j = 0; i < d.length; i += 4, j++) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      out[j] = (0.299 * r + 0.587 * g + 0.114 * b) | 0;
    }
    return out;
  }

  // Sharpen filter (simple convolution)
  function applySharpen(gray, width, height, amount = 1) {
    const kernel = [
      0, -1 * amount, 0,
      -1 * amount, 4 * amount + 1, -1 * amount,
      0, -1 * amount, 0
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
        out[y * width + x] = Math.min(255, Math.max(0, sum));
      }
    }
    // Copy border pixels
    for (let x = 0; x < width; x++) {
      out[x] = gray[x];
      out[(height - 1) * width + x] = gray[(height - 1) * width + x];
    }
    for (let y = 0; y < height; y++) {
      out[y * width] = gray[y * width];
      out[y * width + (width - 1)] = gray[y * width + (width - 1)];
    }
    return out;
  }

  function adaptiveThreshold(gray, width, height, blockSize = 15, C = 7) {
    const out = new Uint8ClampedArray(width * height);
    const half = Math.floor(blockSize / 2);
    const integral = new Uint32Array((width + 1) * (height + 1));
    for (let y = 0; y < height; y++) {
      let rowSum = 0;
      for (let x = 0; x < width; x++) {
        rowSum += gray[y * width + x];
        integral[(y + 1) * (width + 1) + (x + 1)] = integral[y * (width + 1) + (x + 1)] + rowSum;
      }
    }
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const x1 = Math.max(0, x - half);
        const y1 = Math.max(0, y - half);
        const x2 = Math.min(width - 1, x + half);
        const y2 = Math.min(height - 1, y + half);
        const area = (x2 - x1 + 1) * (y2 - y1 + 1);
        const sum = integral[(y2 + 1) * (width + 1) + (x2 + 1)] - integral[(y1) * (width + 1) + (x2 + 1)] - integral[(y2 + 1) * (width + 1) + (x1)] + integral[(y1) * (width + 1) + (x1)];
        const mean = sum / area;
        const val = gray[y * width + x] * 1.0;
        out[y * width + x] = val < mean - C ? 1 : 0;
      }
    }
    return out;
  }

  function removeSmallComponents(bin, width, height, minArea = 100) {
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
            if (bin[nidx]) {
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
        if (!bin[idx]) {
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

  function downloadSvg() {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vectorized.svg';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function downloadCleanedPng() {
    if (!cleanedDataUrl) return;
    const a = document.createElement('a');
    a.href = cleanedDataUrl;
    a.download = 'cleaned.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center gap-6">
      <div className="w-full max-w-4xl bg-white p-6 rounded-2xl shadow">
        <h1 className="text-2xl font-bold mb-2">Image → Cricut-ready SVG</h1>
        <p className="text-sm text-gray-600 mb-4">Upload an image and this tool will remove tiny filled spots and vectorize shapes into a bold SVG suitable for cutting.</p>

        <div className="flex gap-3 items-center mb-4">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="border rounded px-3 py-2"
          />
          <button
            onClick={() => { if (inputRef.current) inputRef.current.value = null; setSvg(null); setCleanedDataUrl(null); setStatus(''); }}
            className="px-3 py-2 rounded bg-gray-100"
          >Reset</button>
        </div>

        {/* Sharpness slider */}
        <div className="flex items-center gap-4 mb-4">
          <label htmlFor="sharpness" className="text-sm font-medium text-gray-700">Image Sharpness:</label>
          <input
            id="sharpness"
            type="range"
            min={1}
            max={5}
            step={1}
            value={sharpness}
            onChange={e => setSharpness(Number(e.target.value))}
            className="w-40 accent-blue-600"
          />
          <span className="text-sm text-gray-600">{sharpness}</span>
        </div>

        <div className="mt-4">
          <div className="text-sm text-gray-700">Status: {status}</div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 border rounded">
            <div className="font-medium mb-2">Cleaned Preview (PNG)</div>
            {cleanedDataUrl ? (
              <img src={cleanedDataUrl} alt="cleaned" style={{ maxWidth: '100%' }} />
            ) : (
              <div className="text-sm text-gray-500">No cleaned preview yet.</div>
            )}
            <div className="mt-3 flex gap-2">
              <button onClick={downloadCleanedPng} className="px-3 py-2 bg-blue-600 text-white rounded">Download PNG</button>
            </div>
          </div>

          <div className="p-3 border rounded">
            <div className="font-medium mb-2">SVG Output</div>
            {svg ? (
              <div>
                <div dangerouslySetInnerHTML={{ __html: svg }} style={{ maxHeight: 360, overflow: 'auto', background: '#fff' }} />
                <div className="mt-3 flex gap-2">
                  <button onClick={downloadSvg} className="px-3 py-2 bg-green-600 text-white rounded">Download SVG</button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">No SVG generated yet.</div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl text-xs text-gray-500">
        Tip: If small dots persist, increase the <code>minArea</code> parameter in the code where removeSmallComponents is called.
      </div>
    </div>
  );
}