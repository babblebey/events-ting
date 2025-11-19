"use client";

/**
 * CustomFieldBuilder Component
 * Allows event organizers to create and manage custom registration fields
 */

import { useState } from "react";
import { Button, Label, Select, TextInput, ToggleSwitch } from "flowbite-react";
import { HiPlus, HiTrash, HiArrowUp, HiArrowDown, HiPencil } from "react-icons/hi";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";

/**
 * Custom field definition interface
 */
interface CustomFieldDefinition {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox';
  required: boolean;
  options?: string[]; // For select, radio, checkbox
  placeholder?: string;
}

interface CustomFieldBuilderProps {
  eventId: string;
  initialFields: unknown[];
}

export function CustomFieldBuilder({ eventId: _eventId, initialFields }: CustomFieldBuilderProps) {
  const router = useRouter();
  
  // Parse initial fields
  const parsedInitialFields: CustomFieldDefinition[] = Array.isArray(initialFields)
    ? (initialFields as CustomFieldDefinition[])
    : [];

  const [fields, setFields] = useState<CustomFieldDefinition[]>(parsedInitialFields);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form state for adding/editing fields
  const [formData, setFormData] = useState<Partial<CustomFieldDefinition>>({
    label: '',
    type: 'text',
    required: false,
    options: [],
    placeholder: '',
  });

  const updateMutation = api.event.update.useMutation({
    onSuccess: () => {
      router.refresh();
    },
    onError: (error) => {
      alert(`Error saving fields: ${error.message}`);
    },
  });

  const handleSaveFields = () => {
    // TODO: Once Event.customFields is added to schema, implement this
    // For now, this is a placeholder
    alert('Custom field saving will be implemented once the Event schema is updated with customData/customFields field.');
    console.log('Fields to save:', fields);
    
    // Uncomment when Event schema has customData field:
    // updateMutation.mutate({
    //   id: _eventId,
    //   customData: {
    //     customFields: fields,
    //   } as never,
    // });
  };

  const handleAddField = () => {
    if (!formData.label || !formData.type) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate options for select/radio/checkbox types
    if (formData.type && ['select', 'radio', 'checkbox'].includes(formData.type) && (!formData.options || formData.options.length === 0)) {
      alert('Please add at least one option for this field type');
      return;
    }

    const newField: CustomFieldDefinition = {
      id: `field_${Date.now()}`,
      label: formData.label ?? '',
      type: formData.type ?? 'text',
      required: formData.required ?? false,
      options: formData.type && ['select', 'radio', 'checkbox'].includes(formData.type) ? formData.options : undefined,
      placeholder: formData.placeholder ?? undefined,
    };

    if (editingIndex !== null) {
      // Update existing field
      const updatedFields = [...fields];
      updatedFields[editingIndex] = newField;
      setFields(updatedFields);
      setEditingIndex(null);
    } else {
      // Add new field
      setFields([...fields, newField]);
    }

    // Reset form
    setFormData({
      label: '',
      type: 'text',
      required: false,
      options: [],
      placeholder: '',
    });
    setShowAddForm(false);
  };

  const handleEditField = (index: number) => {
    const field = fields[index]!;
    setFormData({
      label: field.label,
      type: field.type,
      required: field.required,
      options: field.options ?? [],
      placeholder: field.placeholder ?? '',
    });
    setEditingIndex(index);
    setShowAddForm(true);
  };

  const handleDeleteField = (index: number) => {
    if (confirm('Are you sure you want to delete this field?')) {
      const updatedFields = fields.filter((_, i) => i !== index);
      setFields(updatedFields);
    }
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newFields.length) return;
    
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex]!, newFields[index]!];
    setFields(newFields);
  };

  const handleAddOption = () => {
    const newOption = prompt('Enter option value:');
    if (newOption?.trim()) {
      setFormData({
        ...formData,
        options: [...(formData.options ?? []), newOption.trim()],
      });
    }
  };

  const handleRemoveOption = (index: number) => {
    const updatedOptions = (formData.options ?? []).filter((_, i) => i !== index);
    setFormData({ ...formData, options: updatedOptions });
  };

  const getFieldTypeLabel = (type: string) => {
    switch (type) {
      case 'text': return 'Short Text';
      case 'textarea': return 'Long Text';
      case 'select': return 'Dropdown';
      case 'radio': return 'Radio Buttons';
      case 'checkbox': return 'Checkboxes';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Existing Fields List */}
      {fields.length > 0 && (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {field.label}
                    </h4>
                    {field.required && (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-200">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Type: {getFieldTypeLabel(field.type)}
                  </p>
                  {field.options && field.options.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Options: {field.options.join(', ')}
                      </p>
                    </div>
                  )}
                  {field.placeholder && (
                    <p className="mt-1 text-sm italic text-gray-500 dark:text-gray-400">
                      Placeholder: {field.placeholder}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="xs"
                    color="gray"
                    onClick={() => handleMoveField(index, 'up')}
                    disabled={index === 0}
                  >
                    <HiArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="xs"
                    color="gray"
                    onClick={() => handleMoveField(index, 'down')}
                    disabled={index === fields.length - 1}
                  >
                    <HiArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    size="xs"
                    color="blue"
                    onClick={() => handleEditField(index)}
                  >
                    <HiPencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="xs"
                    color="red"
                    onClick={() => handleDeleteField(index)}
                  >
                    <HiTrash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {fields.length === 0 && !showAddForm && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
          <p className="text-gray-600 dark:text-gray-400">
            No custom fields configured yet. Click the button below to add your first field.
          </p>
        </div>
      )}

      {/* Add/Edit Field Form */}
      {showAddForm && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-900/20">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {editingIndex !== null ? 'Edit Field' : 'Add New Field'}
          </h3>
          <div className="space-y-4">
            {/* Field Label */}
            <div>
              <Label htmlFor="field-label">Field Label *</Label>
              <TextInput
                id="field-label"
                placeholder="e.g., Dietary Restrictions"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                required
              />
            </div>

            {/* Field Type */}
            <div>
              <Label htmlFor="field-type">Field Type *</Label>
              <Select
                id="field-type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as CustomFieldDefinition['type'] })}
                required
              >
                <option value="text">Short Text</option>
                <option value="textarea">Long Text</option>
                <option value="select">Dropdown</option>
                <option value="radio">Radio Buttons</option>
                <option value="checkbox">Checkboxes</option>
              </Select>
            </div>

            {/* Placeholder (for text/textarea) */}
            {(formData.type && ['text', 'textarea'].includes(formData.type)) && (
              <div>
                <Label htmlFor="field-placeholder">Placeholder Text (Optional)</Label>
                <TextInput
                  id="field-placeholder"
                  placeholder="e.g., Enter your dietary restrictions"
                  value={formData.placeholder}
                  onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
                />
              </div>
            )}

            {/* Options (for select/radio/checkbox) */}
            {(formData.type && ['select', 'radio', 'checkbox'].includes(formData.type)) && (
              <div>
                <Label>Options *</Label>
                <div className="space-y-2">
                  {(formData.options ?? []).map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <TextInput
                        value={option}
                        readOnly
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        color="red"
                        onClick={() => handleRemoveOption(index)}
                      >
                        <HiTrash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    color="gray"
                    onClick={handleAddOption}
                  >
                    <HiPlus className="mr-2 h-4 w-4" />
                    Add Option
                  </Button>
                </div>
              </div>
            )}

            {/* Required Toggle */}
            <div className="flex items-center gap-2">
              <ToggleSwitch
                id="field-required"
                checked={formData.required ?? false}
                onChange={(checked) => setFormData({ ...formData, required: checked })}
              />
              <Label htmlFor="field-required">Required Field</Label>
            </div>

            {/* Form Actions */}
            <div className="flex gap-2">
              <Button onClick={handleAddField}>
                {editingIndex !== null ? 'Update Field' : 'Add Field'}
              </Button>
              <Button
                color="gray"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingIndex(null);
                  setFormData({
                    label: '',
                    type: 'text',
                    required: false,
                    options: [],
                    placeholder: '',
                  });
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Field Button */}
      {!showAddForm && (
        <Button
          onClick={() => setShowAddForm(true)}
          color="blue"
        >
          <HiPlus className="mr-2 h-5 w-5" />
          Add Custom Field
        </Button>
      )}

      {/* Save Changes Button */}
      {fields.length > 0 && (
        <div className="flex justify-end border-t border-gray-200 pt-6 dark:border-gray-700">
          <Button
            onClick={handleSaveFields}
            disabled={updateMutation.isPending}
            color="success"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Field Configuration'}
          </Button>
        </div>
      )}
    </div>
  );
}
