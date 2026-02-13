import { useRouter } from 'next/router';
import { useUser } from '@clerk/nextjs';
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/AdminLayout';
import { FiPackage, FiCheck, FiX, FiClock, FiZap, FiExternalLink, FiImage, FiDownload, FiAlertCircle } from 'react-icons/fi';

export default function AdminHTVOrders() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [showLogoTool, setShowLogoTool] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [editMethod, setEditMethod] = useState('blend-if');
  const [blendIfMin, setBlendIfMin] = useState(0);
  const [blendIfMax, setBlendIfMax] = useState(128);
  const [colorThreshold, setColorThreshold] = useState(200);
  const [levelsBlack, setLevelsBlack] = useState(0);
  const [levelsWhite, setLevelsWhite] = useState(255);
  const [blurAmount, setBlurAmount] = useState(0);
  const [denoiseStrength, setDenoiseStrength] = useState(0);
  const [minClusterSize, setMinClusterSize] = useState(0);
  const [medianFilter, setMedianFilter] = useState(false);
  const [erosion, setErosion] = useState(0);
  const [dilation, setDilation] = useState(0);
  const [contrast, setContrast] = useState(1.0);
  const [invertColors, setInvertColors] = useState(false);
  const [removeBackground, setRemoveBackground] = useState(true);
  const [textHighlight, setTextHighlight] = useState(0);
  const [sharpenText, setSharpenText] = useState(1);
  const canvasRef = useRef(null);
  const originalCanvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdatingStatus(orderId);
    try {
      const { error } = await supabase
        .from('htv_orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus, updated_at: new Date().toISOString() }
          : order
      ));
    } catch (err) {
      console.error('Status update error:', err);
      alert('Failed to update status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDelete = async (orderId) => {
    if (!confirm('Are you sure you want to delete this order? This cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('htv_orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.filter(o => o.id !== orderId));
      setTotalCount(prev => prev - 1);
      alert('Order deleted successfully');
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete order');
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setSelectedImage(img);
        // Store original in separate canvas
        const originalCanvas = originalCanvasRef.current;
        if (originalCanvas) {
          const ctx = originalCanvas.getContext('2d');
          originalCanvas.width = img.width;
          originalCanvas.height = img.height;
          ctx.drawImage(img, 0, 0);
        }
        processImage(img);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const processImage = (img = selectedImage) => {
    if (!img) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;

    // Draw original image
    ctx.drawImage(img, 0, 0);

    // Get image data
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;

    // Step 1: Contrast adjustment (helps separate signal from noise)
    if (contrast !== 1.0) {
      const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));
        data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128));
        data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128));
      }
    }

    // Step 2: Median filter (removes salt-and-pepper noise/grains)
    if (medianFilter) {
      const tempData = new Uint8ClampedArray(data);
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;
          
          // Get 3x3 neighborhood
          const rVals = [], gVals = [], bVals = [];
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nIdx = ((y + dy) * width + (x + dx)) * 4;
              rVals.push(tempData[nIdx]);
              gVals.push(tempData[nIdx + 1]);
              bVals.push(tempData[nIdx + 2]);
            }
          }
          
          // Get median values
          rVals.sort((a, b) => a - b);
          gVals.sort((a, b) => a - b);
          bVals.sort((a, b) => a - b);
          
          data[idx] = rVals[4];
          data[idx + 1] = gVals[4];
          data[idx + 2] = bVals[4];
        }
      }
    }

    // Step 3: Denoise (bilateral-style smoothing that preserves edges)
    if (denoiseStrength > 0) {
      const tempData = new Uint8ClampedArray(data);
      const radius = Math.ceil(denoiseStrength / 2);
      
      for (let y = radius; y < height - radius; y++) {
        for (let x = radius; x < width - radius; x++) {
          const idx = (y * width + x) * 4;
          const centerR = tempData[idx];
          const centerG = tempData[idx + 1];
          const centerB = tempData[idx + 2];
          
          let rSum = 0, gSum = 0, bSum = 0, weightSum = 0;
          
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const nIdx = ((y + dy) * width + (x + dx)) * 4;
              const nr = tempData[nIdx];
              const ng = tempData[nIdx + 1];
              const nb = tempData[nIdx + 2];
              
              // Color similarity weight
              const colorDiff = Math.abs(nr - centerR) + Math.abs(ng - centerG) + Math.abs(nb - centerB);
              const weight = Math.exp(-colorDiff / (denoiseStrength * 30));
              
              rSum += nr * weight;
              gSum += ng * weight;
              bSum += nb * weight;
              weightSum += weight;
            }
          }
          
          data[idx] = rSum / weightSum;
          data[idx + 1] = gSum / weightSum;
          data[idx + 2] = bSum / weightSum;
        }
      }
    }

    // Step 4: Apply main editing method
    if (editMethod === 'blend-if') {
      // Method 1: Blend If - Remove shadows and midtones
      for (let i = 0; i < data.length; i += 4) {
        const luminance = (data[i] + data[i + 1] + data[i + 2]) / 3;
        
        // Apply blend if logic with smooth transition
        if (luminance < blendIfMin) {
          // Below minimum - fully transparent
          data[i + 3] = 0;
        } else if (luminance < blendIfMax) {
          // Transition zone - gradual transparency
          const alpha = ((luminance - blendIfMin) / (blendIfMax - blendIfMin)) * 255;
          data[i + 3] = Math.min(data[i + 3], alpha);
        }
        // Above max - keep original alpha
      }
    } else if (editMethod === 'color-range') {
      // Method 2: Color Range - Keep only bright areas
      for (let i = 0; i < data.length; i += 4) {
        const luminance = (data[i] + data[i + 1] + data[i + 2]) / 3;
        
        if (luminance < colorThreshold) {
          // Below threshold - make transparent
          data[i + 3] = 0;
        }
      }
    } else if (editMethod === 'channels') {
      // Method 3: Channels - Levels adjustment for clean extraction
      for (let i = 0; i < data.length; i += 4) {
        const luminance = (data[i] + data[i + 1] + data[i + 2]) / 3;
        
        // Apply levels (crush blacks, boost whites)
        let adjusted = (luminance - levelsBlack) / (levelsWhite - levelsBlack) * 255;
        adjusted = Math.max(0, Math.min(255, adjusted));
        
        // Convert to pure black or white
        const value = adjusted > 128 ? 255 : 0;
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
        
        // Make white transparent, black opaque
        if (value === 255) {
          data[i + 3] = 0;
        } else {
          data[i + 3] = 255;
        }
      }
    }

    // Step 5: Erosion (removes small isolated pixels/grains)
    if (erosion > 0) {
      const tempData = new Uint8ClampedArray(data);
      for (let iter = 0; iter < erosion; iter++) {
        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            
            // Check if any neighbor is transparent
            let hasTransparentNeighbor = false;
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nIdx = ((y + dy) * width + (x + dx)) * 4;
                if (tempData[nIdx + 3] < 128) {
                  hasTransparentNeighbor = true;
                  break;
                }
              }
              if (hasTransparentNeighbor) break;
            }
            
            // If touching transparent area, make this pixel transparent too
            if (hasTransparentNeighbor && data[idx + 3] > 128) {
              data[idx + 3] = 0;
            }
          }
        }
      }
    }

    // Step 5b: Dilation (fattens image to close gaps and thicken text)
    if (dilation > 0) {
      const tempData = new Uint8ClampedArray(data);
      for (let iter = 0; iter < dilation; iter++) {
        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            
            // Check if any neighbor is opaque
            let hasOpaqueNeighbor = false;
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nIdx = ((y + dy) * width + (x + dx)) * 4;
                if (tempData[nIdx + 3] > 128) {
                  hasOpaqueNeighbor = true;
                  break;
                }
              }
              if (hasOpaqueNeighbor) break;
            }
            
            // If touching opaque area, make this pixel opaque too
            if (hasOpaqueNeighbor && data[idx + 3] < 128) {
              data[idx] = tempData[idx];
              data[idx + 1] = tempData[idx + 1];
              data[idx + 2] = tempData[idx + 2];
              data[idx + 3] = 255;
            }
          }
        }
      }
    }

    // Step 6: Remove small isolated clusters (despeckle)
    if (minClusterSize > 0) {
      const visited = new Uint8Array(width * height);
      
      const floodFill = (startX, startY) => {
        const stack = [[startX, startY]];
        const cluster = [];
        
        while (stack.length > 0) {
          const [x, y] = stack.pop();
          const idx = y * width + x;
          
          if (x < 0 || x >= width || y < 0 || y >= height) continue;
          if (visited[idx]) continue;
          
          const pixelIdx = idx * 4;
          if (data[pixelIdx + 3] < 128) continue; // Skip transparent
          
          visited[idx] = 1;
          cluster.push(idx);
          
          // Check 4-connected neighbors
          stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }
        
        return cluster;
      };
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          const pixelIdx = idx * 4;
          
          if (!visited[idx] && data[pixelIdx + 3] >= 128) {
            const cluster = floodFill(x, y);
            
            // If cluster is too small, remove it
            if (cluster.length < minClusterSize) {
              for (const cIdx of cluster) {
                data[cIdx * 4 + 3] = 0;
              }
            }
          }
        }
      }
    }

    // Step 7: Blur to smooth edges
    if (blurAmount > 0) {
      const tempData = new Uint8ClampedArray(data);
      const radius = blurAmount;
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let alphaSum = 0;
          let count = 0;
          
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const idx = (ny * width + nx) * 4;
                alphaSum += tempData[idx + 3];
                count++;
              }
            }
          }
          
          const idx = (y * width + x) * 4;
          data[idx + 3] = alphaSum / count;
        }
      }
    }

    // Step 8: Text Sharpening (enhance edges for crisp text)
    if (sharpenText > 0) {
      const tempData = new Uint8ClampedArray(data);
      const sharpenKernel = [
        [0, -1, 0],
        [-1, 5, 0],
        [0, -1, 0]
      ];
      
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;
          
          // Skip if transparent
          if (tempData[idx + 3] < 128) continue;
          
          let r = 0, g = 0, b = 0;
          
          for (let ky = 0; ky < 3; ky++) {
            for (let kx = 0; kx < 3; kx++) {
              const ny = y + ky - 1;
              const nx = x + kx - 1;
              const nIdx = (ny * width + nx) * 4;
              const k = sharpenKernel[ky][kx];
              
              r += tempData[nIdx] * k;
              g += tempData[nIdx + 1] * k;
              b += tempData[nIdx + 2] * k;
            }
          }
          
          // Apply sharpening with intensity
          const intensity = sharpenText / 10;
          data[idx] = Math.max(0, Math.min(255, tempData[idx] + (r * intensity)));
          data[idx + 1] = Math.max(0, Math.min(255, tempData[idx + 1] + (g * intensity)));
          data[idx + 2] = Math.max(0, Math.min(255, tempData[idx + 2] + (b * intensity)));
        }
      }
    }

    // Step 9: Text Highlighting (boost contrast on text areas)
    if (textHighlight > 0) {
      for (let i = 0; i < data.length; i += 4) {
        // Skip transparent pixels
        if (data[i + 3] < 128) continue;
        
        const luminance = (data[i] + data[i + 1] + data[i + 2]) / 3;
        
        // Detect edges (likely text) by checking variance in neighborhood
        const x = (i / 4) % width;
        const y = Math.floor((i / 4) / width);
        
        if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
          let variance = 0;
          let count = 0;
          
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nIdx = ((y + dy) * width + (x + dx)) * 4;
              const nLum = (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3;
              variance += Math.abs(luminance - nLum);
              count++;
            }
          }
          
          variance /= count;
          
          // If high variance (edge detected), boost contrast
          if (variance > 20) {
            const boost = 1 + (textHighlight / 10);
            const factor = (259 * (boost * 255 + 255)) / (255 * (259 - boost * 255));
            
            data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));
            data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128));
            data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128));
          }
        }
      }
    }

    // Step 10: Invert Colors
    if (invertColors) {
      for (let i = 0; i < data.length; i += 4) {
        // Only invert RGB, keep alpha as is
        data[i] = 255 - data[i];
        data[i + 1] = 255 - data[i + 1];
        data[i + 2] = 255 - data[i + 2];
      }
    }

    ctx.putImageData(imageData, 0, 0);
    setProcessedImage(canvas.toDataURL('image/png'));
  };

  // Auto-reprocess when parameters change
  useEffect(() => {
    if (selectedImage) {
      processImage();
    }
  }, [editMethod, blendIfMin, blendIfMax, colorThreshold, levelsBlack, levelsWhite, blurAmount, denoiseStrength, minClusterSize, medianFilter, erosion, dilation, contrast, removeBackground, invertColors, sharpenText]);

  const downloadProcessedImage = () => {
    if (!processedImage) return;
    
    const link = document.createElement('a');
    link.download = 'cricut-ready-logo.png';
    link.href = processedImage;
    link.click();
  };

  const resetImage = () => {
    setSelectedImage(null);
    setProcessedImage(null);
    setBlendIfMin(0);
    setBlendIfMax(128);
    setColorThreshold(200);
    setLevelsBlack(0);
    setLevelsWhite(255);
    setBlurAmount(0);
    setDenoiseStrength(0);
    setMinClusterSize(0);
    setMedianFilter(false);
    setErosion(0);
    setContrast(1.0);
  };

  useEffect(() => {
    if (!isLoaded) return;

    const checkAdminAndFetch = async () => {
      if (!user) {
        router.push('/');
        return;
      }

      try {
        // Check if user is admin
        const { data: userData } = await supabase
          .from('users')
          .select('role, email, full_name')
          .eq('clerk_id', user.id)
          .single();

        if (userData?.role !== 'admin') {
          router.push('/');
          return;
        }

        // Verify admin has valid data
        if (!userData.email || !userData.full_name) {
          console.error('❌ SECURITY: Admin user has NULL data');
          router.push('/');
          return;
        }

        // Fetch HTV orders
        const { data, count, error } = await supabase
          .from('htv_orders')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false });

        if (error) throw error;

        setOrders(data || []);
        setTotalCount(count || 0);
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAdminAndFetch();
  }, [isLoaded, user, router]);

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return styles[status] || styles.pending;
  };

  const calculateRevenue = () => {
    return orders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>HTV Orders - Admin Dashboard</title>
      </Head>

      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
                <AdminLayout/>


          {/* Stats Cards */}
          <div className="mb-6 grid gap-4 sm:grid-cols-4">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="text-sm font-medium text-gray-600">Total Orders</div>
              <div className="mt-2 text-3xl font-black text-black">{totalCount}</div>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="text-sm font-medium text-gray-600">Pending</div>
              <div className="mt-2 text-3xl font-black text-yellow-600">
                {orders.filter(o => o.status === 'pending').length}
              </div>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="text-sm font-medium text-gray-600">Completed</div>
              <div className="mt-2 text-3xl font-black text-green-600">
                {orders.filter(o => o.status === 'completed').length}
              </div>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="text-sm font-medium text-gray-600">Revenue (Completed)</div>
              <div className="mt-2 text-2xl font-black text-black">
                JMD {calculateRevenue().toLocaleString()}
              </div>
            </div>
          </div>

          {/* Logo Editor */}
          <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-black">🎨 Live Logo Editor for Cricut HTV</h2>
                <p className="text-sm text-gray-600">Real-time editing with 3 professional methods • Remove backgrounds, shadows & grains</p>
              </div>
              <button
                onClick={() => setShowLogoTool(!showLogoTool)}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white hover:bg-accent/90"
              >
                {showLogoTool ? 'Hide Editor' : 'Open Editor'}
              </button>
            </div>

            {showLogoTool && (
              <div className="space-y-6">
                {/* Guidelines */}
                <div className="rounded-lg bg-blue-50 p-4">
                  <div className="flex items-start gap-3">
                    <FiAlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                    <div className="text-sm">
                      <p className="font-bold text-blue-900">Cricut Explore 4 HTV Requirements:</p>
                      <ul className="mt-2 space-y-1 text-blue-800">
                        <li>• <strong>Format:</strong> Vector SVG (best) or high-res PNG (600+ DPI)</li>
                        <li>• <strong>Colors:</strong> Single solid color, no gradients or shadows</li>
                        <li>• <strong>Background:</strong> Transparent (removed)</li>
                        <li>• <strong>Text:</strong> Sharp edges, no anti-aliasing blur</li>
                        <li>• <strong>Style:</strong> Clean silhouette - black design on transparent background</li>
                      </ul>
                      <p className="mt-3 text-xs text-blue-700">
                        <strong>Pro Tip:</strong> For best results, use remove.bg or Photopea to remove backgrounds first, 
                        then use this tool to create high-contrast black silhouette.
                      </p>
                    </div>
                  </div>
                </div>

                {/* External Tools */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <a
                    href="https://www.remove.bg/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg bg-gray-100 p-4 hover:bg-gray-200"
                  >
                    <FiExternalLink className="h-5 w-5 text-gray-700" />
                    <div>
                      <div className="font-bold text-black">Remove.bg</div>
                      <div className="text-xs text-gray-600">AI background removal</div>
                    </div>
                  </a>
                  <a
                    href="https://www.photopea.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg bg-gray-100 p-4 hover:bg-gray-200"
                  >
                    <FiExternalLink className="h-5 w-5 text-gray-700" />
                    <div>
                      <div className="font-bold text-black">Photopea</div>
                      <div className="text-xs text-gray-600">Free Photoshop online</div>
                    </div>
                  </a>
                  <a
                    href="https://convertio.co/png-svg/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg bg-gray-100 p-4 hover:bg-gray-200"
                  >
                    <FiExternalLink className="h-5 w-5 text-gray-700" />
                    <div>
                      <div className="font-bold text-black">PNG to SVG</div>
                      <div className="text-xs text-gray-600">Convert to vector</div>
                    </div>
                  </a>
                </div>

                {/* Image Processor/Editor */}
                <div className="rounded-lg border-2 border-dashed border-gray-300 p-6">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  
                  {!selectedImage ? (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="mx-auto flex flex-col items-center gap-2 text-gray-600 hover:text-gray-800"
                    >
                      <FiImage className="h-12 w-12" />
                      <span className="font-medium">Upload Logo to Edit</span>
                      <span className="text-sm">Live editor with real-time adjustments</span>
                    </button>
                  ) : (
                    <div className="space-y-6">
                      {/* Method Selector */}
                      <div>
                        <label className="mb-2 block text-sm font-bold text-black">Editing Method:</label>
                        <div className="grid gap-2 sm:grid-cols-3">
                          <button
                            onClick={() => setEditMethod('blend-if')}
                            className={`rounded-lg px-4 py-3 text-sm font-bold transition ${
                              editMethod === 'blend-if'
                                ? 'bg-accent text-white'
                                : 'bg-gray-100 text-black hover:bg-gray-200'
                            }`}
                          >
                            ✅ Blend If
                            <div className="text-xs font-normal opacity-80">Recommended</div>
                          </button>
                          <button
                            onClick={() => setEditMethod('color-range')}
                            className={`rounded-lg px-4 py-3 text-sm font-bold transition ${
                              editMethod === 'color-range'
                                ? 'bg-accent text-white'
                                : 'bg-gray-100 text-black hover:bg-gray-200'
                            }`}
                          >
                            Color Range
                            <div className="text-xs font-normal opacity-80">More Control</div>
                          </button>
                          <button
                            onClick={() => setEditMethod('channels')}
                            className={`rounded-lg px-4 py-3 text-sm font-bold transition ${
                              editMethod === 'channels'
                                ? 'bg-accent text-white'
                                : 'bg-gray-100 text-black hover:bg-gray-200'
                            }`}
                          >
                            Channels
                            <div className="text-xs font-normal opacity-80">Best Quality</div>
                          </button>
                        </div>
                      </div>

                      {/* Quick Reference */}
                      <div className="rounded-lg bg-blue-50 p-4">
                        <p className="mb-2 text-xs font-bold text-blue-900">🧹 Grain Removal Guide:</p>
                        <div className="space-y-1 text-xs text-blue-800">
                          <div className="flex gap-2">
                            <span className="font-bold">1.</span>
                            <span><strong>Contrast Boost:</strong> Use first to make logo stand out from background noise</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="font-bold">2.</span>
                            <span><strong>Median Filter:</strong> Best for "salt & pepper" random pixel noise</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="font-bold">3.</span>
                            <span><strong>Denoise:</strong> Smart smoothing that preserves sharp edges</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="font-bold">4.</span>
                            <span><strong>Erosion:</strong> Removes tiny grains around edges</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="font-bold">5.</span>
                            <span><strong>Despeckle:</strong> Deletes isolated dots/clusters (use after others)</span>
                          </div>
                        </div>
                      </div>

                      {/* Controls based on method */}
                      <div className="rounded-lg bg-gray-50 p-4">
                        <h4 className="mb-3 text-sm font-bold text-black">Adjustments:</h4>
                        
                        {editMethod === 'blend-if' && (
                          <div className="space-y-4">
                            <div>
                              <label className="mb-2 flex items-center justify-between text-xs font-medium text-gray-700">
                                <span>Remove Shadows (Black Slider)</span>
                                <span className="font-mono text-black">{blendIfMin}</span>
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="255"
                                value={blendIfMin}
                                onChange={(e) => setBlendIfMin(Number(e.target.value))}
                                className="w-full"
                              />
                              <p className="mt-1 text-xs text-gray-500">
                                Drag right to remove dark areas and shadows
                              </p>
                            </div>
                            <div>
                              <label className="mb-2 flex items-center justify-between text-xs font-medium text-gray-700">
                                <span>Smooth Transition (Split Slider)</span>
                                <span className="font-mono text-black">{blendIfMax}</span>
                              </label>
                              <input
                                type="range"
                                min={blendIfMin}
                                max="255"
                                value={blendIfMax}
                                onChange={(e) => setBlendIfMax(Number(e.target.value))}
                                className="w-full"
                              />
                              <p className="mt-1 text-xs text-gray-500">
                                Creates gradient between black and white sliders
                              </p>
                            </div>
                          </div>
                        )}

                        {editMethod === 'color-range' && (
                          <div>
                            <label className="mb-2 flex items-center justify-between text-xs font-medium text-gray-700">
                              <span>Brightness Threshold (Fuzziness)</span>
                              <span className="font-mono text-black">{colorThreshold}</span>
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="255"
                              value={colorThreshold}
                              onChange={(e) => setColorThreshold(Number(e.target.value))}
                              className="w-full"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                              Only pixels brighter than this value will remain visible
                            </p>
                          </div>
                        )}

                        {editMethod === 'channels' && (
                          <div className="space-y-4">
                            <div>
                              <label className="mb-2 flex items-center justify-between text-xs font-medium text-gray-700">
                                <span>Crush Blacks (Black Point)</span>
                                <span className="font-mono text-black">{levelsBlack}</span>
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="200"
                                value={levelsBlack}
                                onChange={(e) => setLevelsBlack(Number(e.target.value))}
                                className="w-full"
                              />
                              <p className="mt-1 text-xs text-gray-500">
                                Push right to make darker areas pure black
                              </p>
                            </div>
                            <div>
                              <label className="mb-2 flex items-center justify-between text-xs font-medium text-gray-700">
                                <span>Boost Whites (White Point)</span>
                                <span className="font-mono text-black">{levelsWhite}</span>
                              </label>
                              <input
                                type="range"
                                min="55"
                                max="255"
                                value={levelsWhite}
                                onChange={(e) => setLevelsWhite(Number(e.target.value))}
                                className="w-full"
                              />
                              <p className="mt-1 text-xs text-gray-500">
                                Push left to make brighter areas pure white
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Grain Cleanup Section */}
                        <div className="mt-4 border-t border-gray-200 pt-4">
                          <div className="mb-3 flex items-center gap-2">
                            <span className="rounded bg-orange-600 px-2 py-1 text-xs font-bold text-white">GRAIN REMOVAL</span>
                            <span className="text-xs font-bold text-gray-700">Advanced Noise Cleanup</span>
                          </div>

                          <div className="space-y-4">
                            {/* Contrast */}
                            <div>
                              <label className="mb-2 flex items-center justify-between text-xs font-medium text-gray-700">
                                <span>Contrast Boost</span>
                                <span className="font-mono text-black">{contrast.toFixed(2)}x</span>
                              </label>
                              <input
                                type="range"
                                min="0.5"
                                max="2.5"
                                step="0.1"
                                value={contrast}
                                onChange={(e) => setContrast(Number(e.target.value))}
                                className="w-full"
                              />
                              <p className="mt-1 text-xs text-gray-500">
                                Increase contrast to separate logo from noise
                              </p>
                            </div>

                            {/* Median Filter Toggle */}
                            <div className="flex items-center justify-between rounded-lg bg-gray-100 p-3">
                              <div className="flex-1">
                                <label className="text-xs font-medium text-gray-700">
                                  Median Filter (Salt & Pepper Noise)
                                </label>
                                <p className="mt-0.5 text-xs text-gray-500">
                                  Removes random isolated pixels
                                </p>
                              </div>
                              <button
                                onClick={() => setMedianFilter(!medianFilter)}
                                className={`ml-3 rounded-lg px-4 py-2 text-xs font-bold transition ${
                                  medianFilter
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-300 text-gray-700'
                                }`}
                              >
                                {medianFilter ? 'ON' : 'OFF'}
                              </button>
                            </div>

                            {/* Denoise Strength */}
                            <div>
                              <label className="mb-2 flex items-center justify-between text-xs font-medium text-gray-700">
                                <span>Denoise Strength (Smart Smoothing)</span>
                                <span className="font-mono text-black">{denoiseStrength}</span>
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="10"
                                value={denoiseStrength}
                                onChange={(e) => setDenoiseStrength(Number(e.target.value))}
                                className="w-full"
                              />
                              <p className="mt-1 text-xs text-gray-500">
                                Bilateral filter that smooths noise while preserving edges
                              </p>
                            </div>

                            {/* Erosion */}
                            <div>
                              <label className="mb-2 flex items-center justify-between text-xs font-medium text-gray-700">
                                <span>Erosion Passes (Remove Edge Grains)</span>
                                <span className="font-mono text-black">{erosion}</span>
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="5"
                                value={erosion}
                                onChange={(e) => setErosion(Number(e.target.value))}
                                className="w-full"
                              />
                              <p className="mt-1 text-xs text-gray-500">
                                Shrinks edges to remove tiny noise pixels
                              </p>
                            </div>

                            {/* Min Cluster Size */}
                            <div>
                              <label className="mb-2 flex items-center justify-between text-xs font-medium text-gray-700">
                                <span>Remove Small Clusters (Despeckle)</span>
                                <span className="font-mono text-black">{minClusterSize} px</span>
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={minClusterSize}
                                onChange={(e) => setMinClusterSize(Number(e.target.value))}
                                className="w-full"
                              />
                              <p className="mt-1 text-xs text-gray-500">
                                Delete isolated pixel groups smaller than this size
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Optimization Controls */}
                        <div className="mt-4 border-t border-gray-200 pt-4">
                          <div className="mb-3 flex items-center gap-2">
                            <span className="rounded bg-purple-600 px-2 py-1 text-xs font-bold text-white">OPTIMIZATION</span>
                            <span className="text-xs font-bold text-gray-700">Real-time Preview</span>
                          </div>

                          <div className="space-y-4">
                            {/* Fatten Image (Dilation) */}
                            <div>
                              <label className="mb-2 flex items-center justify-between text-xs font-medium text-gray-700">
                                <span>⭐ <strong>Fatten Image (Dilation):</strong></span>
                                <span className="font-mono text-black">{dilation}px</span>
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="5"
                                value={dilation}
                                onChange={(e) => setDilation(Number(e.target.value))}
                                className="w-full"
                              />
                              <p className="mt-1 text-xs text-gray-500">
                                Use to close thin gaps and thicken text
                              </p>
                            </div>

                            {/* Noise Filter (Min Area) */}
                            <div>
                              <label className="mb-2 flex items-center justify-between text-xs font-medium text-gray-700">
                                <span>⭐ <strong>Noise Filter (Min Area):</strong></span>
                                <span className="font-mono text-black">{minClusterSize} pixels</span>
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="500"
                                step="10"
                                value={minClusterSize}
                                onChange={(e) => setMinClusterSize(Number(e.target.value))}
                                className="w-full"
                              />
                              <p className="mt-1 text-xs text-gray-500">
                                <strong>Reduce</strong> if text disappears, <strong>Increase</strong> if large dots remain
                              </p>
                            </div>

                            {/* Sharpening */}
                            <div>
                              <label className="mb-2 flex items-center justify-between text-xs font-medium text-gray-700">
                                <span><strong>Sharpening:</strong></span>
                                <span className="font-mono text-black">{sharpenText}</span>
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="5"
                                value={sharpenText}
                                onChange={(e) => setSharpenText(Number(e.target.value))}
                                className="w-full"
                              />
                              <p className="mt-1 text-xs text-gray-500">
                                Enhance edge crispness for sharper text
                              </p>
                            </div>

                            {/* Remove Background Toggle */}
                            <div className="flex items-center justify-between rounded-lg bg-gray-100 p-3">
                              <div className="flex-1">
                                <label className="text-xs font-medium text-gray-700">
                                  <strong>Remove Background:</strong>
                                </label>
                                <p className="mt-0.5 text-xs text-gray-500">
                                  Turns background <strong>transparent</strong> (Recommended)
                                </p>
                              </div>
                              <button
                                onClick={() => setRemoveBackground(!removeBackground)}
                                className={`ml-3 rounded-lg px-4 py-2 text-xs font-bold transition ${
                                  removeBackground
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-300 text-gray-700'
                                }`}
                              >
                                {removeBackground ? 'ON' : 'OFF'}
                              </button>
                            </div>

                            {/* Invert Colors Toggle */}
                            <div className="flex items-center justify-between rounded-lg bg-gray-100 p-3">
                              <div className="flex-1">
                                <label className="text-xs font-medium text-gray-700">
                                  <strong>Invert Colors:</strong>
                                </label>
                                <p className="mt-0.5 text-xs text-gray-500">
                                  Swaps black (cut) and white (uncut) areas
                                </p>
                              </div>
                              <button
                                onClick={() => setInvertColors(!invertColors)}
                                className={`ml-3 rounded-lg px-4 py-2 text-xs font-bold transition ${
                                  invertColors
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-300 text-gray-700'
                                }`}
                              >
                                {invertColors ? 'ON' : 'OFF'}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Universal Blur Control */}
                        <div className="mt-4 border-t border-gray-200 pt-4">
                          <label className="mb-2 flex items-center justify-between text-xs font-medium text-gray-700">
                            <span>Edge Smoothing (Gaussian Blur)</span>
                            <span className="font-mono text-black">{blurAmount}px</span>
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="5"
                            value={blurAmount}
                            onChange={(e) => setBlurAmount(Number(e.target.value))}
                            className="w-full"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Apply blur to mask edges for smoother transitions
                          </p>
                        </div>
                      </div>

                      {/* Preview */}
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <h3 className="mb-2 text-sm font-bold text-gray-700">Original</h3>
                          <img
                            src={selectedImage.src}
                            alt="Original"
                            className="w-full rounded-lg bg-gray-100"
                          />
                        </div>
                        <div>
                          <h3 className="mb-2 text-sm font-bold text-gray-700">
                            Live Preview
                            <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                              Real-time
                            </span>
                          </h3>
                          {processedImage && (
                            <img
                              src={processedImage}
                              alt="Processed"
                              className="w-full rounded-lg"
                              style={{ background: 'repeating-conic-gradient(#d1d5db 0% 25%, transparent 0% 50%) 50% / 20px 20px' }}
                            />
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={downloadProcessedImage}
                          className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-bold text-white hover:bg-green-700"
                        >
                          <FiDownload className="h-4 w-4" />
                          Download PNG
                        </button>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
                        >
                          Upload Different Image
                        </button>
                        <button
                          onClick={resetImage}
                          className="rounded-lg bg-gray-200 px-6 py-3 text-sm font-medium text-black hover:bg-gray-300"
                        >
                          Reset & Clear
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <canvas ref={canvasRef} className="hidden" />
                  <canvas ref={originalCanvasRef} className="hidden" />
                </div>

                {/* Instructions */}
                <div className="rounded-lg bg-gray-100 p-4 text-sm text-gray-700">
                  <p className="font-bold text-black">How to Use This Editor:</p>
                  <ol className="mt-2 space-y-1 pl-5" style={{ listStyleType: 'decimal' }}>
                    <li>Upload your logo image (JPG, PNG, etc.)</li>
                    <li>Choose editing method (Blend If recommended for most logos)</li>
                    <li>Adjust main method sliders to remove backgrounds and shadows</li>
                    <li><strong>Use Grain Removal tools</strong> to clean up noise, specks, and artifacts</li>
                    <li>Fine-tune with edge smoothing for perfect transitions</li>
                    <li>Download the Cricut-ready PNG with transparent background</li>
                  </ol>
                  <p className="mt-3 text-xs text-gray-600">
                    💡 <strong>Pro workflow:</strong> Start with Contrast → Median Filter → Denoise → Your editing method → Erosion → Despeckle → Blur
                  </p>
                  <p className="mt-2 text-xs text-gray-600">
                    ✨ This editor provides professional-grade grain removal that rivals Photopea - all in your browser with real-time preview!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Orders Table */}
          <div className="rounded-xl bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-700">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-700">
                      Business
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-700">
                      Contact
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-700">
                      Order Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-700">
                      Delivery
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-700">
                      Total
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-700">
                      Logo
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-700">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                        No orders yet
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(order.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                          <div className="text-xs text-gray-400">
                            {new Date(order.created_at).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-black">{order.business_name}</div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="text-black">{order.phone}</div>
                          {order.email && (
                            <div className="text-xs text-gray-500">{order.email}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="space-y-1">
                            <div>
                              <span className="font-medium text-black">Size:</span>{' '}
                              <span className="capitalize">{order.size}</span>
                            </div>
                            <div>
                              <span className="font-medium text-black">Color:</span>{' '}
                              <span className="capitalize">{order.color}</span>
                            </div>
                            <div>
                              <span className="font-medium text-black">Qty:</span> {order.quantity}
                            </div>
                            {order.rush_order && (
                              <div className="flex items-center gap-1 text-orange-600">
                                <FiZap className="h-3 w-3" />
                                <span className="text-xs font-bold">RUSH</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="text-black">{order.delivery_area}</div>
                          <div className="text-xs text-gray-500">
                            Fee: JMD {parseFloat(order.delivery_fee || 0).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-black">
                            JMD {parseFloat(order.total || 0).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            Subtotal: {parseFloat(order.subtotal || 0).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {order.logo_url && (
                            <a
                              href={order.logo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                            >
                              <FiExternalLink className="h-4 w-4" />
                              View
                            </a>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                            disabled={updatingStatus === order.id}
                            className={`rounded-lg px-3 py-1 text-sm font-medium ${getStatusBadge(
                              order.status
                            )}`}
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleDelete(order.id)}
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes Section */}
          {orders.some(o => o.notes) && (
            <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-black">Order Notes</h2>
              {orders
                .filter(o => o.notes)
                .map(order => (
                  <div key={order.id} className="mb-4 border-l-4 border-gray-300 pl-4">
                    <div className="text-sm font-medium text-black">{order.business_name}</div>
                    <div className="mt-1 text-sm text-gray-600">{order.notes}</div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
