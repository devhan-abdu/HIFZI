import React from "react";
import { View, Text, StyleSheet } from "react-native";

// ─────────────────────────────────────────────
// PARSER
// ─────────────────────────────────────────────

type Block =
  | { type: "intro"; text: string }
  | { type: "numbered"; num: string; title: string; body: InlineSpan[] }
  | { type: "bullet"; body: InlineSpan[] }
  | { type: "section_title"; text: string }
  | { type: "ayah"; arabic?: string; translation: string; ref?: string }
  | { type: "paragraph"; spans: InlineSpan[] };

type InlineSpan = { bold?: boolean; text: string };

function parseInline(raw: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(raw)) !== null) {
    if (m.index > last) spans.push({ text: raw.slice(last, m.index) });
    spans.push({ bold: true, text: m[1] });
    last = regex.lastIndex;
  }
  if (last < raw.length) spans.push({ text: raw.slice(last) });
  return spans.filter((s) => s.text.length > 0);
}

function parseResponse(raw: string): Block[] {
  const blocks: Block[] = [];
  const lines = raw.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) { i++; continue; }

    // ── Arabic line (contains Arabic characters) ──
    const hasArabic = /[\u0600-\u06FF]/.test(line);
    if (hasArabic) {
      // Look ahead for translation + ref
      let translation = "";
      let ref = "";
      if (i + 1 < lines.length) {
        const next = lines[i + 1].trim();
        const refMatch = next.match(/^[""](.+)[""](\s*[\[(]([^\])\n]+)[\])])?$/);
        if (refMatch) {
          translation = refMatch[1];
          ref = refMatch[3] ?? "";
          i += 2;
        } else if (next && !/[\u0600-\u06FF]/.test(next)) {
          translation = next.replace(/^[""]|[""]$/g, "");
          i += 2;
        } else {
          i++;
        }
      } else {
        i++;
      }
      blocks.push({ type: "ayah", arabic: line, translation, ref });
      continue;
    }

    // ── Quote block "..." (Surah X:Y) ──
    const quoteMatch = line.match(/^[""](.+?)[""][\s,]*(?:[\[(]([^\])\n]+)[\])])?$/);
    if (quoteMatch) {
      blocks.push({
        type: "ayah",
        translation: quoteMatch[1],
        ref: quoteMatch[2] ?? "",
      });
      i++; continue;
    }

    // ── Numbered item: "1. **Title:** body" OR "1. **Title**" ──
    const numMatch = line.match(/^(\d+)\.\s+\*\*(.+?)\*\*:?\s*(.*)/);
    if (numMatch) {
      let bodyRaw = numMatch[3] ?? "";
      i++;
      // Collect continuation lines
      while (
        i < lines.length &&
        lines[i].trim() &&
        !lines[i].trim().match(/^\d+\./) &&
        !lines[i].trim().match(/^[-•*]/) &&
        !lines[i].trim().match(/^\*\*[^*]+\*\*:?\s*$/)
      ) {
        bodyRaw += " " + lines[i].trim();
        i++;
      }
      blocks.push({
        type: "numbered",
        num: numMatch[1],
        title: numMatch[2],
        body: parseInline(bodyRaw.trim()),
      });
      continue;
    }

    // ── Section heading: "**Title**" alone ──
    const headingMatch = line.match(/^\*\*([^*]+)\*\*:?\s*$/);
    if (headingMatch) {
      blocks.push({ type: "section_title", text: headingMatch[1] });
      i++; continue;
    }

    // ── Bullet: "- text" or "• text" ──
    const bulletMatch = line.match(/^[-•*]\s+(.+)/);
    if (bulletMatch) {
      blocks.push({ type: "bullet", body: parseInline(bulletMatch[1]) });
      i++; continue;
    }

    // ── Intro (first paragraph heuristic) ──
    if (blocks.length === 0) {
      blocks.push({ type: "intro", text: line.replace(/\*\*(.+?)\*\*/g, "$1") });
      i++; continue;
    }

    // ── Fallback: paragraph ──
    blocks.push({ type: "paragraph", spans: parseInline(line) });
    i++;
  }

  return blocks;
}

// ─────────────────────────────────────────────
// INLINE TEXT RENDERER
// ─────────────────────────────────────────────

function InlineText({ spans, style }: { spans: InlineSpan[]; style?: any }) {
  return (
    <Text style={style}>
      {spans.map((span, i) =>
        span.bold ? (
          <Text key={i} style={styles.bold}>{span.text}</Text>
        ) : (
          <Text key={i}>{span.text}</Text>
        )
      )}
    </Text>
  );
}

