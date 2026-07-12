import React from "react";
import { View } from "react-native";
import { Text } from "../common/ui/Text";


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
    if (!line) {
      i++;
      continue;
    }

    const hasArabic = /[\u0600-\u06FF]/.test(line);
    if (hasArabic) {
      let translation = "";
      let ref = "";
      if (i + 1 < lines.length) {
        const next = lines[i + 1].trim();
        const refMatch = next.match(
          /^[""](.+)[""](\s*[\[(]([^\])\n]+)[\])])?$/,
        );
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

    const quoteMatch = line.match(
      /^[""](.+?)[""][\s,]*(?:[\[(]([^\])\n]+)[\])])?$/,
    );
    if (quoteMatch) {
      blocks.push({
        type: "ayah",
        translation: quoteMatch[1],
        ref: quoteMatch[2] ?? "",
      });
      i++;
      continue;
    }

    const numMatch = line.match(/^(\d+)\.\s+\*\*(.+?)\*\*:?\s*(.*)/);
    if (numMatch) {
      let bodyRaw = numMatch[3] ?? "";
      i++;
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

    const headingMatch = line.match(/^\*\*([^*]+)\*\*:?\s*$/);
    if (headingMatch) {
      blocks.push({ type: "section_title", text: headingMatch[1] });
      i++;
      continue;
    }

    const bulletMatch = line.match(/^[-•*]\s+(.+)/);
    if (bulletMatch) {
      blocks.push({ type: "bullet", body: parseInline(bulletMatch[1]) });
      i++;
      continue;
    }

    if (blocks.length === 0) {
      blocks.push({
        type: "intro",
        text: line.replace(/\*\*(.+?)\*\*/g, "$1"),
      });
      i++;
      continue;
    }

    blocks.push({ type: "paragraph", spans: parseInline(line) });
    i++;
  }
  return blocks;
}


function InlineText({
  spans,
  className,
}: {
  spans: InlineSpan[];
  className?: string;
}) {
  return (
    <Text className={className}>
      {spans.map((span, i) =>
        span.bold ?
          <Text key={i} className=" text-[--text]">
            {span.text}
          </Text>
        : <Text key={i}>{span.text}</Text>,
      )}
    </Text>
  );
}


function IntroBlock({ text }: { text: string }) {
  return <Text className="text-sm leading-relaxed text-[--text]">{text}</Text>;
}

function SectionTitleBlock({ text }: { text: string }) {
  return (
    <View className="flex-row items-center mt-1 mb-0.5 gap-2">
      <View className="w-[3px] h-4 rounded-sm bg-[--primary]" />
      <Text className="text-[13px] font-semibold tracking-wide text-[--primary] flex-1">
        {text}
      </Text>
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
    <View className="flex-row items-start gap-2.5">
      {/* 10% opacity of primary for badge background */}
      <View className="w-6 h-6 rounded-full bg-[--primary]/10 items-center justify-center mt-0.5 shrink-0">
        <Text className="text-xs font-semibold text-[--primary]">{num}</Text>
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-sm font-semibold text-[--text] leading-5">
          {title}
        </Text>
        {body.length > 0 && (
          <InlineText
            spans={body}
            className="text-[13px] leading-5 text-[--muted]"
          />
        )}
      </View>
    </View>
  );
}

function BulletBlock({ body }: { body: InlineSpan[] }) {
  return (
    <View className="flex-row items-start gap-2.5 pl-1">
      {/* 40% opacity of primary for subtle bullet dot */}
      <View className="w-1.5 h-1.5 rounded-full bg-[--primary]/40 mt-2 shrink-0" />
      <InlineText
        spans={body}
        className="flex-1 text-[13px] leading-5 text-[--muted]"
      />
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
    <View className="flex-row bg-[--surface] border border-[--border] rounded-xl overflow-hidden my-0.5">
      <View className="w-[3px] bg-[--primary] shrink-0" />
      <View className="flex-1 px-3 py-2.5 gap-1">
        {arabic && (
          <Text className="text-lg leading-7 text-[--primary] text-right">
            {arabic}
          </Text>
        )}
        {translation && (
          <Text className="text-[13px] leading-5 text-[--text] italic opacity-90">
            "{translation}"
          </Text>
        )}
        {ref && (
          <Text className="text-[11px] text-[--muted] font-medium tracking-wider mt-0.5">
            {ref}
          </Text>
        )}
      </View>
    </View>
  );
}

function ParagraphBlock({ spans }: { spans: InlineSpan[] }) {
  return (
    <InlineText
      spans={spans}
      className="text-sm leading-relaxed text-[--text]"
    />
  );
}

export function FormattedMessage({ text }: { text: string }) {
  const blocks = parseResponse(text);

  return (
    <View className="gap-2.5">
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
