import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  FileText,
  Lock,
  CheckCircle2,
  Building,
  PlusCircle,
  Trash2,
  Edit2,
  Check,
  X,
  Sparkles,
  HelpCircle,
  Bell,
  Scale,
} from 'lucide-react';
import { CompanyRuleItem } from '../types';
import {
  subscribeToCompanyRules,
  adminAddCompanyRule,
  adminDeleteCompanyRule,
  adminUpdateCompanyRule,
} from '../services/pollService';
import { CroexLogo } from './CroexLogo';
import { useLanguage } from '../contexts/LanguageContext';

interface CompanyPrivacyViewProps {
  isAdmin?: boolean;
  onClose?: () => void;
}

export const CompanyPrivacyView: React.FC<CompanyPrivacyViewProps> = ({
  isAdmin = false,
  onClose,
}) => {
  const { language } = useLanguage();
  const [rules, setRules] = useState<CompanyRuleItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('Terms');
  const [isSaving, setIsSaving] = useState(false);

  // Edit state
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState('');

  useEffect(() => {
    const unsub = subscribeToCompanyRules((fetched) => {
      setRules(fetched);
    });
    return () => unsub();
  }, []);

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;

    setIsSaving(true);
    try {
      await adminAddCompanyRule({
        title: newTitle.trim(),
        description: newDesc.trim(),
        category: newCategory.trim() || 'General',
        order: rules.length + 1,
        addedBy: 'Admin',
      });
      setNewTitle('');
      setNewDesc('');
      setNewCategory('Terms');
      setShowAddModal(false);
    } catch (err) {
      console.error('Error adding rule:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this company rule?')) return;
    try {
      await adminDeleteCompanyRule(id);
    } catch (err) {
      console.error('Error deleting rule:', err);
    }
  };

  const handleStartEdit = (rule: CompanyRuleItem) => {
    setEditingRuleId(rule.id);
    setEditTitle(rule.title);
    setEditDesc(rule.description);
    setEditCategory(rule.category || 'General');
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await adminUpdateCompanyRule(id, {
        title: editTitle.trim(),
        description: editDesc.trim(),
        category: editCategory.trim(),
      });
      setEditingRuleId(null);
    } catch (err) {
      console.error('Error updating rule:', err);
    }
  };

  const isUrdu = language === 'ur';

  return (
    <div className={`max-w-3xl mx-auto px-4 py-5 ${isUrdu ? 'font-urdu' : ''}`}>
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-xs">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <CroexLogo size={44} />
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 mb-1">
                <Building className="w-3 h-3 text-amber-600" />
                <span>Hanzla Croex Technology</span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {isUrdu ? 'کروئکس ووٹنگ سینٹر • کمپنی قواعد و پرائیویسی پالیسی' : 'Croex Voting Center • Company Policy & Contest Rules'}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {isUrdu
                  ? 'کمپنی کے آفیشل قوانین، شفافیت کے ضوابط اور تازہ ترین اعلانات'
                  : 'Official company guidelines, anti-fraud standards, and contest announcements'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#C4932C] hover:bg-[#AC7E1F] text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{isUrdu ? 'نیا قاعدہ شامل کریں' : 'Add Rule / Notice'}</span>
              </button>
            )}

            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Core Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-5">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold mb-2">
              <Lock className="w-4 h-4 text-emerald-700" />
            </div>
            <h3 className="text-xs font-black text-slate-900 mb-1">
              {isUrdu ? 'مکمل ڈیٹا تحفظ' : 'Data Privacy & Security'}
            </h3>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {isUrdu
                ? 'ہر ووٹر اور مقابلے کا ریکارڈ محفوظ اور الگ تھلگ ہے۔ کوئی ذاتی معلومات افشا نہیں ہوتیں۔'
                : 'Every voter and contest record is isolated and protected. Personal credentials are never exposed.'}
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold mb-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-700" />
            </div>
            <h3 className="text-xs font-black text-slate-900 mb-1">
              {isUrdu ? '1-ووٹ شفافیت' : 'Verified Single-Vote Policy'}
            </h3>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {isUrdu
                ? 'ایک ڈیوائس سے صرف ایک ہی ووٹ کی اجازت ہے۔ ڈپلیکیٹ یا بوٹ ووٹس کو بلاک کیا جاتا ہے۔'
                : 'Only 1 vote is permitted per device per contest. Automated or duplicate attempts are blocked.'}
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold mb-2">
              <FileText className="w-4 h-4 text-amber-700" />
            </div>
            <h3 className="text-xs font-black text-slate-900 mb-1">
              {isUrdu ? 'آف لائن اور انسٹنٹ رسائی' : 'Instant 1-Tap & Offline'}
            </h3>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {isUrdu
                ? 'واٹس ایپ سے شیئر کیے گئے لنک پر کلک کرتے ہی بغیر تاخیر مقابلہ کھلتا ہے اور آف لائن بھی کام کرتا ہے۔'
                : 'Contest links load instantaneously without redirects, and votes can be cast even without active internet.'}
            </p>
          </div>
        </div>

        {/* Dynamic Company Rules List (Managed by Admin) */}
        <div className="my-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-[#C4932C]" />
              <span>{isUrdu ? 'کمپنی کے باضابطہ قوانین و شرائط' : 'Official Contest Rules & Company Terms'}</span>
            </span>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {rules.length} {isUrdu ? 'قواعد' : 'Rules'}
            </span>
          </div>

          <div className="space-y-3">
            {rules.map((rule, idx) => (
              <div
                key={rule.id}
                className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 transition-all hover:bg-white hover:shadow-xs"
              >
                {editingRuleId === rule.id ? (
                  <div className="space-y-2.5">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#C4932C]"
                      placeholder="Rule Title"
                    />
                    <textarea
                      rows={3}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#C4932C]"
                      placeholder="Rule Description"
                    />
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                        placeholder="Category (e.g. Terms, Integrity)"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingRuleId(null)}
                          className="px-2.5 py-1 text-xs text-slate-600 bg-slate-200 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(rule.id)}
                          className="px-3 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Save</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-[#C4932C] text-white font-black text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <h3 className="text-sm font-black text-slate-900 leading-snug">
                          {rule.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {rule.category && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                            {rule.category}
                          </span>
                        )}
                        {isAdmin && (
                          <div className="flex items-center gap-1 ml-1">
                            <button
                              onClick={() => handleStartEdit(rule)}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition"
                              title="Edit Rule"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md transition"
                              title="Delete Rule"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed pl-8 font-medium whitespace-pre-line">
                      {rule.description}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Modal: Admin Add New Company Rule */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <PlusCircle className="w-4 h-4 text-amber-700" />
                  </div>
                  <h3 className="text-base font-black text-slate-900">
                    {isUrdu ? 'کمپنی کا نیا قاعدہ یا اعلان شامل کریں' : 'Add New Company Rule / Announcement'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddRule} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    {isUrdu ? 'قاعدے کا عنوان (Title)' : 'Rule Title / Topic'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 6. Transparency in Voting Tallies"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#C4932C]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    {isUrdu ? 'کیٹیگری (Category)' : 'Category Tag'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Policy, Integrity, Security, Announcement"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#C4932C]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    {isUrdu ? 'تفصیل اور ضابطہ (Description)' : 'Full Rule Description'}
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Detail the policy, terms, or announcement here..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#C4932C]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-[#C4932C] hover:bg-[#AC7E1F] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Saving...' : 'Add Rule'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Company Ownership and Verification Footer */}
        <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left mt-6">
          <div>
            <h4 className="text-xs font-black text-slate-900">
              Hanzla Croex Technology • All Rights Reserved
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isUrdu
                ? 'محفوظ اور شفاف ریئل ٹائم دو امیدوار لائیو ووٹنگ پلیٹ فارم'
                : 'Secure, Real-time Voting Platform for 2-Candidate Live Competitions.'}
            </p>
          </div>
          <span className="text-[10px] font-black px-3 py-1 bg-[#C4932C] text-white rounded-full uppercase tracking-wider">
            Official Policy v2.5
          </span>
        </div>

      </div>
    </div>
  );
};
