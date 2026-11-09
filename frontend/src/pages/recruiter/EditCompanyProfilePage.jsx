import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  Upload,
  Camera,
  Image as ImageIcon,
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  MapPin,
  Globe,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import RecruiterLayout from '../../layouts/RecruiterLayout';
import companyApi from '../../api/companyApi';
import masterDataApi from '../../api/masterDataApi';
import { useToast } from '../../context/ToastContext';
import AddEditBenefitModal from '../../components/recruiter/AddEditBenefitModal';

export default function EditCompanyProfilePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const logoInputRef = useRef(null);
  const coverInputRef = useRef(null);

  // Form State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [companyId, setCompanyId] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [industryId, setIndustryId] = useState('');
  const [companySize, setCompanySize] = useState('Mid-size');
  const [foundedYear, setFoundedYear] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // Address
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateRegion, setStateRegion] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('United States');

  // Branding
  const [logoUrl, setLogoUrl] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');

  // Talent tracks (Hiring areas)
  const [allTalentTracks, setAllTalentTracks] = useState([]);
  const [selectedTalentTrackIds, setSelectedTalentTrackIds] = useState([]);

  // Industries
  const [industries, setIndustries] = useState([]);

  // Benefits
  const [benefits, setBenefits] = useState([]);
  const [benefitModalOpen, setBenefitModalOpen] = useState(false);
  const [editingBenefit, setEditingBenefit] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Fetch master data options
        const [indRes, trackRes, compRes] = await Promise.all([
          masterDataApi.getCategoryItems('industry'),
          masterDataApi.getCategoryItems('talent_track'),
          companyApi.getRecruiterCompany(),
        ]);

        setIndustries(indRes.data || []);
        setAllTalentTracks(trackRes.data || []);

        const c = compRes.data;
        setCompanyId(c.id);
        setName(c.name || '');
        setDescription(c.description || '');
        setIndustryId(c.industry?.id || '');
        setCompanySize(c.company_size || 'Mid-size');
        setFoundedYear(c.founded_year || '');
        setWebsiteUrl(c.website_url || '');

        setStreetAddress(c.headquarters_address || '');
        setCity(c.city || '');
        setStateRegion(c.state || '');
        setPostalCode(c.postal_code || '');
        setCountry(c.country || 'United States');

        setLogoUrl(c.logo_url || '');
        setCoverImageUrl(c.cover_image_url || '');
        setBenefits(c.benefits || []);

        if (c.talent_tracks) {
          setSelectedTalentTrackIds(c.talent_tracks.map((t) => t.id));
        }
      } catch (err) {
        showToast('Failed to load company details.', 'error');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Handle Logo Upload
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingLogo(true);
      const res = await companyApi.uploadCompanyLogo(formData);
      setLogoUrl(res.data.logo_url);
      showToast('Logo updated successfully!', 'success');
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to upload logo.', 'error');
    } finally {
      setUploadingLogo(false);
    }
  };

  // Handle Cover Banner Upload
  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingCover(true);
      const res = await companyApi.uploadCompanyCover(formData);
      setCoverImageUrl(res.data.cover_image_url);
      showToast('Header banner updated successfully!', 'success');
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to upload cover banner.', 'error');
    } finally {
      setUploadingCover(false);
    }
  };

  // Toggle Talent Track
  const toggleTalentTrack = (id) => {
    setSelectedTalentTrackIds((prev) =>
      prev.includes(id) ? prev.filter((tId) => tId !== id) : [...prev, id]
    );
  };

  // Benefit Actions
  const handleSaveBenefit = async (data) => {
    if (editingBenefit) {
      const res = await companyApi.updateCompanyBenefit(editingBenefit.id, data);
      setBenefits((prev) => prev.map((b) => (b.id === editingBenefit.id ? res.data : b)));
      showToast('Benefit updated.', 'success');
    } else {
      const res = await companyApi.createCompanyBenefit(data);
      setBenefits((prev) => [...prev, res.data]);
      showToast('Benefit added.', 'success');
    }
  };

  const handleDeleteBenefit = async (id) => {
    if (!window.confirm('Are you sure you want to remove this benefit?')) return;
    try {
      await companyApi.deleteCompanyBenefit(id);
      setBenefits((prev) => prev.filter((b) => b.id !== id));
      showToast('Benefit removed.', 'success');
    } catch (err) {
      showToast('Failed to delete benefit.', 'error');
    }
  };

  // Save Company Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Company name is required.', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: name.trim(),
        description: description.trim(),
        industry_id: industryId ? parseInt(industryId, 10) : null,
        company_size: companySize,
        founded_year: foundedYear ? parseInt(foundedYear, 10) : null,
        website_url: websiteUrl.trim(),
        headquarters_address: streetAddress.trim(),
        city: city.trim(),
        state: stateRegion.trim(),
        postal_code: postalCode.trim(),
        country: country.trim(),
        talent_track_ids: selectedTalentTrackIds,
      };

      await companyApi.updateRecruiterCompany(payload);
      showToast('Company profile saved successfully!', 'success');
      navigate('/recruiter/company/profile');
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to save company profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <RecruiterLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-[#0058be] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-medium text-[#71787e]">Loading profile editor...</p>
          </div>
        </div>
      </RecruiterLayout>
    );
  }

  return (
    <RecruiterLayout>
      <form onSubmit={handleSubmit} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Header Actions (Figma Page 6) */}
        <div className="flex items-center justify-between border-b border-[#e0e3e5] pb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-[#191c1e] tracking-tight">
              Edit Company Profile
            </h1>
            <p className="text-xs text-[#71787e] mt-0.5">
              Update your organization's public branding and details.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/recruiter/company/profile"
              className="px-4 py-2 border border-[#c3c7cb] text-xs font-semibold text-[#41474d] hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-[#0058be] hover:bg-[#004ca5] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>

        {/* 2-Column Main Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column (2 Cols): Header Branding, Basics, About */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header Branding Card (Figma Page 6) */}
            <div className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-6">
              <h2 className="text-sm font-bold text-[#191c1e] uppercase tracking-wider">
                Header Branding
              </h2>

              {/* Cover Banner */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#191c1e]">
                  Company Cover Banner
                </label>
                <div className="relative h-44 rounded-xl bg-slate-900 overflow-hidden border border-[#e0e3e5] group">
                  {coverImageUrl ? (
                    <img src={coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-linear-to-r from-[#0058be] to-slate-900 opacity-90 flex items-center justify-center text-white/50 text-xs">
                      No cover image uploaded
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={uploadingCover}
                      className="px-4 py-2 bg-white/90 hover:bg-white text-xs font-semibold text-[#191c1e] rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-[#0058be]" />
                      <span>{uploadingCover ? 'Uploading...' : 'Change Cover Banner'}</span>
                    </button>
                  </div>
                  <input
                    type="file"
                    ref={coverInputRef}
                    onChange={handleCoverUpload}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />
                </div>
              </div>

              {/* Logo Upload */}
              <div className="flex items-center gap-5 pt-2">
                <div className="relative w-20 h-20 rounded-2xl bg-[#f7f9fb] border-2 border-dashed border-[#c3c7cb] overflow-hidden shrink-0 group flex items-center justify-center">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-8 h-8 text-[#71787e] opacity-40" />
                  )}

                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                  <input
                    type="file"
                    ref={logoInputRef}
                    onChange={handleLogoUpload}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="px-3.5 py-1.5 bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#0058be] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                    </button>
                    <span className="text-[11px] text-[#71787e]">
                      Logo: 400×400px minimum recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-[#71787e]">
                    JPG, PNG, or WebP. Max file size: 5 MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Company Basics Card (Figma Page 6) */}
            <div className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-5">
              <h2 className="text-sm font-bold text-[#191c1e] uppercase tracking-wider">
                Company Basics
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Company Name */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-[#191c1e]">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Acme Corp"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#c3c7cb] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:border-[#0058be]"
                    required
                  />
                </div>

                {/* Industry */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#191c1e]">Industry</label>
                  <select
                    value={industryId}
                    onChange={(e) => setIndustryId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#c3c7cb] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:border-[#0058be]"
                  >
                    <option value="">Select Primary Industry</option>
                    {industries.map((ind) => (
                      <option key={ind.id} value={ind.id}>
                        {ind.value}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Founded Year */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#191c1e]">Year Founded</label>
                  <input
                    type="number"
                    value={foundedYear}
                    onChange={(e) => setFoundedYear(e.target.value)}
                    placeholder="2010"
                    min={1800}
                    max={new Date().getFullYear()}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#c3c7cb] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:border-[#0058be]"
                  />
                </div>

                {/* Website URL */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#191c1e]">Website URL</label>
                  <input
                    type="text"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://acmecorp.com"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#c3c7cb] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:border-[#0058be]"
                  />
                </div>

                {/* Company Size */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#191c1e]">Company Size</label>
                  <select
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#c3c7cb] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:border-[#0058be]"
                  >
                    <option value="Startup">Startup (1 - 50 employees)</option>
                    <option value="Mid-size">Mid-size (51 - 500 employees)</option>
                    <option value="Enterprise">Enterprise (500+ employees)</option>
                  </select>
                </div>
              </div>

              {/* Hiring Areas / Talent Tracks */}
              <div className="space-y-2 pt-2 border-t border-[#f1f4f6]">
                <label className="text-xs font-bold text-[#191c1e]">
                  Hiring Areas / Primary Talent Tracks
                </label>
                <p className="text-[11px] text-[#71787e]">
                  Select the key functional domains your organization hires for:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {allTalentTracks.map((track) => {
                    const active = selectedTalentTrackIds.includes(track.id);
                    return (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => toggleTalentTrack(track.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#0058be] text-white shadow-xs'
                            : 'bg-[#f1f4f6] text-[#41474d] hover:bg-[#e0e3e5]'
                        }`}
                      >
                        {track.value}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* About Section Card (Figma Page 6) */}
            <div className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-2">
              <h2 className="text-sm font-bold text-[#191c1e] uppercase tracking-wider">
                About Section
              </h2>
              <p className="text-[11px] text-[#71787e]">
                Markdown formatting is supported. Provide details regarding your company's mission, engineering culture, and values.
              </p>
              <textarea
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="We are Acme Corp, leading the charge in innovative solutions..."
                className="w-full px-3.5 py-2.5 bg-white border border-[#c3c7cb] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:border-[#0058be] leading-relaxed"
              />
            </div>
          </div>

          {/* Right Column (1 Col): Culture & Benefits, Headquarters Address */}
          <div className="space-y-8">
            {/* Culture & Benefits Management Card (Figma Page 6) */}
            <div className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#f1f4f6] pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#0058be]" />
                  <h3 className="text-sm font-bold text-[#191c1e]">Culture & Benefits</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingBenefit(null);
                    setBenefitModalOpen(true);
                  }}
                  className="p-1.5 text-[#0058be] hover:bg-[#e8f0fe] rounded-lg transition-colors cursor-pointer"
                  title="Add Benefit"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {benefits.length > 0 ? (
                <div className="space-y-3">
                  {benefits.map((b) => (
                    <div
                      key={b.id}
                      className="p-3 bg-[#f7f9fb] border border-[#e0e3e5] rounded-xl flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="font-bold text-xs text-[#191c1e] truncate">{b.name}</p>
                        {b.custom_description && (
                          <p className="text-[11px] text-[#71787e] line-clamp-2">
                            {b.custom_description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBenefit(b);
                            setBenefitModalOpen(true);
                          }}
                          className="p-1 text-[#71787e] hover:text-[#0058be] hover:bg-white rounded-md cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBenefit(b.id)}
                          className="p-1 text-[#71787e] hover:text-red-600 hover:bg-white rounded-md cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-[#71787e] bg-[#f7f9fb] rounded-xl border border-dashed border-[#c3c7cb]">
                  Click the plus icon to add company culture perks.
                </div>
              )}
            </div>

            {/* Headquarters Address Card (Figma Page 6 - without map) */}
            <div className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[#f1f4f6] pb-3">
                <MapPin className="w-4 h-4 text-[#0058be]" />
                <h3 className="text-sm font-bold text-[#191c1e]">Headquarters Address</h3>
              </div>

              <div className="space-y-3">
                {/* Street Address */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#191c1e]">Street Address</label>
                  <input
                    type="text"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="548 Market St, Suite 29000"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#c3c7cb] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:border-[#0058be]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* City */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#191c1e]">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="San Francisco"
                      className="w-full px-3.5 py-2.5 bg-white border border-[#c3c7cb] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:border-[#0058be]"
                    />
                  </div>

                  {/* State / Region */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#191c1e]">State / Region</label>
                    <input
                      type="text"
                      value={stateRegion}
                      onChange={(e) => setStateRegion(e.target.value)}
                      placeholder="CA"
                      className="w-full px-3.5 py-2.5 bg-white border border-[#c3c7cb] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:border-[#0058be]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Postal Code */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#191c1e]">Postal Code</label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="94104"
                      className="w-full px-3.5 py-2.5 bg-white border border-[#c3c7cb] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:border-[#0058be]"
                    />
                  </div>

                  {/* Country */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#191c1e]">Country</label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="United States"
                      className="w-full px-3.5 py-2.5 bg-white border border-[#c3c7cb] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:border-[#0058be]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal for Benefit creation */}
        <AddEditBenefitModal
          isOpen={benefitModalOpen}
          onClose={() => {
            setBenefitModalOpen(false);
            setEditingBenefit(null);
          }}
          onSave={handleSaveBenefit}
          benefit={editingBenefit}
        />
      </form>
    </RecruiterLayout>
  );
}

