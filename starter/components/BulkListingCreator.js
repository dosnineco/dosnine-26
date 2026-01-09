import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import { normalizeParish } from '../lib/normalizeParish';
import { sanitizeText, sanitizePrice, sanitizeNumber, sanitizePhone, sanitizeArea, validateImageFile, generateSafeSlug } from '../lib/sanitize';
import { Upload, X, Plus, Image as ImageIcon, MapPin, DollarSign, Home } from 'lucide-react';

const PARISHES = [
  'Kingston', 'St Andrew', 'St Catherine', 'St James', 'Clarendon',
  'Manchester', 'St Ann', 'Portland', 'St Thomas', 'St Elizabeth',
  'Trelawny', 'Hanover', 'Westmoreland', 'St Mary'
];

export default function BulkListingCreator() {
  const { user } = useUser();
  
  // Base listing template
  const [baseData, setBaseData] = useState({
    type: 'apartment',
    parish: '',
    listing_type: 'rent',
    description: 'Spacious unit located in {{area}}. {{bedrooms}} bedroom, {{bathrooms}} bathroom.',
    currency: 'JMD',
    phone_number: ''
  });

  // Variations (rows) - now includes bed/bath per row
  const [rows, setRows] = useState([
    { id: 1, area: '', bedrooms: '2', bathrooms: '1', price: '', notes: '' }
  ]);

  // Photos with preview
  const [photoData, setPhotoData] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  // Photo allocation mode: 'auto' or 'manual'
  const [allocationMode, setAllocationMode] = useState('auto');
  const [photosPerListing, setPhotosPerListing] = useState(5);

  const addRow = () => {
    setRows([...rows, { id: Date.now(), area: '', bedrooms: '2', bathrooms: '1', price: '', notes: '' }]);
  };

  const removeRow = (id) => {
    if (rows.length === 1) {
      toast.error('Need at least one listing');
      return;
    }
    setRows(rows.filter(r => r.id !== id));
  };

  const updateRow = (id, field, value) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate each file
    const validFiles = [];
    const errors = [];
    
    files.forEach(file => {
      const validation = validateImageFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        errors.push(validation.error);
      }
    });

    if (errors.length > 0) {
      toast.error(errors[0]); // Show first error
    }

    if (validFiles.length === 0) return;

    // Create preview data
    const newPhotoData = validFiles.map((file, idx) => ({
      id: Date.now() + idx,
      file,
      preview: URL.createObjectURL(file),
      listingIndex: null // Will be assigned later
    }));

    setPhotoData([...photoData, ...newPhotoData]);
    
    // Auto-assign if in auto mode
    if (allocationMode === 'auto') {
      autoAssignPhotos([...photoData, ...newPhotoData]);
    }
  };

  const autoAssignPhotos = (photos = photoData) => {
    const assigned = photos.map((photo, idx) => ({
      ...photo,
      listingIndex: Math.floor(idx / photosPerListing)
    }));
    setPhotoData(assigned);
  };

  const assignPhotoToListing = (photoId, listingIndex) => {
    setPhotoData(photoData.map(p => 
      p.id === photoId ? { ...p, listingIndex } : p
    ));
  };

  const removePhoto = (photoId) => {
    const photo = photoData.find(p => p.id === photoId);
    if (photo?.preview) {
      URL.revokeObjectURL(photo.preview);
    }
    setPhotoData(photoData.filter(p => p.id !== photoId));
  };

  const generateSlug = async (title) => {
    let slug = generateSafeSlug(title);

    // Check if slug exists
    const { data } = await supabase
      .from('properties')
      .select('slug')
      .eq('slug', slug)
      .single();

    if (data) {
      slug = `${slug}-${Date.now()}`;
    }

    return slug;
  };

  const uploadPhoto = async (file, propertyId, position) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${propertyId}/${Date.now()}-${position}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('property-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('property-images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const publishAll = async () => {
    if (!user) {
      toast.error('Must be signed in');
      return;
    }

    // Validate base data
    if (!baseData.parish) {
      toast.error('Select a parish');
      return;
    }

    // Validate rows
    const validRows = rows.filter(r => {
      const hasArea = sanitizeArea(r.area).trim().length > 0;
      const hasPrice = sanitizePrice(r.price) > 0;
      const hasBeds = sanitizeNumber(r.bedrooms, 0, 20) >= 0;
      const hasBaths = sanitizeNumber(r.bathrooms, 0, 20) >= 0;
      return hasArea && hasPrice && hasBeds !== null && hasBaths !== null;
    });

    if (validRows.length === 0) {
      toast.error('Add at least one listing with area, price, bedrooms, and bathrooms');
      return;
    }

    if (photoData.length === 0) {
      toast.error('Add photos');
      return;
    }

    // Check photo allocation
    const photosPerListingCheck = validRows.map((_, idx) => {
      const assigned = photoData.filter(p => p.listingIndex === idx);
      return assigned.length;
    });

    const hasUnassigned = photoData.some(p => p.listingIndex === null || p.listingIndex === undefined);
    if (hasUnassigned && allocationMode === 'manual') {
      toast.error('Assign all photos to listings or switch to auto mode');
      return;
    }

    const minPhotos = Math.min(...photosPerListingCheck.filter(n => n > 0));
    if (minPhotos === 0) {
      toast.error('All listings need at least one photo');
      return;
    }

    setUploading(true);

    try {
      // Get user record
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('clerk_id', user.id)
        .single();

      if (!userData) {
        throw new Error('User not found');
      }

      const ownerUuid = userData.id;
      const createdListings = [];

      // Process each row
      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        
        // Sanitize all inputs
        const sanitizedArea = sanitizeArea(row.area);
        const sanitizedPrice = sanitizePrice(row.price);
        const sanitizedBedrooms = sanitizeNumber(row.bedrooms, 0, 20);
        const sanitizedBathrooms = sanitizeNumber(row.bathrooms, 0, 20);
        const sanitizedNotes = sanitizeText(row.notes);
        
        // Build description from template
        let description = sanitizeText(baseData.description)
          .replace(/{{area}}/gi, sanitizedArea)
          .replace(/{{bedrooms}}/gi, String(sanitizedBedrooms))
          .replace(/{{bathrooms}}/gi, String(sanitizedBathrooms));

        if (sanitizedNotes) {
          description += `\n\n${sanitizedNotes}`;
        }

        // Generate title
        const typeLabel = baseData.type === 'apartment' ? 'Apartment' : 
                         baseData.type === 'house' ? 'House' : 
                         baseData.type === 'condo' ? 'Condo' :
                         baseData.type === 'land' ? 'Land' :
                         baseData.type === 'commercial' ? 'Commercial' :
                         baseData.type === 'villa' ? 'Villa' :
                         baseData.type === 'townhouse' ? 'Townhouse' : 'Property';
        
        const title = sanitizeText(`${sanitizedBedrooms} Bedroom ${typeLabel} - ${sanitizedArea}`);
        const slug = await generateSlug(title);

        // Insert property
        const { data: property, error: propErr } = await supabase
          .from('properties')
          .insert([{
            owner_id: ownerUuid,
            slug,
            title,
            description,
            parish: normalizeParish(baseData.parish),
            town: sanitizedArea,
            address: sanitizedArea,
            bedrooms: sanitizedBedrooms,
            bathrooms: sanitizedBathrooms,
            price: sanitizedPrice,
            currency: baseData.currency,
            type: baseData.type,
            status: 'available',
            phone_number: sanitizePhone(baseData.phone_number) || null
          }])
          .select()
          .single();

        if (propErr) throw propErr;

        // Upload photos for this listing
        const listingPhotos = photoData.filter(p => p.listingIndex === i);
        
        const imageUrls = [];
        for (let j = 0; j < listingPhotos.length; j++) {
          const url = await uploadPhoto(listingPhotos[j].file, property.id, j);
          imageUrls.push(url);
        }

        // Update property with image URLs
        await supabase
          .from('properties')
          .update({ image_urls: imageUrls })
          .eq('id', property.id);

        createdListings.push(property);
      }

      toast.success(`🎉 Published ${createdListings.length} listings!`);
      
      // Clean up photo previews
      photoData.forEach(p => URL.revokeObjectURL(p.preview));
      
      // Reset form
      setRows([{ id: Date.now(), area: '', bedrooms: '2', bathrooms: '1', price: '', notes: '' }]);
      setPhotoData([]);
      
      // Redirect after short delay
      setTimeout(() => {
        window.location.href = '/properties/my-listings';
      }, 2000);

    } catch (error) {
      console.error('Error publishing listings:', error);
      toast.error(error.message || 'Failed to publish');
    } finally {
      setUploading(false);
    }
  };

  // Auto-assign photos when mode or count changes
  useEffect(() => {
    if (allocationMode === 'auto' && photoData.length > 0) {
      autoAssignPhotos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photosPerListing, allocationMode]);

  return (
    <div className="max-w-6xl mx-auto p-4 pb-24">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Bulk Listing Creator</h1>
        <p className="text-gray-600">Create multiple property listings in one go</p>
      </div>

      {/* Base Listing */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
        <h2 className="font-bold text-lg mb-4">1. Base Listing Template</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Property Type</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent focus:border-transparent"
              value={baseData.type}
              onChange={(e) => setBaseData({ ...baseData, type: e.target.value })}
            >
              <option value="apartment">Apartment</option>
              <option value="house">House</option>
              <option value="condo">Condo</option>
              <option value="townhouse">Townhouse</option>
              <option value="commercial">Commercial</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Parish *</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent focus:border-transparent"
              value={baseData.parish}
              onChange={(e) => setBaseData({ ...baseData, parish: e.target.value })}
            >
              <option value="">Select Parish</option>
              {PARISHES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1 text-gray-700">Contact Phone (Optional)</label>
          <input
            type="tel"
            placeholder="876-XXX-XXXX"
            maxLength="20"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent focus:border-transparent"
            value={baseData.phone_number}
            onChange={(e) => setBaseData({ ...baseData, phone_number: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Description Template
            <span className="text-xs text-gray-500 ml-2">(Use {'{{area}}'}, {'{{bedrooms}}'}, {'{{bathrooms}}'})</span>
          </label>
          <textarea
            rows="3"
            maxLength="1000"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-transparent"
            value={baseData.description}
            onChange={(e) => setBaseData({ ...baseData, description: e.target.value })}
          ></textarea>
        </div>
      </div>

      {/* Variations Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Home className="w-5 h-5 text-accent" />
          <h2 className="font-bold text-lg">Property Variations</h2>
          <span className="text-sm text-gray-500">({rows.length} {rows.length === 1 ? 'listing' : 'listings'})</span>
        </div>
        
        <div className="space-y-4">
          {/* Mobile-friendly card layout for small screens, table for larger */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">#</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>Area/Town *</span>
                    </div>
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Beds</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Baths</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      <span>Price *</span>
                    </div>
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Notes</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2 text-gray-500 font-medium">{idx + 1}</td>
                    <td className="py-3 px-2">
                      <input
                        type="text"
                        placeholder="Portmore"
                        maxLength="100"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 min-w-[100px] focus:ring-2 focus:ring-accent focus:border-transparent"
                        value={row.area}
                        onChange={(e) => updateRow(row.id, 'area', e.target.value)}
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        placeholder="2"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 min-w-[60px] focus:ring-2 focus:ring-accent focus:border-transparent"
                        value={row.bedrooms}
                        onChange={(e) => updateRow(row.id, 'bedrooms', e.target.value)}
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        placeholder="1"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 min-w-[60px] focus:ring-2 focus:ring-accent focus:border-transparent"
                        value={row.bathrooms}
                        onChange={(e) => updateRow(row.id, 'bathrooms', e.target.value)}
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        min="0"
                        placeholder="120000"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 min-w-[100px] focus:ring-2 focus:ring-accent focus:border-transparent"
                        value={row.price}
                        onChange={(e) => updateRow(row.id, 'price', e.target.value)}
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="text"
                        placeholder="Ground floor"
                        maxLength="200"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 min-w-[120px] focus:ring-2 focus:ring-accent focus:border-transparent"
                        value={row.notes}
                        onChange={(e) => updateRow(row.id, 'notes', e.target.value)}
                      />
                    </td>
                    <td className="py-3 px-2">
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Remove row"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card layout */}
          <div className="sm:hidden space-y-3">
            {rows.map((row, idx) => (
              <div key={row.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-gray-700">Listing #{idx + 1}</span>
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Remove listing"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      <MapPin className="w-3 h-3 inline mr-1" />
                      Area/Town *
                    </label>
                    <input
                      type="text"
                      placeholder="Portmore"
                      maxLength="100"
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-accent focus:border-transparent"
                      value={row.area}
                      onChange={(e) => updateRow(row.id, 'area', e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Beds</label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        placeholder="2"
                        className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-accent focus:border-transparent"
                        value={row.bedrooms}
                        onChange={(e) => updateRow(row.id, 'bedrooms', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Baths</label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        placeholder="1"
                        className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-accent focus:border-transparent"
                        value={row.bathrooms}
                        onChange={(e) => updateRow(row.id, 'bathrooms', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      <DollarSign className="w-3 h-3 inline mr-1" />
                      Price *
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="120000"
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-accent focus:border-transparent"
                      value={row.price}
                      onChange={(e) => updateRow(row.id, 'price', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                    <input
                      type="text"
                      placeholder="Ground floor, parking"
                      maxLength="200"
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-accent focus:border-transparent"
                      value={row.notes}
                      onChange={(e) => updateRow(row.id, 'notes', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={addRow}
          className="mt-4 w-full btn-accent-outline flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Another Listing</span>
        </button>
      </div>

      {/* Photo Upload with Preview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon className="w-5 h-5 text-accent" />
          <h2 className="font-bold text-lg">Upload & Allocate Photos</h2>
        </div>
        
        {/* Allocation Mode */}
        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <label className="block text-sm font-semibold mb-2 text-gray-700">Photo Allocation Mode</label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="allocationMode"
                value="auto"
                checked={allocationMode === 'auto'}
                onChange={(e) => setAllocationMode(e.target.value)}
                className="mr-2"
              />
              <span className="text-sm">Auto (Sequential)</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="allocationMode"
                value="manual"
                checked={allocationMode === 'manual'}
                onChange={(e) => setAllocationMode(e.target.value)}
                className="mr-2"
              />
              <span className="text-sm">Manual (Select per photo)</span>
            </label>
          </div>
          
          {allocationMode === 'auto' && (
            <div className="mt-3">
              <label className="block text-sm font-medium mb-1 text-gray-700">Photos per listing</label>
              <select
                className="w-full sm:w-48 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent"
                value={photosPerListing}
                onChange={(e) => setPhotosPerListing(Number(e.target.value))}
              >
                <option value="3">3 photos</option>
                <option value="5">5 photos</option>
                <option value="8">8 photos</option>
                <option value="10">10 photos</option>
              </select>
            </div>
          )}
        </div>

        {/* File Upload */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Select Photos (JPG, PNG, WebP, GIF - Max 10MB each)
          </label>
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-10 h-10 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 font-medium">Click to upload photos</p>
              <p className="text-xs text-gray-500">or drag and drop</p>
            </div>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
          </label>
          {photoData.length > 0 && (
            <p className="text-sm text-gray-600 mt-2">
              📸 {photoData.length} photos selected
            </p>
          )}
        </div>

        {/* Photo Grid with Allocation */}
        {photoData.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm text-gray-700 mb-3">Photo Preview & Allocation</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {photoData.map((photo, idx) => (
                <div key={photo.id} className="relative group border-2 rounded-lg overflow-hidden hover:border-accent transition">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={photo.preview} 
                    alt={`Photo ${idx + 1}`}
                    className="w-full h-32 object-cover"
                  />
                  
                  {/* Listing assignment */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 p-2">
                    <select
                      value={photo.listingIndex !== null && photo.listingIndex !== undefined ? photo.listingIndex : ''}
                      onChange={(e) => assignPhotoToListing(photo.id, e.target.value === '' ? null : Number(e.target.value))}
                      className="w-full text-xs rounded px-1 py-1 bg-white"
                      disabled={allocationMode === 'auto'}
                    >
                      <option value="">Unassigned</option>
                      {rows.map((row, rowIdx) => (
                        <option key={row.id} value={rowIdx}>
                          #{rowIdx + 1} {row.area || 'unnamed'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition hover:bg-red-600"
                    title="Remove photo"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {/* Assignment indicator */}
                  {photo.listingIndex !== null && photo.listingIndex !== undefined && (
                    <div className="absolute top-1 left-1 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                      {photo.listingIndex + 1}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Distribution Summary */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-medium text-sm text-gray-700 mb-2">Photo Distribution:</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {rows.map((row, idx) => {
                  const assigned = photoData.filter(p => p.listingIndex === idx);
                  return (
                    <div key={row.id} className={`text-xs p-2 rounded ${assigned.length > 0 ? 'bg-green-50 text-green-800' : 'bg-orange-50 text-orange-800'}`}>
                      <span className="font-semibold">#{idx + 1}</span> {row.area || 'unnamed'}: {assigned.length} photos
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Publish Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-10">
        <div className="max-w-6xl mx-auto">
          <button
            type="button"
            onClick={publishAll}
            disabled={uploading}
            className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
              uploading
                ? 'bg-gray-300 cursor-not-allowed'
                : 'btn-accent shadow-lg hover:shadow-xl'
            }`}
          >
            {uploading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Publishing {rows.filter(r => r.area && r.price).length} Listings...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Upload className="w-5 h-5" />
                Publish {rows.filter(r => r.area && r.price).length} Listings
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
