"use client";

import { useState, useEffect, useRef, useId } from "react";
import { Eye, EyeOff, Code, AlertTriangle } from "lucide-react";
import DOMPurify from "dompurify";

interface CodePreviewProps {
  code: string;
  language: string;
  showPreviewLabel: string;
  showCodeLabel: string;
}

// Supported preview languages
const PREVIEWABLE_LANGUAGES = ["svg", "html", "mermaid"];

export function isPreviewableLanguage(language: string | undefined): boolean {
  if (!language) return false;
  return PREVIEWABLE_LANGUAGES.includes(language.toLowerCase());
}

// SVG Preview Component
function SVGPreview({ code }: { code: string }) {
  const [error, setError] = useState<string | null>(null);
  const [sanitizedSvg, setSanitizedSvg] = useState<string>("");

  useEffect(() => {
    try {
      // Sanitize SVG to remove scripts and dangerous attributes
      const clean = DOMPurify.sanitize(code, {
        USE_PROFILES: { svg: true, svgFilters: true },
        ADD_TAGS: ["use"],
        ADD_ATTR: ["xlink:href", "href"],
      });

      // Validate it's actually SVG
      if (!clean.includes("<svg") && !clean.includes("<SVG")) {
        setError("Invalid SVG content");
        return;
      }

      setSanitizedSvg(clean);
      setError(null);
    } catch (e) {
      setError("Failed to parse SVG");
      console.error("SVG parsing error:", e);
    }
  }, [code]);

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <AlertTriangle className="w-4 h-4" />
        {error}
      </div>
    );
  }

  return (
    <div
      className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-[var(--border)] overflow-auto max-h-96"
      dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
    />
  );
}

// Mermaid Preview Component
function MermaidPreview({ code }: { code: string }) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const uniqueId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    const renderMermaid = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Dynamic import to avoid SSR issues
        const mermaid = (await import("mermaid")).default;

        // Initialize mermaid with secure settings
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "default",
          fontFamily: "inherit",
        });

        // Generate unique ID for this diagram
        const id = `mermaid-${uniqueId.replace(/:/g, "-")}`;

        // Render the diagram
        const { svg: renderedSvg } = await mermaid.render(id, code);

        if (isMounted) {
          setSvg(renderedSvg);
          setIsLoading(false);
        }
      } catch (e) {
        console.error("Mermaid rendering error:", e);
        if (isMounted) {
          setError(e instanceof Error ? e.message : "Failed to render diagram");
          setIsLoading(false);
        }
      }
    };

    renderMermaid();

    return () => {
      isMounted = false;
    };
  }, [code, uniqueId]);

  if (isLoading) {
    return (
      <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-[var(--border)] text-center text-[var(--muted-foreground)]">
        Rendering diagram...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <AlertTriangle className="w-4 h-4" />
        <span>Diagram error: {error}</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-[var(--border)] overflow-auto max-h-[500px]"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// HTML Preview Component (sandboxed iframe)
function HTMLPreview({ code }: { code: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(200);

  useEffect(() => {
    if (!iframeRef.current) return;

    // Create a complete HTML document
    const htmlDoc = code.includes("<!DOCTYPE") || code.includes("<html")
      ? code
      : `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 16px;
      background: white;
      color: #333;
    }
  </style>
</head>
<body>
${code}
</body>
</html>`;

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;

    if (doc) {
      doc.open();
      doc.write(htmlDoc);
      doc.close();

      // Adjust height based on content
      setTimeout(() => {
        const body = doc.body;
        if (body) {
          const newHeight = Math.min(500, Math.max(100, body.scrollHeight + 32));
          setHeight(newHeight);
        }
      }, 100);
    }
  }, [code]);

  return (
    <iframe
      ref={iframeRef}
      sandbox="allow-scripts"
      className="w-full rounded-lg border border-[var(--border)] bg-white"
      style={{ height: `${height}px` }}
      title="HTML Preview"
    />
  );
}

// Main Code Preview Component
export function CodePreview({
  code,
  language,
  showPreviewLabel,
  showCodeLabel,
}: CodePreviewProps) {
  const [showPreview, setShowPreview] = useState(true);
  const lang = language.toLowerCase();

  const renderPreview = () => {
    switch (lang) {
      case "svg":
        return <SVGPreview code={code} />;
      case "mermaid":
        return <MermaidPreview code={code} />;
      case "html":
        return <HTMLPreview code={code} />;
      default:
        return null;
    }
  };

  return (
    <div className="my-4">
      {/* Toggle button */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md bg-[var(--muted)] hover:bg-[var(--muted)]/80 transition-colors"
        >
          {showPreview ? (
            <>
              <Code className="w-3.5 h-3.5" />
              {showCodeLabel}
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5" />
              {showPreviewLabel}
            </>
          )}
        </button>
        <span className="text-xs text-[var(--muted-foreground)] uppercase">
          {lang}
        </span>
      </div>

      {/* Preview or code will be shown based on state */}
      {showPreview && renderPreview()}
    </div>
  );
}
