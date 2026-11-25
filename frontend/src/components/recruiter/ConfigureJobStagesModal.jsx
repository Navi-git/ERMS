import React, { useState } from 'react';
import {
  X,
  GitCommit,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Edit2,
  Check,
  AlertCircle,
} from 'lucide-react';

export default function ConfigureJobStagesModal({
  isOpen,
  onClose,
  stages = [],
  onSaveStages,
}) {
  const [pipelineStages, setPipelineStages] = useState(stages);

  // New stage form state
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('custom');
  const [newDescription, setNewDescription] = useState('');
  const [newRequired, setNewRequired] = useState(true);
  const [newActive, setNewActive] = useState(true);

  // Editing stage state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    stage_type: 'custom',
    description: '',
    is_required: true,
    is_active: true,
  });

  // Sync when prop updates
  React.useEffect(() => {
    setPipelineStages(stages);
  }, [stages]);

  if (!isOpen) return null;

  const handleAddStage = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newStage = {
      id: Date.now(), // Temporary ID if client-side
      name: newName.trim(),
      stage_type: newType,
      description: newDescription.trim(),
      is_required: newRequired,
      is_active: newActive,
      stage_order: pipelineStages.length + 1,
    };

    setPipelineStages([...pipelineStages, newStage]);
    setNewName('');
    setNewType('custom');
    setNewDescription('');
    setNewRequired(true);
    setNewActive(true);
  };

  const handleDeleteStage = (id) => {
    const updated = pipelineStages
      .filter((s) => s.id !== id)
      .map((s, idx) => ({ ...s, stage_order: idx + 1 }));
    setPipelineStages(updated);
  };

  const handleMoveUp = (idx) => {
    if (idx === 0) return;
    const items = [...pipelineStages];
    const temp = items[idx - 1];
    items[idx - 1] = items[idx];
    items[idx] = temp;
    const reordered = items.map((s, i) => ({ ...s, stage_order: i + 1 }));
    setPipelineStages(reordered);
  };

  const handleMoveDown = (idx) => {
    if (idx === pipelineStages.length - 1) return;
    const items = [...pipelineStages];
    const temp = items[idx + 1];
    items[idx + 1] = items[idx];
    items[idx] = temp;
    const reordered = items.map((s, i) => ({ ...s, stage_order: i + 1 }));
    setPipelineStages(reordered);
  };

  const startEdit = (stage) => {
    setEditingId(stage.id);
    setEditForm({
      name: stage.name,
      stage_type: stage.stage_type || 'custom',
      description: stage.description || '',
      is_required: stage.is_required,
      is_active: stage.is_active,
    });
  };

  const applyEdit = () => {
    if (!editForm.name.trim()) return;
    setPipelineStages((prev) =>
      prev.map((s) => (s.id === editingId ? { ...s, ...editForm } : s))
    );
    setEditingId(null);
  };

  const handleSave = () => {
    onSaveStages(pipelineStages);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-[#e0e3e5] max-h-[90vh] flex flex-col">
        {/* Header (Figma Page 7) */}
        <div className="flex items-center justify-between pb-4 border-b border-[#e0e3e5]">
          <div className="flex items-center gap-2.5 text-[#0058be]">
            <GitCommit className="w-5 h-5 shrink-0" />
            <div>
              <h3 className="font-bold text-lg text-[#191c1e] leading-tight">
                Hiring Pipeline
              </h3>
              <p className="text-xs text-[#71787e]">
                Add stages in the order candidates will move through them.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#71787e] hover:bg-[#f1f4f6] hover:text-[#191c1e] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Add New Stage Form */}
          <form
            onSubmit={handleAddStage}
            className="p-4 rounded-2xl bg-[#f7f9fb] border border-[#e0e3e5] space-y-3"
          >
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0058be]">
              <Plus className="w-4 h-4" />
              <span>Add New Stage</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-[#71787e] mb-1">
                  Stage Name *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Technical Interview"
                  className="w-full px-3 py-2 rounded-xl border border-[#c1c7ce] bg-white text-xs text-[#191c1e] focus:outline-hidden focus:border-[#0058be]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-[#71787e] mb-1">
                  Stage Type
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#c1c7ce] bg-white text-xs text-[#191c1e] focus:outline-hidden focus:border-[#0058be]"
                >
                  <option value="applied">Applied (Initial)</option>
                  <option value="screening">Screening</option>
                  <option value="interview">Interview</option>
                  <option value="offer">Offer</option>
                  <option value="hired">Hired (Final)</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-[#71787e] mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="What happens in this stage? (e.g. 45-min live coding with Engineering Lead)"
                className="w-full px-3 py-2 rounded-xl border border-[#c1c7ce] bg-white text-xs text-[#191c1e] focus:outline-hidden focus:border-[#0058be]"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer text-[#41474d]">
                  <input
                    type="checkbox"
                    checked={newRequired}
                    onChange={(e) => setNewRequired(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-[#0058be]"
                  />
                  <span>Required Stage</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-[#41474d]">
                  <input
                    type="checkbox"
                    checked={newActive}
                    onChange={(e) => setNewActive(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-[#0058be]"
                  />
                  <span>Active</span>
                </label>
              </div>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0058be] hover:bg-[#004ca5] shadow-xs transition-colors cursor-pointer"
              >
                + Add Stage
              </button>
            </div>
          </form>

          {/* Existing Stages List (Figma Page 7) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#71787e] px-1">
              <span>Pipeline Stages ({pipelineStages.length})</span>
              <span>Reorder Progression</span>
            </div>

            {pipelineStages.map((stage, idx) => {
              const isEditing = editingId === stage.id;
              return (
                <div
                  key={stage.id}
                  className="p-3.5 rounded-2xl bg-white border border-[#e0e3e5] space-y-2 hover:border-[#0058be]/40 transition-all shadow-xs"
                >
                  {isEditing ? (
                    /* Inline Editing Panel */
                    <div className="space-y-3 p-2 bg-[#f7f9fb] rounded-xl border border-[#c3d9fe]">
                      <div className="flex items-center justify-between text-xs font-bold text-[#0058be]">
                        <span>Editing Stage #{stage.stage_order}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="px-3 py-1.5 rounded-lg border border-[#c1c7ce] text-xs bg-white"
                          placeholder="Stage Name"
                        />
                        <select
                          value={editForm.stage_type}
                          onChange={(e) => setEditForm({ ...editForm, stage_type: e.target.value })}
                          className="px-3 py-1.5 rounded-lg border border-[#c1c7ce] text-xs bg-white"
                        >
                          <option value="applied">Applied</option>
                          <option value="screening">Screening</option>
                          <option value="interview">Interview</option>
                          <option value="offer">Offer</option>
                          <option value="hired">Hired</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>
                      <input
                        type="text"
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-[#c1c7ce] text-xs bg-white"
                        placeholder="Description"
                      />
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-3 text-xs">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editForm.is_required}
                              onChange={(e) => setEditForm({ ...editForm, is_required: e.target.checked })}
                              className="w-3.5 h-3.5"
                            />
                            <span>Required</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editForm.is_active}
                              onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                              className="w-3.5 h-3.5"
                            />
                            <span>Active</span>
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1 text-xs text-[#71787e] hover:bg-white rounded-lg"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={applyEdit}
                            className="px-3 py-1 text-xs font-bold text-white bg-[#0058be] rounded-lg"
                          >
                            Apply Changes
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Display Row */
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-[#e8f0fe] text-[#0058be] font-bold text-xs flex items-center justify-center shrink-0">
                          {stage.stage_order}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#191c1e]">{stage.name}</span>
                            {stage.is_required && (
                              <span className="px-2 py-0.5 rounded-full bg-[#f1f4f6] text-[#71787e] text-[10px] font-semibold">
                                Required
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-full bg-[#e8f0fe] text-[#0058be] text-[10px] font-semibold capitalize">
                              {stage.stage_type || 'Custom'}
                            </span>
                          </div>
                          {stage.description && (
                            <p className="text-xs text-[#71787e] mt-0.5 line-clamp-1">
                              {stage.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveUp(idx)}
                          disabled={idx === 0}
                          className="p-1 text-[#71787e] hover:text-[#0058be] disabled:opacity-30 cursor-pointer"
                          title="Move up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(idx)}
                          disabled={idx === pipelineStages.length - 1}
                          className="p-1 text-[#71787e] hover:text-[#0058be] disabled:opacity-30 cursor-pointer"
                          title="Move down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(stage)}
                          className="p-1 text-[#71787e] hover:text-[#0058be] cursor-pointer"
                          title="Edit stage"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStage(stage.id)}
                          className="p-1 text-[#71787e] hover:text-[#ba1a1a] cursor-pointer"
                          title="Delete stage"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-[#e0e3e5]">
          <span className="text-xs text-[#71787e]">
            Auto-orders sequence numbers 1 → {pipelineStages.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-[#41474d] hover:bg-[#f1f4f6] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-[#0058be] hover:bg-[#004ca5] shadow-xs transition-colors cursor-pointer"
            >
              Save Pipeline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