// ─────────────────────────────────────────────
// BLOCK RENDERERS
// ─────────────────────────────────────────────

function IntroBlock({ text }: { text: string }) {
  return <Text style={styles.intro}>{text}</Text>;
}

function SectionTitleBlock({ text }: { text: string }) {
  return (
    <View style={styles.sectionRow}>
      <View style={styles.sectionBar} />
      <Text style={styles.sectionTitle}>{text}</Text>
    </View>
  );
}

function NumberedBlock({
  num,
  title,
  body,
}: {
  num: string;
  title: string;
  body: InlineSpan[];
}) {
  return (
    <View style={styles.numberedRow}>
      <View style={styles.numBadge}>
        <Text style={styles.numText}>{num}</Text>
      </View>
      <View style={styles.numberedContent}>
        <Text style={styles.numberedTitle}>{title}</Text>
        {body.length > 0 && (
          <InlineText spans={body} style={styles.numberedBody} />
        )}
      </View>
    </View>
  );
}

function BulletBlock({ body }: { body: InlineSpan[] }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <InlineText spans={body} style={styles.bulletBody} />
    </View>
  );
}

function AyahBlock({
  arabic,
  translation,
  ref,
}: {
  arabic?: string;
  translation: string;
  ref?: string;
}) {
  return (
    <View style={styles.ayahBlock}>
      <View style={styles.ayahAccent} />
      <View style={styles.ayahInner}>
        {arabic ? (
          <Text style={styles.ayahArabic}>{arabic}</Text>
        ) : null}
        {translation ? (
          <Text style={styles.ayahTranslation}>"{translation}"</Text>
        ) : null}
        {ref ? <Text style={styles.ayahRef}>{ref}</Text> : null}
      </View>
    </View>
  );
}

function ParagraphBlock({ spans }: { spans: InlineSpan[] }) {
  return <InlineText spans={spans} style={styles.paragraph} />;
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export function FormattedMessage({ text }: { text: string }) {
  const blocks = parseResponse(text);

  return (
    <View style={styles.container}>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "intro":
            return <IntroBlock key={i} text={block.text} />;
          case "section_title":
            return <SectionTitleBlock key={i} text={block.text} />;
          case "numbered":
            return (
              <NumberedBlock
                key={i}
                num={block.num}
                title={block.title}
                body={block.body}
              />
            );
          case "bullet":
            return <BulletBlock key={i} body={block.body} />;
          case "ayah":
            return (
              <AyahBlock
                key={i}
                arabic={block.arabic}
                translation={block.translation}
                ref={block.ref}
              />
            );
          case "paragraph":
            return <ParagraphBlock key={i} spans={block.spans} />;
          default:
            return null;
        }
      })}
    </View>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────

const GREEN = "#065f46";
const GREEN_LIGHT = "#ecfdf5";
const GREEN_MID = "#6ee7b7";

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },

  intro: {
    fontSize: 14,
    lineHeight: 22,
    color: "#1e293b",
  },

  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 2,
    gap: 8,
  },
  sectionBar: {
    width: 3,
    height: 16,
    borderRadius: 2,
    backgroundColor: GREEN,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: GREEN,
    letterSpacing: 0.2,
    flex: 1,
  },

  numberedRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  numBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: GREEN_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  numText: {
    fontSize: 12,
    fontWeight: "600",
    color: GREEN,
  },
  numberedContent: {
    flex: 1,
    gap: 3,
  },
  numberedTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
    lineHeight: 20,
  },
  numberedBody: {
    fontSize: 13,
    lineHeight: 20,
    color: "#475569",
  },

  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingLeft: 4,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GREEN_MID,
    marginTop: 8,
    flexShrink: 0,
  },
  bulletBody: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: "#475569",
  },

  // Ayah quote
  ayahBlock: {
    flexDirection: "row",
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    overflow: "hidden",
    marginVertical: 2,
  },
  ayahAccent: {
    width: 3,
    backgroundColor: GREEN,
    borderRadius: 2,
    flexShrink: 0,
  },
  ayahInner: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  ayahArabic: {
    fontSize: 17,
    lineHeight: 28,
    color: GREEN,
    textAlign: "right",
    fontFamily: "System",
  },
  ayahTranslation: {
    fontSize: 13,
    lineHeight: 20,
    color: "#064e3b",
    fontStyle: "italic",
  },
  ayahRef: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "500",
    letterSpacing: 0.3,
  },

  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: "#1e293b",
  },

  bold: {
    fontWeight: "600",
    color: "#0f172a",
  },
});