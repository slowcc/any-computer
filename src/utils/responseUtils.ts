export const extractTag = (text: string, tag: string) => {
  const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, "s");
  const match = text.match(regex);
  return match ? match[1].trim() : null;
};

export const removeTag = (text: string, tag: string) => {
  const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, "s");
  return text.replace(regex, "").trim();
}

export const extractCodeBlock = (text: string, lang: string) => {
  const codeBlockRegex = new RegExp(
    `\`\`\`${lang}\\s*([\\s\\S]*?)\\s*\`\`\``,
    "m",
  );
  const codeBlockMatch = text.match(codeBlockRegex);
  return codeBlockMatch ? codeBlockMatch[1].trim() : null;
};
