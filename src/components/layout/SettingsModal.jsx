import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Eye, EyeOff, KeyRound } from "lucide-react";

export default function SettingsModal({ open, onClose, currentKey, onSave }) {
  const [value, setValue] = useState(currentKey || "");
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(value.trim());
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <KeyRound size={20} className="text-navy" />
              <Dialog.Title className="text-lg font-semibold text-navy">
                Settings
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button className="rounded-lg p-1.5 hover:bg-gray-100 text-gray-500">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <Dialog.Description className="text-sm text-gray-500 mb-4">
            Enter your Google Gemini API key to enable AI-powered pool analysis
            and ecosystem briefings. Your key is stored locally in your browser
            and never sent to any server other than Google.
          </Dialog.Description>

          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Gemini API Key
          </label>
          <div className="relative mb-4">
            <input
              type={show ? "text" : "password"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="AIza..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 pr-10 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy"
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 rounded-lg bg-navy py-2.5 text-sm font-medium text-white hover:bg-navy/90 transition-colors"
            >
              {saved ? "Saved!" : "Save Key"}
            </button>
          </div>

          <p className="mt-3 text-xs text-gray-400 text-center">
            Get a free key at{" "}
            <span className="text-navy font-medium">aistudio.google.com</span>
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
