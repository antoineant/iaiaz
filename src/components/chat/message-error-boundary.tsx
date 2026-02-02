"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, Copy, Check } from "lucide-react";
import { useState } from "react";

interface Props {
  children: ReactNode;
  fallbackContent?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

// Separate component for the fallback UI (needs hooks)
function FallbackUI({ content, error }: { content?: string; error?: Error }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (content) {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Unable to render this message
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            The message contains content that cannot be displayed properly.
          </p>
          {content && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  Raw content:
                </span>
                <button
                  onClick={handleCopy}
                  className="text-xs flex items-center gap-1 text-amber-700 dark:text-amber-300 hover:underline"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="text-xs bg-amber-100 dark:bg-amber-900/40 p-3 rounded overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-all font-mono">
                {content.slice(0, 2000)}
                {content.length > 2000 && "..."}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export class MessageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Message rendering error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <FallbackUI
          content={this.props.fallbackContent}
          error={this.state.error}
        />
      );
    }

    return this.props.children;
  }
}
