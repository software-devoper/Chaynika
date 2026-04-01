import React, { useState, useEffect } from "react";
import { Plus, Edit2, Save, Trash2, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { Group } from "../types";
import { groupApi } from "../lib/api";

export default function PurchaseGroup() {
  const [mode, setMode] = useState<"add" | "edit">("add");
  const [groups, setGroups] = useState<Group[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = groupApi.getAll((data) => {
      setGroups(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    
    try {
      await groupApi.add(newGroupName.trim());
      setNewGroupName("");
      setNewGroupDesc("");
      toast.success("Group added successfully");
    } catch (err) {
      toast.error("Failed to add group");
    }
  };

  const handleUpdateGroup = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await groupApi.update(id, editName.trim());
      setEditingId(null);
      toast.success("Group updated");
    } catch (err) {
      toast.error("Failed to update group");
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this group?")) {
      try {
        await groupApi.delete(id);
        toast.success("Group deleted");
      } catch (err) {
        toast.error("Failed to delete group");
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setMode("add")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            mode === "add" ? "bg-accent text-primary" : "bg-primary text-muted hover:text-text"
          }`}
        >
          <Plus size={18} /> Add Group
        </button>
        <button
          onClick={() => setMode("edit")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            mode === "edit" ? "bg-accent text-primary" : "bg-primary text-muted hover:text-text"
          }`}
        >
          <Edit2 size={18} /> Edit Group
        </button>
      </div>

      {mode === "add" ? (
        <form onSubmit={handleAddGroup} className="max-w-md space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-2">Group Name *</label>
            <input
              required
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
              placeholder="Enter group name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-2">Description (Optional)</label>
            <textarea
              value={newGroupDesc}
              onChange={(e) => setNewGroupDesc(e.target.value)}
              className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all h-24"
              placeholder="Enter description"
            />
          </div>
          <button
            type="submit"
            className="bg-accent text-primary font-bold px-8 py-3 rounded-xl hover:opacity-90 transition-all"
          >
            Submit
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.id} className="flex items-center gap-4 p-4 bg-primary rounded-xl border border-accent/5">
              {editingId === group.id ? (
                <>
                  <input
                    autoFocus
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 bg-surface border border-accent/20 rounded-lg px-3 py-2 text-text outline-none focus:border-accent"
                  />
                  <button onClick={() => handleUpdateGroup(group.id)} className="text-accent hover:text-accent/80">
                    <Save size={20} />
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-muted hover:text-text">
                    <X size={20} />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <div className="font-medium text-text">{group.name}</div>
                    {group.description && <div className="text-xs text-muted">{group.description}</div>}
                  </div>
                  <button
                    onClick={() => {
                      setEditingId(group.id);
                      setEditName(group.name);
                    }}
                    className="text-muted hover:text-accent"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDeleteGroup(group.id)} className="text-muted hover:text-red-500">
                    <Trash2 size={18} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
