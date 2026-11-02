import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  ArrowUpDown,
  Tag,
  Link as LinkIcon,
  Loader2,
  X,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import masterDataApi from '../../api/masterDataApi';

const CATEGORIES = [
  { id: 'industry', label: 'Industries' },
  { id: 'department', label: 'Departments' },
  { id: 'job_category', label: 'Job Categories' },
  { id: 'skill', label: 'Skills' },
  { id: 'experience_level', label: 'Experience Levels' },
  { id: 'work_mode', label: 'Work Modes' },
  { id: 'talent_track', label: 'Talent Tracks' },
  { id: 'benefit', label: 'Benefits' },
];

export default function AdminMasterDataPage() {
  const [activeCategory, setActiveCategory] = useState('industry');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | 'aliases' | null
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    key: '',
    value: '',
    description: '',
    display_order: 0,
    is_active: true,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Skill Aliases
  const [aliases, setAliases] = useState([]);
  const [aliasForm, setAliasForm] = useState({ alias_text: '', target_skill_id: '' });
  const [aliasLoading, setAliasLoading] = useState(false);

  // Notification feedback
  const [feedback, setFeedback] = useState(null);

  // Fetch Items
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await masterDataApi.getAdminItems({
        category: activeCategory,
        search: search.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setItems(response.data || []);
    } catch (err) {
      console.error('Failed to load master data items:', err);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, search, statusFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Load Aliases when Aliases Modal opens
  const loadAliases = async () => {
    try {
      const res = await masterDataApi.getSkillAliases();
      setAliases(res.data || []);
    } catch (err) {
      console.error('Failed to load aliases:', err);
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setSelectedItem(null);
    setFormData({
      key: '',
      value: '',
      description: '',
      display_order: items.length * 10,
      is_active: true,
    });
    setFormError('');
    setModalMode('create');
  };

  // Open Edit Modal
  const handleOpenEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      key: item.key,
      value: item.value,
      description: item.description || '',
      display_order: item.display_order,
      is_active: item.is_active,
    });
    setFormError('');
    setModalMode('edit');
  };

  // Submit Create or Edit Form
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      if (modalMode === 'create') {
        await masterDataApi.createItem({
          category: activeCategory,
          key: formData.key.trim().toLowerCase(),
          value: formData.value.trim(),
          description: formData.description.trim() || undefined,
          display_order: parseInt(formData.display_order, 10) || 0,
        });
        setFeedback({ type: 'success', text: `Item '${formData.value}' created!` });
      } else {
        await masterDataApi.updateItem(selectedItem.id, {
          value: formData.value.trim(),
          description: formData.description.trim() || undefined,
          display_order: parseInt(formData.display_order, 10) || 0,
          is_active: formData.is_active,
        });
        setFeedback({ type: 'success', text: `Item '${formData.value}' updated!` });
      }
      setModalMode(null);
      fetchItems();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to save item.';
      setFormError(msg);
    } finally {
      setFormLoading(false);
    }
  };

  // Quick Toggle Active Status
  const handleToggleActive = async (item) => {
    try {
      await masterDataApi.updateItem(item.id, { is_active: !item.is_active });
      setFeedback({
        type: 'success',
        text: `'${item.value}' is now ${!item.is_active ? 'Active' : 'Inactive'}.`,
      });
      fetchItems();
    } catch (err) {
      setFeedback({ type: 'error', text: 'Failed to change item status.' });
    }
  };

  // Delete Item
  const handleDeleteItem = async (item) => {
    if (item.usage_count > 0) {
      alert(`Cannot delete '${item.value}'. It is referenced by ${item.usage_count} record(s). Please deactivate it instead.`);
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete '${item.value}'?`)) return;

    try {
      await masterDataApi.deleteItem(item.id);
      setFeedback({ type: 'success', text: `Item '${item.value}' deleted successfully.` });
      fetchItems();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete item.';
      setFeedback({ type: 'error', text: msg });
    }
  };

  // Add Skill Alias
  const handleCreateAlias = async (e) => {
    e.preventDefault();
    if (!aliasForm.alias_text.trim() || !aliasForm.target_skill_id) return;

    setAliasLoading(true);
    try {
      await masterDataApi.createSkillAlias({
        alias_text: aliasForm.alias_text.trim(),
        target_skill_id: parseInt(aliasForm.target_skill_id, 10),
      });
      setAliasForm({ alias_text: '', target_skill_id: '' });
      loadAliases();
      setFeedback({ type: 'success', text: 'Skill synonym added!' });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create alias.');
    } finally {
      setAliasLoading(false);
    }
  };

  // Delete Skill Alias
  const handleDeleteAlias = async (id) => {
    try {
      await masterDataApi.deleteSkillAlias(id);
      loadAliases();
    } catch (err) {
      alert('Failed to delete alias.');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl text-sm flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            <span>{feedback.text}</span>
            <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#191c1e]">Master Data Management</h1>
            <p className="text-sm text-[#717680] mt-0.5">
              Manage system-wide taxonomies, categories, skills, and search synonyms.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeCategory === 'skill' && (
              <button
                onClick={() => {
                  loadAliases();
                  setModalMode('aliases');
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-[#e5e8ec] hover:bg-[#f4f6f8] text-[#191c1e] text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <Tag className="w-4 h-4 text-[#0058be]" />
                <span>Skill Synonyms</span>
              </button>
            )}

            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0058be] hover:bg-[#0047a0] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Item</span>
            </button>
          </div>
        </div>

        {/* Main Content Box */}
        <div className="bg-white rounded-xl border border-[#e5e8ec] shadow-2xs overflow-hidden">
          {/* Category Tabs */}
          <div className="border-b border-[#e5e8ec] px-6 flex items-center gap-6 overflow-x-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setSearch('');
                }}
                className={`py-4 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                  activeCategory === cat.id
                    ? 'border-[#0058be] text-[#0058be]'
                    : 'border-transparent text-[#717680] hover:text-[#191c1e]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search & Filters */}
          <div className="p-4 border-b border-[#f0f2f5] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#fafbfc]">
            <div className="w-full sm:w-80 relative">
              <Search className="w-4 h-4 text-[#8a8d94] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Search ${CATEGORIES.find((c) => c.id === activeCategory)?.label}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-[#e5e8ec] rounded-lg focus:outline-none focus:border-[#0058be] text-[#191c1e]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-[#e5e8ec] rounded-lg text-[#45464d] focus:outline-none focus:border-[#0058be]"
              >
                <option value="all">Status: All</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f8f9fb] border-b border-[#e5e8ec] text-[11px] font-bold text-[#717680] uppercase tracking-wider">
                  <th className="py-3 px-6">KEY</th>
                  <th className="py-3 px-6">NAME / VALUE</th>
                  <th className="py-3 px-6">DESCRIPTION</th>
                  <th className="py-3 px-6 text-center">ORDER</th>
                  <th className="py-3 px-6 text-center">STATUS</th>
                  <th className="py-3 px-6 text-center">USAGE</th>
                  <th className="py-3 px-6 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f2f5] text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#717680]">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-[#0058be]" />
                        <span>Loading items...</span>
                      </div>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#717680]">
                      No items found in this category. Click "+ Add Item" to create one.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-[#fafbfc] transition-colors">
                      <td className="py-3.5 px-6 font-mono font-bold text-[#191c1e]">
                        {item.key}
                      </td>

                      <td className="py-3.5 px-6 font-bold text-[#191c1e]">
                        {item.value}
                      </td>

                      <td className="py-3.5 px-6 text-[#717680] max-w-xs truncate">
                        {item.description || '—'}
                      </td>

                      <td className="py-3.5 px-6 text-center text-[#717680] font-medium">
                        {item.display_order}
                      </td>

                      <td className="py-3.5 px-6 text-center">
                        <button
                          onClick={() => handleToggleActive(item)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                            item.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.is_active ? 'bg-emerald-500' : 'bg-gray-400'
                            }`}
                          />
                          <span>{item.is_active ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>

                      <td className="py-3.5 px-6 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            item.usage_count > 0
                              ? 'bg-blue-50 text-[#0058be]'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {item.usage_count}
                        </span>
                      </td>

                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-gray-500 hover:text-[#0058be] hover:bg-blue-50 rounded transition-colors cursor-pointer"
                            title="Edit Item"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title={item.usage_count > 0 ? 'Referenced in system (deactivate instead)' : 'Delete Item'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-[#191c1e]">
                {modalMode === 'create' ? `Add ${CATEGORIES.find((c) => c.id === activeCategory)?.label} Item` : `Edit ${formData.value}`}
              </h3>
              <button onClick={() => setModalMode(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#191c1e] mb-1">
                  Key <span className="text-gray-400 font-normal">(unique identifier, e.g. software_dev)</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={modalMode === 'edit'}
                  placeholder="e.g. cloud_computing"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#e5e8ec] rounded-lg focus:outline-none focus:border-[#0058be] font-mono disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#191c1e] mb-1">Display Name / Value</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cloud Computing"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#e5e8ec] rounded-lg focus:outline-none focus:border-[#0058be]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#191c1e] mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Short description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#e5e8ec] rounded-lg focus:outline-none focus:border-[#0058be]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#191c1e] mb-1">Display Order</label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#e5e8ec] rounded-lg focus:outline-none focus:border-[#0058be]"
                />
              </div>

              {modalMode === 'edit' && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isActiveToggle"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-gray-300 text-[#0058be] focus:ring-[#0058be]"
                  />
                  <label htmlFor="isActiveToggle" className="text-xs font-semibold text-[#191c1e] cursor-pointer">
                    Item is Active
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0058be] hover:bg-[#0047a0] rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                >
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{modalMode === 'create' ? 'Create Item' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Skill Synonyms Modal */}
      {modalMode === 'aliases' && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-base text-[#191c1e]">
                <Tag className="w-5 h-5 text-[#0058be]" />
                <span>Skill Search Synonyms</span>
              </div>
              <button onClick={() => setModalMode(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#717680]">
              Aliases allow candidates and recruiters to search for synonyms (e.g. typing "JS" matches "JavaScript").
            </p>

            {/* Add Synonym Form */}
            <form onSubmit={handleCreateAlias} className="p-3 bg-[#f8f9fb] border border-[#e5e8ec] rounded-xl flex items-center gap-2">
              <input
                type="text"
                required
                placeholder="Alias (e.g. JS)"
                value={aliasForm.alias_text}
                onChange={(e) => setAliasForm({ ...aliasForm, alias_text: e.target.value })}
                className="w-1/3 px-3 py-1.5 text-xs bg-white border border-[#e5e8ec] rounded-lg focus:outline-none focus:border-[#0058be]"
              />

              <select
                required
                value={aliasForm.target_skill_id}
                onChange={(e) => setAliasForm({ ...aliasForm, target_skill_id: e.target.value })}
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#e5e8ec] rounded-lg focus:outline-none focus:border-[#0058be]"
              >
                <option value="">Select Target Skill...</option>
                {items.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.value}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                disabled={aliasLoading}
                className="px-3 py-1.5 bg-[#0058be] text-white text-xs font-semibold rounded-lg hover:bg-[#0047a0] transition-colors shrink-0"
              >
                Add
              </button>
            </form>

            {/* Aliases List */}
            <div className="max-h-64 overflow-y-auto divide-y divide-[#f0f2f5] text-xs">
              {aliases.length === 0 ? (
                <p className="py-6 text-center text-gray-400">No skill aliases defined yet.</p>
              ) : (
                aliases.map((a) => (
                  <div key={a.id} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#191c1e] bg-gray-100 px-2 py-0.5 rounded font-mono">
                        {a.alias_text}
                      </span>
                      <span className="text-[#717680]">&rarr;</span>
                      <span className="font-semibold text-[#0058be]">{a.target_skill_name}</span>
                    </div>

                    <button
                      onClick={() => handleDeleteAlias(a.id)}
                      className="text-gray-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

