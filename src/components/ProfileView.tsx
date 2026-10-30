import React, { useState, useRef } from 'react';
import {
  User,
  Shield,
  Power,
  CheckCircle2,
  Camera,
  Phone,
  Mail,
  MapPin,
  FileText,
  Save,
  Check,
  Edit2,
  Vote,
  HelpCircle,
  Compass,
} from 'lucide-react';
import { UserSession } from '../types';
import { updateUserProfile } from '../services/authService';
import { compressAndReadFile } from '../utils/imageUpload';

interface ProfileViewProps {
  currentUser: UserSession | null;
  onOpenAdminPanel: () => void;
  onOpenAuth: (isAdminMode?: boolean) => void;
  onLogout: () => void;
  userPollsCount?: number;
  userVotesCount?: number;
  onProfileUpdated?: (updatedSession: UserSession) => void;
  onOpenGuide?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  onOpenAdminPanel,
  onLogout,
  userPollsCount = 0,
  userVotesCount = 0,
  onProfileUpdated,
  onOpenGuide,
}) => {
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [photo, setPhoto] = useState(currentUser?.photo || currentUser?.avatar || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [city, setCity] = useState(currentUser?.city || '');

  // Synchronize strictly with the active logged-in user account
  React.useEffect(() => {
    setName(currentUser?.name || '');
    setPhone(currentUser?.phone || '');
    setPhoto(currentUser?.photo || currentUser?.avatar || '');
    setBio(currentUser?.bio || '');
    setCity(currentUser?.city || '');
    setIsEditing(false);
    setErrorMsg(null);
  }, [currentUser]);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await compressAndReadFile(file);
      setPhoto(dataUrl);
      setIsEditing(true);
    } catch (err) {
      console.error('Failed to read image:', err);
      setErrorMsg('Photo upload failed. Please try a different image.');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.email) return;

    setIsSaving(true);
    setErrorMsg(null);
    try {
      const updated = await updateUserProfile(currentUser.email, {
        name: name.trim() || currentUser.name,
        phone: phone.trim(),
        photo: photo.trim(),
        bio: bio.trim(),
        city: city.trim(),
      });

      if (onProfileUpdated) {
        onProfileUpdated(updated);
      }

      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Save profile error:', err);
      setErrorMsg(err.message || 'Profile save karne mein masla aya.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-5 space-y-4">
      {/* Toast Notification */}
      {saveSuccess && (
        <div className="p-3 bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md animate-fade-in">
          <Check className="w-4 h-4" />
          <span>Profile kamyabi se update ho gayi hai!</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold text-center">
          {errorMsg}
        </div>
      )}

      {/* Main Profile Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
        {/* Top Header Badge */}
        <div className="flex items-center justify-between mb-4">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
              currentUser?.isAdmin
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {currentUser?.isAdmin ? (
              <>
                <Shield className="w-3.5 h-3.5 text-indigo-600" />
                <span>Super Administrator</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified User Account</span>
              </>
            )}
          </span>

          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
          >
            {isEditing ? 'Cancel Edit' : 'Edit Profile'}
          </button>
        </div>

        {/* Profile Avatar / Photo */}
        <div className="flex flex-col items-center text-center">
          <div className="relative group mb-3">
            <div className="w-24 h-24 rounded-3xl overflow-hidden bg-slate-900 border-2 border-slate-200 shadow-md flex items-center justify-center">
              {photo ? (
                <img
                  src={photo}
                  alt={name || 'Profile'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-black text-white uppercase">
                  {name?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
                </span>
              )}
            </div>

            {/* Change Photo Trigger */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition group-hover:scale-105"
              title="Upload your photo from gallery"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-lg font-black text-slate-900 tracking-tight">
            {name || currentUser?.name || 'Voter Profile'}
          </h3>
          <p className="text-xs font-mono text-slate-500 mt-0.5 flex items-center justify-center gap-1">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentUser?.email}</span>
          </p>

          {phone && (
            <p className="text-xs font-mono text-slate-600 mt-1 flex items-center justify-center gap-1">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>{phone}</span>
            </p>
          )}

          {city && (
            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-center gap-1">
              <MapPin className="w-3 h-3 text-rose-500" />
              <span>{city}</span>
            </p>
          )}

          {bio && (
            <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic max-w-xs">
              "{bio}"
            </p>
          )}
        </div>

        {/* User Statistics Row */}
        <div className="grid grid-cols-2 gap-2 mt-5 pt-4 border-t border-slate-100 text-center">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              My Contests
            </span>
            <span className="text-xl font-black font-mono text-slate-900 mt-0.5 block">
              {userPollsCount}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              My Cast Votes
            </span>
            <span className="text-xl font-black font-mono text-indigo-600 mt-0.5 block">
              {userVotesCount}
            </span>
          </div>
        </div>

        {/* Edit Profile Form */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} className="mt-5 pt-4 border-t border-slate-100 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Profile Information Edit Karein</span>
            </h4>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aapka Name"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Mobile / Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0300-1234567"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                City / Location
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Lahore / Karachi / Islamabad"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Bio / Short Description
              </label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Aapke bare mein chand alfaz..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Changes...' : 'Save Profile Details'}</span>
            </button>
          </form>
        )}
      </div>

      {/* Admin Panel button - ONLY if user is verified admin! */}
      {currentUser?.isAdmin && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-center">
          <span className="text-xs font-bold text-indigo-900 block mb-2">
            Super Administrator Privileges
          </span>
          <button
            onClick={onOpenAdminPanel}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition"
          >
            Open Admin Control Panel
          </button>
        </div>
      )}

      {/* Logout */}
      {currentUser && (
        <button
          onClick={onLogout}
          className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition flex items-center justify-center gap-1.5"
        >
          <Power className="w-3.5 h-3.5" />
          <span>Sign Out / Switch Account</span>
        </button>
      )}
    </div>
  );
};
