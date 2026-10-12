import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor/editor/editor.api.js";
import "monaco-editor/languages/definitions/cpp/register.js";
import "monaco-editor/languages/definitions/java/register.js";
import "monaco-editor/languages/definitions/python/register.js";
import "monaco-editor/editor/contrib/toggleTabFocusMode/browser/toggleTabFocusMode.js";
import "monaco-editor/editor/contrib/clipboard/browser/clipboard.js";
import "monaco-editor/editor/contrib/find/browser/findController.js";
import EditorWorker from "monaco-editor/editor/editor.worker.js?worker";
// Bundle the editor and its worker locally: no source code goes to a CDN.
self.MonacoEnvironment = {
  getWorker() {
    return new EditorWorker();
  },
};
loader.config({ monaco });
export default function CodeEditor({
  language,
  source,
  onChange,
  readOnly = false,
}: {
  language: string;
  source: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <Editor
      height="440px"
      language={language === "c" || language === "cpp" ? "cpp" : language}
      value={source}
      onChange={(v) => onChange(v ?? "")}
      theme="vs-dark"
      options={{
        readOnly,
        fontSize: 14,
        minimap: { enabled: false },
        automaticLayout: true,
        scrollBeyondLastLine: false,
        accessibilitySupport: "on",
        wordWrap: "on",
        ariaLabel: "Solution source code",
        tabSize: 4,
      }}
    />
  );
}
